import json
import logging
import os
from datetime import datetime
from pathlib import Path

import pandas as pd
from cryptography.fernet import Fernet

from src.core.logging import request_id_contextvar
from src.ml_platform.drift import DriftDetector

logger = logging.getLogger(__name__)

_ROOT = Path(__file__).resolve().parents[2]
LOG_DIR = _ROOT / "logs"
AUDIT_FILE = LOG_DIR / "audit_trail.jsonl"
DATA_PATH = _ROOT / "data" / "raw" / "oral_cancer_top30.csv"

# Features numéricas para detecção de Drift (Oral Cancer Dataset)
NUMERIC_FEATURES = ["Age", "Survival_Rate"]

_fernet_instance = None


def get_fernet() -> Fernet:
    global _fernet_instance
    if _fernet_instance is None:
        key = os.getenv("AUDIT_ENCRYPTION_KEY")
        if not key:
            raise RuntimeError(
                "Missing required environment variable: AUDIT_ENCRYPTION_KEY"
            )
        try:
            _fernet_instance = Fernet(key.encode())
        except Exception as e:
            raise RuntimeError(f"Invalid AUDIT_ENCRYPTION_KEY: {e}")
    return _fernet_instance


def encrypt_entry(entry: dict) -> bytes:
    """Criptografa uma entrada de log e envolve com envelope de metadados."""
    fernet = get_fernet()
    json_str = json.dumps(entry)
    encrypted_bytes = fernet.encrypt(json_str.encode("utf-8"))

    envelope = {
        "key_version": "v1",
        "algorithm": "fernet",
        "encrypted": True,
        "payload": encrypted_bytes.decode("utf-8"),
    }
    return json.dumps(envelope).encode("utf-8")


def decrypt_entry(token: bytes) -> dict:
    """Descriptografa uma entrada envelopada ou retorna plaintext histórico."""
    try:
        data = json.loads(token.decode("utf-8") if isinstance(token, bytes) else token)
    except Exception:
        raise ValueError("Invalid JSON format for log entry")

    if isinstance(data, dict) and data.get("encrypted") is True:
        payload = data.get("payload")
        if not payload:
            raise ValueError("Envelope missing payload field")
        fernet = get_fernet()
        decrypted_bytes = fernet.decrypt(payload.encode("utf-8"))
        return json.loads(decrypted_bytes.decode("utf-8"))
    else:
        return data


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

        encrypted_bytes = encrypt_entry(entry)
        with open(AUDIT_FILE, "ab") as f:
            f.write(encrypted_bytes + b"\n")
    except Exception as e:
        logger.error("Falha ao gravar log de auditoria: %s", e)


def calculate_drift() -> dict:
    """Calcula desvios estatísticos rigorosos usando KS-Test (MLOps v2.1)."""
    if not AUDIT_FILE.exists():
        return {"status": "insufficient_data", "metrics": {}}

    try:
        # Lê e descriptografa as predições
        decrypted_entries = []
        with open(AUDIT_FILE, "rb") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    decrypted_entries.append(decrypt_entry(line))
                except Exception as dec_err:
                    logger.error(
                        "Erro ao decriptar entrada do log de auditoria no drift: %s",
                        dec_err,
                    )
                    continue

        if not decrypted_entries:
            return {"status": "insufficient_data", "metrics": {}}

        df = pd.DataFrame(decrypted_entries)
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
