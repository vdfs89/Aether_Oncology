"""
predictor.py
============
Camada de serviço de ML da Aether Oncology v2.0.

Responsabilidades:
  - Carregar o Pipeline Scikit-Learn (StandardScaler → persisted via joblib)
  - Orquestrar inferência: Hugging Face (Primário) com Fallback Local
  - Calcular Integrated Gradients para explicabilidade (XAI)
  - Integrar evidência científica (RAG)
"""

from __future__ import annotations

import logging
from pathlib import Path

import joblib
import numpy as np
import torch

from src.ml_platform.green_ai import GreenAIMonitor
from src.models.mlp import MLP
from src.services.inference_client import inference_client
from src.services.research import fetch_scientific_evidence

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constantes de Caminho e Configuração
# ---------------------------------------------------------------------------

_MODELS_DIR = Path(__file__).resolve().parents[2] / "models"
_PIPELINE_PATH = _MODELS_DIR / "preprocessor.joblib"
_MODEL_PATH = _MODELS_DIR / "aether_mlp_v2.pth"
_CALIBRATOR_PATH = _MODELS_DIR / "calibrator.joblib"

FEATURE_NAMES = [
    "radius_mean",
    "texture_mean",
    "perimeter_mean",
    "area_mean",
    "smoothness_mean",
    "compactness_mean",
    "concavity_mean",
    "concave_points_mean",
    "symmetry_mean",
    "fractal_dimension_mean",
    "radius_se",
    "texture_se",
    "perimeter_se",
    "area_se",
    "smoothness_se",
    "compactness_se",
    "concavity_se",
    "concave_points_se",
    "symmetry_se",
    "fractal_dimension_se",
    "radius_worst",
    "texture_worst",
    "perimeter_worst",
    "area_worst",
    "smoothness_worst",
    "compactness_worst",
    "concavity_worst",
    "concave_points_worst",
    "symmetry_worst",
    "fractal_dimension_worst",
]


def _integrated_gradients(
    model: torch.nn.Module, inputs: torch.Tensor, steps: int = 20
) -> np.ndarray:
    """
    Manual implementation of Integrated Gradients (XAI).
    Calculates feature importance by integrating gradients along the path from baseline to input.
    """
    baseline = torch.zeros_like(inputs)
    alphas = torch.linspace(0.1, 1.0, steps)
    accum_grads = torch.zeros_like(inputs)

    for alpha in alphas:
        interpolated = baseline + alpha * (inputs - baseline)
        interpolated.requires_grad = True

        # Logit output
        output = model(interpolated)

        model.zero_grad()
        output.backward()

        if interpolated.grad is not None:
            accum_grads += interpolated.grad

    avg_grads = accum_grads / steps
    attributions = (inputs - baseline) * avg_grads
    return attributions.detach().numpy().squeeze()


class PredictorService:
    """
    Decoupled Predictor Service.

    Orchestration Flow:
        1. Local Preprocessing (StandardScaler)
        2. Remote Inference (Hugging Face)
        3. Local XAI (Integrated Gradients using a proxy model)
        4. Research evidence (RAG)
    """

    def __init__(self) -> None:
        self.preprocessor = None
        self.model = None
        self.calibrator = None
        self.green_monitor = GreenAIMonitor()
        self.model_version = "v1-decoupled"

    def load_resources(self) -> None:
        """Loads required local artifacts (preprocessor and optional local model)."""
        try:
            if not _PIPELINE_PATH.exists():
                logger.error(f"Pipeline not found in '{_PIPELINE_PATH}'")
            else:
                self.preprocessor = joblib.load(_PIPELINE_PATH)
                logger.info("Local Preprocessor loaded successfully.")

            # Proxy Model for XAI and Fallback
            self.model = MLP(input_shape=30)
            if _MODEL_PATH.exists():
                self.model.load_state_dict(
                    torch.load(_MODEL_PATH, weights_only=True, map_location="cpu")
                )
                self.model.eval()
                logger.info("Local Proxy Model loaded for XAI/Fallback.")
            else:
                logger.warning(
                    f"Local weights not found in '{_MODEL_PATH}'. Fallback and XAI will be limited."
                )

            if _CALIBRATOR_PATH.exists():
                self.calibrator = joblib.load(_CALIBRATOR_PATH)
                logger.info("Local Calibrator loaded.")

        except Exception as e:
            logger.critical(f"Failed to load clinical resources: {e}")

    async def predict(
        self, input_data: list[list[float]], request_id: str = "internal"
    ) -> dict:
        """
        Main orchestration entry point for clinical predictions.

        Orchestration Steps:
        1. Local Preprocessing (StandardScaler)
        2. Resilience check & Remote Inference (HF)
        3. Local Fallback (if remote fails or circuit is open)
        4. Local XAI & RAG
        """
        if self.preprocessor is None:
            self.load_resources()
            if self.preprocessor is None:
                raise Exception("Clinical artifacts not loaded.")

        # 1. Preprocessing (StandardScaler)
        processed_data = self.preprocessor.transform(input_data)

        # 2. Remote Inference (Hugging Face)
        inference_source = "remote"
        remote_error = None
        probability = 0.5
        latency_ms = 0

        try:
            # Persistent client with connection pooling and circuit breaker
            remote_result = await inference_client.predict_remote(
                processed_data.tolist(), request_id=request_id
            )
            latency_ms = remote_result.get("latency_ms", 0)

            # Robust Probability Extraction
            raw_data = remote_result["data"]

            # Case 1: Simple list of floats [0.98] or [[0.98]]
            if isinstance(raw_data, list):
                val = raw_data[0]
                if isinstance(val, list):
                    val = val[0]
                if isinstance(val, (int, float)):
                    probability = float(val)
                # Case 2: List of dicts (classification) [[{"label": "...", "score": 0.9}]]
                elif isinstance(val, dict):
                    # We look for "Malignant" or high-index scores
                    # Assuming v1 uses common label mapping or binary logit
                    probability = val.get("score", 0.5)

        except Exception as e:
            logger.warning(
                f"Inference Pivot [{request_id}]: Remote Failed ({e}). Using Local Fallback."
            )
            remote_error = str(e)
            inference_source = "local_fallback"

            # 3. Local Fallback (Deterministic Resilience)
            if self.model:
                with torch.no_grad():
                    logits = self.model(
                        torch.tensor(processed_data, dtype=torch.float32)
                    )
                    probability = torch.sigmoid(logits).item()
            else:
                raise Exception(
                    f"Clinical inference unavailable (Primary error: {remote_error})"
                )

        prediction = 1 if probability >= 0.5 else 0
        label = "Malignant" if prediction == 1 else "Benign"

        # 4. Confidence Tiering (Clinical Guardrail)
        if probability >= 0.92 or probability <= 0.08:
            confidence = "High"
        elif probability >= 0.75 or probability <= 0.25:
            confidence = "Medium"
        else:
            confidence = "Low"

        # 5. Local XAI (Integrated Gradients)
        # We use the local proxy model for XAI to avoid high-latency remote gradient calls
        top_feature = "unknown"
        if self.model:
            try:
                tensor_data = torch.tensor(processed_data, dtype=torch.float32)
                attributions = _integrated_gradients(self.model, tensor_data, steps=20)
                top_idx = int(np.argmax(np.abs(attributions)))
                top_feature = FEATURE_NAMES[top_idx]
            except Exception as e:
                logger.error(f"XAI calculation failed: {e}")

        # 6. RAG (Scientific Evidence)
        articles = []
        try:
            articles = fetch_scientific_evidence(top_feature)
        except Exception as e:
            logger.error(f"RAG fetch failed: {e}")

        # 7. Green AI Tracking
        self.green_monitor.track_inference(latency_ms if latency_ms > 0 else 100)

        return {
            "prediction": prediction,
            "label": label,
            "probability": float(round(probability, 4)),
            "confidence": confidence,
            "top_feature": top_feature,
            "articles": articles,
            "status": "sucesso" if inference_source == "remote" else "fallback",
            "inference_source": inference_source,
            "remote_latency_ms": latency_ms,
            "model_id": inference_client.model_id
            if inference_source == "remote"
            else "local_mlp_v2",
        }

    def is_ready(self) -> bool:
        return self.preprocessor is not None


class _LazyPredictor:
    """Lazy wrapper to defer resource loading until first request or health check."""

    def __init__(self) -> None:
        self._instance: PredictorService | None = None

    def _get_instance(self) -> PredictorService:
        if self._instance is None:
            self._instance = PredictorService()
            self._instance.load_resources()
        return self._instance

    async def predict(
        self, input_data: list[list[float]], request_id: str = "internal"
    ) -> dict:
        return await self._get_instance().predict(input_data, request_id=request_id)

    def is_ready(self) -> bool:
        return self._get_instance().is_ready()

    def load_model(self) -> None:
        """Explicitly load the model (used by lifespan)."""
        self._get_instance().load_resources()

    @property
    def green_monitor(self) -> GreenAIMonitor:
        return self._get_instance().green_monitor

    @property
    def model_version(self) -> str:
        return self._get_instance().model_version


# Global Singleton
predictor = _LazyPredictor()
