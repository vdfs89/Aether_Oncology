import json
import logging
from datetime import datetime
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)

_ROOT = Path(__file__).resolve().parents[2]
LOG_DIR = _ROOT / "logs"
AUDIT_FILE = LOG_DIR / "audit_trail.jsonl"
DATA_PATH = _ROOT / "data" / "raw" / "data.csv"

# Médias de treino para detecção de Drift (WDBC Dataset)
TRAINING_MEANS = {
    "radius_mean": 14.127,
    "texture_mean": 19.289,
    "perimeter_mean": 91.969,
    "area_mean": 654.889,
    "smoothness_mean": 0.096,
    "compactness_mean": 0.104,
    "concavity_mean": 0.088,
    "concave_points_mean": 0.048,
}


def log_prediction(features: dict, prediction_result: dict):
    """Regista a predição para auditoria e governança (Aula 7)."""
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)

        # Simplifica o log para auditoria
        entry = {
            "timestamp": datetime.now().isoformat(),
            "input": features,
            "output": {
                "prediction": prediction_result.get("prediction"),
                "label": prediction_result.get("label"),
                "probability": prediction_result.get("probability"),
                "top_feature": prediction_result.get("top_feature"),
            },
        }

        with open(AUDIT_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception as e:
        logger.error("Falha ao gravar log de auditoria: %s", e)


def calculate_drift() -> dict:
    """Calcula desvios básicos para monitoramento de Data Drift (Aula 5)."""
    if not AUDIT_FILE.exists():
        return {"status": "insufficient_data", "metrics": {}}

    try:
        # Lê as últimas 100 predições
        df = pd.read_json(AUDIT_FILE, lines=True)
        if len(df) < 5:
            return {"status": "collecting", "count": len(df)}

        # Extrai os inputs do campo 'input'
        inputs_df = pd.json_normalize(df["input"])

        drift_metrics = {}
        alerts = []

        for feature, train_mean in TRAINING_MEANS.items():
            if feature in inputs_df.columns:
                current_mean = inputs_df[feature].tail(50).mean()
                deviation = abs(current_mean - train_mean) / train_mean
                drift_metrics[feature] = {
                    "current": round(current_mean, 4),
                    "training": train_mean,
                    "deviation_pct": round(deviation * 100, 2),
                }

                if deviation > 0.30:  # 30% de desvio dispara alerta
                    alerts.append(f"Drift detectado em {feature}: {deviation:.1%}")

        return {
            "status": "alert" if alerts else "stable",
            "alerts": alerts,
            "metrics": drift_metrics,
            "total_audited": len(df),
        }
    except Exception as e:
        logger.error("Erro no cálculo de drift: %s", e)
        return {"status": "error", "message": str(e)}
