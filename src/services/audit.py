import json
import logging
import os
import threading
from datetime import datetime
from pathlib import Path

import pandas as pd
from cryptography.fernet import Fernet

from src.core.logging import request_id_contextvar
from src.ml_platform.drift import DriftDetector
from src.services import audit_chain, audit_rotation

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


def build_envelope(entry: dict) -> dict:
    """Criptografa a entrada e monta o envelope de metadados (sem selo de cadeia)."""
    fernet = get_fernet()
    json_str = json.dumps(entry)
    encrypted_bytes = fernet.encrypt(json_str.encode("utf-8"))

    return {
        "key_version": "v1",
        "algorithm": "fernet",
        "encrypted": True,
        "payload": encrypted_bytes.decode("utf-8"),
    }


def encrypt_entry(entry: dict) -> bytes:
    """Envelope criptografado (sem cadeia). Prefira `seal_and_append`."""
    return json.dumps(build_envelope(entry)).encode("utf-8")


# In-process chain head per audit file: {path: (last_seq, last_entry_hash)}.
# Lazily recovered from disk on first write, then advanced in memory. Append is
# single-writer (the running service), so this stays consistent; verify_chain
# always re-reads from disk independently.
_chain_lock = threading.Lock()
_chain_heads: dict[str, tuple[int, str]] = {}

# Rotation policy + archival destination, resolved once from the environment.
# `seq` is global/monotonic across segments, so rotation never breaks the chain.
_rotation_policy = audit_rotation.RotationPolicy.from_env()
_archiver = audit_rotation.LoggingArchiver()


def seal_and_append(
    entry: dict,
    audit_file: Path | None = None,
    *,
    policy: "audit_rotation.RotationPolicy | None" = None,
) -> dict:
    """
    Encrypt, hash-chain (tamper-evidence) and append one entry to the audit
    trail. Returns the sealed envelope (incl. seq / prev_hash / entry_hash).

    The chain makes the append-only log *tamper-evident*: editing, reordering or
    deleting any sealed line breaks verification (see `audit_chain.verify_chain`).

    Before appending, the live file is rotated if it exceeds the size/age cap.
    Rotation preserves custody: the new segment opens with a header signing the
    rotated segment's closing head, and `seq` carries over (see audit_rotation).
    """
    target = audit_file or AUDIT_FILE
    pol = policy or _rotation_policy
    envelope = build_envelope(entry)
    with _chain_lock:
        key = str(target)
        if key not in _chain_heads:
            _chain_heads[key] = audit_chain.read_chain_head(target)
        seq, prev = _chain_heads[key]

        # Rotate first (carrying the current head into the new segment header).
        if pol is not None and audit_rotation.should_rotate(target, pol):
            audit_rotation.rotate(
                target,
                head_seq=seq,
                head_hash=prev,
                policy=pol,
                archiver=_archiver,
            )
            # Head is unchanged; the new live file now carries it in its header.

        seq += 1
        payload = envelope["payload"]
        entry_hash = audit_chain.compute_entry_hash(prev, seq, payload)
        envelope["seq"] = seq
        envelope["prev_hash"] = prev
        envelope["entry_hash"] = entry_hash

        target.parent.mkdir(parents=True, exist_ok=True)
        with open(target, "ab") as f:
            f.write(json.dumps(envelope).encode("utf-8") + b"\n")
            f.flush()
            os.fsync(f.fileno())

        _chain_heads[key] = (seq, entry_hash)
    return envelope


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

        seal_and_append(entry)
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
                    decoded = decrypt_entry(line)
                except Exception as dec_err:
                    logger.error(
                        "Erro ao decriptar entrada do log de auditoria no drift: %s",
                        dec_err,
                    )
                    continue
                # Skip non-prediction records (segment headers, feedback, …) so
                # rotation metadata never reaches the drift feature matrix.
                if isinstance(decoded, dict) and "input" in decoded:
                    decrypted_entries.append(decoded)

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
