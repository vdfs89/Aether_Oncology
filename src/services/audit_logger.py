import hashlib
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

from src.core.logging import request_id_contextvar
from src.safety.phi_scrubber import get_phi_scrubber
from src.services.audit import encrypt_entry, get_fernet

logger = logging.getLogger(__name__)

_ROOT = Path(__file__).resolve().parents[2]
LOG_DIR = _ROOT / "logs"
AUDIT_FILE = LOG_DIR / "audit_trail.jsonl"


class AuditLogger:
    """
    HIPAA-compliant audit logger for clinical decision support systems.
    Logs events with required metadata, PHI scrubbing, and Fernet encryption.
    """

    def __init__(self, audit_file: Path | None = None, scrub_phi: bool = True):
        self.audit_file = audit_file or AUDIT_FILE
        self.scrub_phi = scrub_phi
        self.scrubber = get_phi_scrubber() if scrub_phi else None
        self.audit_file.parent.mkdir(parents=True, exist_ok=True)

    def _generate_audit_id(self) -> str:
        """Generate deterministic audit event ID."""
        timestamp = datetime.utcnow().isoformat()
        return hashlib.sha256(timestamp.encode()).hexdigest()[:16]

    def _anonymize_user(self, user_id: str | None) -> str:
        """Hash user ID for anonymization (HIPAA - limit user tracking)."""
        if not user_id:
            return "system"
        return hashlib.sha256(user_id.encode()).hexdigest()[:8]

    def log_event(
        self,
        event_type: Literal["prediction", "feedback", "access", "export", "retrain", "auth"],
        action: Literal["READ", "WRITE", "DELETE", "EXPORT", "EXECUTE"],
        resource_affected: str | None = None,
        data: dict[str, Any] | None = None,
        user_id: str | None = None,
        status: Literal["SUCCESS", "FAILURE"] = "SUCCESS",
        error_message: str | None = None,
    ) -> str:
        """
        Log a compliance event with HIPAA-required fields.

        Args:
            event_type: Classification of the event
            action: Action performed (READ, WRITE, etc.)
            resource_affected: Patient ID or resource identifier (will be anonymized)
            data: Event data (will be scrubbed if scrub_phi=True)
            user_id: User/API key identifier
            status: SUCCESS or FAILURE
            error_message: Optional error details

        Returns:
            audit_id (event identifier)
        """
        try:
            LOG_DIR.mkdir(parents=True, exist_ok=True)

            # Scrub PHI if enabled
            phi_scrubbed = False
            scrubbed_data = data or {}
            if self.scrub_phi and data:
                scrubbed_data, detected_phi = self.scrubber.scrub_dict(data)
                phi_scrubbed = bool(detected_phi)

            # Build HIPAA-compliant audit entry
            audit_entry = {
                "audit_id": self._generate_audit_id(),
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "event_type": event_type,
                "action": action,
                "user_id": self._anonymize_user(user_id),
                "request_id": request_id_contextvar.get(),
                "resource_affected": resource_affected if resource_affected else "system",
                "status": status,
                "data": scrubbed_data,
                "phi_scrubbed": phi_scrubbed,
                "encryption_algorithm": "fernet_v1",
            }

            if error_message:
                audit_entry["error_message"] = error_message

            # Encrypt and write
            encrypted_bytes = encrypt_entry(audit_entry)
            with open(self.audit_file, "ab") as f:
                f.write(encrypted_bytes + b"\n")

            logger.info(
                "Audit event logged [%s] event_type=%s action=%s status=%s phi_scrubbed=%s",
                audit_entry["audit_id"],
                event_type,
                action,
                status,
                phi_scrubbed,
            )

            return audit_entry["audit_id"]

        except Exception as e:
            logger.error("Failed to log audit event: %s", e, exc_info=True)
            return "error"

    def log_prediction(
        self,
        request_id: str,
        features: dict[str, Any],
        prediction_result: dict[str, Any],
        user_id: str | None = None,
    ) -> str:
        """Log a prediction event (inference on patient data)."""
        return self.log_event(
            event_type="prediction",
            action="READ",  # Reading patient data to make prediction
            resource_affected="patient_prediction",
            data={
                "input_features": features,
                "output_result": prediction_result,
                "request_id": request_id,
            },
            user_id=user_id,
            status="SUCCESS",
        )

    def log_feedback(
        self,
        request_id: str,
        feedback_data: dict[str, Any],
        user_id: str | None = None,
    ) -> str:
        """Log clinical feedback event (ground truth submission)."""
        return self.log_event(
            event_type="feedback",
            action="WRITE",  # Writing ground truth
            resource_affected="clinical_feedback",
            data={
                "feedback": feedback_data,
                "request_id": request_id,
            },
            user_id=user_id,
            status="SUCCESS",
        )

    def log_access(
        self,
        resource_type: Literal["audit_trail", "analytics", "model_weights", "data_export"],
        action: Literal["READ", "WRITE", "DELETE", "EXPORT"],
        user_id: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> str:
        """Log data access event (e.g., /audit, /analytics endpoints)."""
        return self.log_event(
            event_type="access",
            action=action,
            resource_affected=resource_type,
            data=details or {},
            user_id=user_id,
            status="SUCCESS",
        )

    def log_export(
        self,
        resource_type: str,
        record_count: int,
        user_id: str | None = None,
        export_format: str = "json",
    ) -> str:
        """Log data export event (regulatory reporting, HIPAA compliance)."""
        return self.log_event(
            event_type="export",
            action="EXPORT",
            resource_affected=f"{resource_type}_export",
            data={
                "record_count": record_count,
                "export_format": export_format,
                "timestamp": datetime.utcnow().isoformat(),
            },
            user_id=user_id,
            status="SUCCESS",
        )

    def log_auth(
        self,
        user_id: str | None = None,
        status: Literal["SUCCESS", "FAILURE"] = "SUCCESS",
        error_message: str | None = None,
    ) -> str:
        """Log authentication event (API key validation)."""
        return self.log_event(
            event_type="auth",
            action="READ",
            resource_affected="api_authentication",
            data={"timestamp": datetime.utcnow().isoformat()},
            user_id=user_id,
            status=status,
            error_message=error_message,
        )

    def log_retrain(
        self,
        model_version: str,
        dataset_hash: str,
        user_id: str | None = None,
        status: Literal["SUCCESS", "FAILURE"] = "SUCCESS",
        error_message: str | None = None,
    ) -> str:
        """Log model retraining event."""
        return self.log_event(
            event_type="retrain",
            action="EXECUTE",
            resource_affected="model_training",
            data={
                "model_version": model_version,
                "dataset_hash": dataset_hash,
                "timestamp": datetime.utcnow().isoformat(),
            },
            user_id=user_id,
            status=status,
            error_message=error_message,
        )


# Global singleton instance
_audit_logger_instance = None


def get_audit_logger(scrub_phi: bool = True) -> AuditLogger:
    """Get or create global audit logger instance."""
    global _audit_logger_instance
    if _audit_logger_instance is None:
        _audit_logger_instance = AuditLogger(scrub_phi=scrub_phi)
    return _audit_logger_instance
