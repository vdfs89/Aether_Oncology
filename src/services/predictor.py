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

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Caminhos dos artefactos
# ---------------------------------------------------------------------------

_ROOT = Path(__file__).resolve().parents[2]
_MODEL_PATH = _ROOT / "models" / "aether_mlp_v1.pth"
_PIPELINE_PATH = _ROOT / "models" / "preprocessor.joblib"


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
        state_dict = torch.load(_MODEL_PATH, map_location=self.device, weights_only=True)
        self.model.load_state_dict(state_dict)
        self.model.eval()
        logger.info("Modelo PyTorch carregado e em modo eval: %s", _MODEL_PATH)

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
        tensor_data = torch.tensor(
            processed_data, dtype=torch.float32
        ).to(self.device)

        # 3. Inferência (sem gradientes)
        with torch.no_grad():
            logits = self.model(tensor_data)
            probability: float = torch.sigmoid(logits).squeeze().item()

        prediction = 1 if probability >= 0.5 else 0
        label = "Malignant" if prediction == 1 else "Benign"

        # 4. Tier de confiança (alinhado ao Model Card — Secção 6)
        if probability >= 0.85 or probability <= 0.15:
            confidence = "High"
        elif probability >= 0.65 or probability <= 0.35:
            confidence = "Medium"
        else:
            confidence = "Low"  # dispara revisão manual dupla na camada web

        return {
            "prediction": prediction,
            "label": label,
            "probability": round(probability, 4),
            "confidence": confidence,
            "status": "sucesso",
        }


# ---------------------------------------------------------------------------
# Singleton — instanciado UMA vez quando o módulo é importado pelo uvicorn
# ---------------------------------------------------------------------------

predictor = PredictorService()
