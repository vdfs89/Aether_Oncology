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
DATA_PATH = _ROOT / "data" / "raw" / "oral_cancer_top30.csv"

# Features numéricas para detecção de Drift (Oral Cancer Dataset)
NUMERIC_FEATURES = ["Age", "Survival_Rate"]



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
                "risk_level": prediction_result.get("risk_level"),
                "probability": prediction_result.get("probability"),
                "confidence": prediction_result.get("confidence"),
                "warning": prediction_result.get("warning"),
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
            if feature in NUMERIC_FEATURES:  # Mostra apenas features principais na UI
                # Check for NaN and replace with None or string if necessary, but json handles null for None
                p_val = round(m["p_value"], 4) if pd.notna(m["p_value"]) else 1.0
                ks = round(m["ks_stat"], 4) if pd.notna(m["ks_stat"]) else 0.0
                ui_metrics[feature] = {
                    "p_value": p_val,
                    "ks_stat": ks,
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
