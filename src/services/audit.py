import json
import logging
from datetime import datetime
from pathlib import Path

import pandas as pd

from src.core.logging import request_id_contextvar
from src.ml_platform.drift import DriftDetector

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
            "request_id": request_id_contextvar.get(),
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
    """Calcula desvios estatísticos rigorosos usando KS-Test (MLOps v2.1)."""
    if not AUDIT_FILE.exists():
        return {"status": "insufficient_data", "metrics": {}}

    try:
        # Lê as últimas 100 predições
        df = pd.read_json(AUDIT_FILE, lines=True)
        if len(df) < 10:
            return {"status": "collecting", "count": len(df)}

        # Carrega baseline para comparação
        if not DATA_PATH.exists():
            return {"status": "error", "message": "Baseline data missing"}

        baseline_df = pd.read_csv(DATA_PATH)
        detector = DriftDetector(baseline_df)

        # Prepara dados atuais
        current_df = pd.json_normalize(df["input"]).tail(100)

        # Executa análise rigorosa
        report = detector.check_data_drift(current_df)

        # Adapta report para a UI legível
        ui_metrics = {}
        for feature, m in report["metrics"].items():
            if feature in TRAINING_MEANS:  # Mostra apenas features principais na UI
                ui_metrics[feature] = {
                    "p_value": round(m["p_value"], 4),
                    "ks_stat": round(m["ks_stat"], 4),
                    "drift": m["drift"],
                }

        return {
            "status": "alert" if report["drift_detected"] else "stable",
            "alerts": report["drifted_features"],
            "metrics": ui_metrics,
            "total_audited": len(df),
            "drift_detected": report["drift_detected"],
        }
    except Exception as e:
        logger.error("Erro no cálculo de drift estatístico: %s", e)
        return {"status": "error", "message": str(e)}
