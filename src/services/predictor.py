"""
predictor.py
============
Camada de serviço de ML da Aether Oncology.

Responsabilidades:
  - Carregar o Pipeline Scikit-Learn (StandardScaler → persisted via joblib)
  - Carregar os pesos da TumorMLP (PyTorch .pth)
  - Expor predict() como única interface pública para a camada web

Design decisions:
  - Singleton instanciado no nível do módulo: o modelo é carregado UMA vez
    quando o worker do uvicorn sobe, não em cada requisição.
  - O preprocessor (sklearn Pipeline) é mantido separado dos pesos torch para
    facilitar versionamento independente dos artefactos.
"""

from __future__ import annotations

import logging
from pathlib import Path

import joblib
import torch

# Importa a ÚNICA fonte de verdade da arquitectura — elimina duplicação
# e garante que train.py e predictor.py usem exactamente o mesmo modelo.
from src.models.mlp import MLP
from src.services.research import fetch_scientific_evidence

logger = logging.getLogger(__name__)

FEATURE_NAMES = [
    "radius_mean", "texture_mean", "perimeter_mean", "area_mean", "smoothness_mean",
    "compactness_mean", "concavity_mean", "concave points_mean", "symmetry_mean", "fractal_dimension_mean",
    "radius_se", "texture_se", "perimeter_se", "area_se", "smoothness_se",
    "compactness_se", "concavity_se", "concave points_se", "symmetry_se", "fractal_dimension_se",
    "radius_worst", "texture_worst", "perimeter_worst", "area_worst", "smoothness_worst",
    "compactness_worst", "concavity_worst", "concave points_worst", "symmetry_worst", "fractal_dimension_worst"
]


# ---------------------------------------------------------------------------
# Caminhos dos artefactos
# ---------------------------------------------------------------------------

_ROOT = Path(__file__).resolve().parents[2]
_PIPELINE_PATH = _ROOT / "models" / "preprocessor.joblib"
_CALIBRATOR_PATH = _ROOT / "models" / "calibrator.joblib"
_MODEL_PATH = _ROOT / "models" / "aether_mlp_v1.pth"


# ---------------------------------------------------------------------------
# Serviço de predição
# ---------------------------------------------------------------------------


class PredictorService:
    """
    Serviço singleton que encapsula todo o stack de ML.

    Fluxo de inferência:
        raw_input  →  preprocessor.transform()  →  torch.Tensor
                   →  model.forward()            →  sigmoid probability
                   →  dict  (label + probability + confidence)
    """

    def __init__(self) -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info("PredictorService inicializando no device: %s", self.device)

        # --- Pipeline Scikit-Learn (scaler + eventuais transformações futuras) ---
        if not _PIPELINE_PATH.exists():
            raise FileNotFoundError(
                f"Pipeline não encontrado em '{_PIPELINE_PATH}'. "
                "Execute o script de treino: python src/train.py"
            )
        self.preprocessor = joblib.load(_PIPELINE_PATH)
        logger.info("Pipeline Scikit-Learn carregado: %s", _PIPELINE_PATH)

        # --- Pesos do modelo PyTorch ---
        if not _MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Pesos do modelo não encontrados em '{_MODEL_PATH}'. "
                "Execute o script de treino: python src/train.py"
            )
        # Instanciamos a arquitectura e carregamos apenas o state_dict
        # (mais seguro que torch.load() directo em produção)
        self.model = MLP(input_shape=30).to(self.device)
        state_dict = torch.load(
            _MODEL_PATH, map_location=self.device, weights_only=True
        )
        self.model.load_state_dict(state_dict)
        self.model.eval()
        logger.info("Modelo PyTorch carregado e em modo eval: %s", _MODEL_PATH)

        # --- Calibrador (opcional, gerado no treino) ---
        self.calibrator = None
        if _CALIBRATOR_PATH.exists():
            self.calibrator = joblib.load(_CALIBRATOR_PATH)
            logger.info("Calibrador de probabilidades carregado: %s", _CALIBRATOR_PATH)

    # ------------------------------------------------------------------
    # Interface pública
    # ------------------------------------------------------------------

    def predict(self, input_data: list[list[float]]) -> dict:
        """
        Realiza a inferência para uma ou mais amostras.

        Args:
            input_data: Lista de amostras, cada uma com exatamente 30 features
                        na ordem do dataset WDBC.  Ex.: [[17.99, 10.38, ...]].

        Returns:
            dict com:
              - ``prediction``  : 1 (Maligno) ou 0 (Benigno)
              - ``label``       : 'Malignant' ou 'Benign'
              - ``probability`` : score sigmoid arredondado (0–1)
              - ``confidence``  : 'High' | 'Medium' | 'Low'
              - ``status``      : 'sucesso'
        """
        # 1. Pré-processamento via Pipeline Sklearn
        processed_data = self.preprocessor.transform(input_data)

        # 2. Conversão para tensor PyTorch
        tensor_data = torch.tensor(processed_data, dtype=torch.float32).to(self.device)

        # 3. Inferência (sem gradientes)
        with torch.no_grad():
            logits_tensor = self.model(tensor_data)
            logits_np = logits_tensor.cpu().numpy()

        # 4. Calibração de Probabilidade (Platt Scaling)
        if self.calibrator:
            # O calibrador espera [N, 1] e retorna [N, 2] (probabilidades por classe)
            probability = float(self.calibrator.predict_proba(logits_np)[0, 1])
        else:
            probability = float(torch.sigmoid(logits_tensor).squeeze().item())

        prediction = 1 if probability >= 0.5 else 0
        label = "Malignant" if prediction == 1 else "Benign"

        # 4. Tier de confiança (alinhado ao Model Card — Secção 6)
        if probability >= 0.85 or probability <= 0.15:
            confidence = "High"
        elif probability >= 0.65 or probability <= 0.35:
            confidence = "Medium"
        else:
            confidence = "Low"  # dispara revisão manual dupla na camada web

        # 5. Busca de Evidência Científica (XAI Contextual)
        # Identificamos a feature de maior impacto (simplificado: maior valor normalizado)
        # No futuro, integrar SHAP aqui.
        top_idx = processed_data[0].argmax()
        top_feature = FEATURE_NAMES[top_idx]

        articles = fetch_scientific_evidence(top_feature)

        return {
            "prediction": prediction,
            "label": label,
            "probability": round(probability, 4),
            "confidence": confidence,
            "top_feature": top_feature,
            "articles": articles,
            "status": "sucesso",
        }


# ---------------------------------------------------------------------------
# Singleton com inicialização lazy — evita crash na importação do módulo
# quando os artefactos ainda não existem (ex.: antes do primeiro treino).
# ---------------------------------------------------------------------------


class _LazyPredictor:
    """Proxy que instancia PredictorService apenas na primeira chamada."""

    def __init__(self) -> None:
        self._instance: PredictorService | None = None

    def _get_instance(self) -> PredictorService:
        if self._instance is None:
            self._instance = PredictorService()
        return self._instance

    def predict(self, input_data: list[list[float]]) -> dict:
        return self._get_instance().predict(input_data)

    @property
    def model(self) -> MLP:
        return self._get_instance().model

    @property
    def preprocessor(self) -> object:
        return self._get_instance().preprocessor


predictor = _LazyPredictor()
