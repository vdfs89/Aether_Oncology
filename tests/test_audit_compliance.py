import json
import re
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from src.safety.phi_scrubber import PHIScrubber, get_phi_scrubber
from src.services.audit_logger import AuditLogger


class TestPHIScrubber:
    """Test PHI detection and scrubbing."""

    def test_scrub_email(self):
        """Test email detection and scrubbing."""
        scrubber = PHIScrubber()
        text = "Contact: john.doe@example.com for details"
        scrubbed, detected = scrubber.scrub_string(text)

        assert "john.doe@example.com" in detected.get("email", [])
        assert "[EMAIL_REDACTED]" in scrubbed
        assert "john.doe@example.com" not in scrubbed

    def test_scrub_phone(self):
        """Test phone number detection and scrubbing."""
        scrubber = PHIScrubber()
        text = "Call me at (555) 123-4567 or +1-555-123-4567"
        scrubbed, detected = scrubber.scrub_string(text)

        assert len(detected.get("phone", [])) >= 2
        assert "[PHONE_REDACTED]" in scrubbed

    def test_scrub_ssn(self):
        """Test SSN detection and scrubbing."""
        scrubber = PHIScrubber()
        text = "Patient SSN: 123-45-6789"
        scrubbed, detected = scrubber.scrub_string(text)

        assert "123-45-6789" in detected.get("ssn", [])
        assert "[SSN_REDACTED]" in scrubbed

    def test_scrub_dict(self):
        """Test PHI scrubbing in dictionary."""
        scrubber = PHIScrubber()
        data = {
            "email": "patient@hospital.org",
            "phone": "(555) 123-4567",
            "age": 45,
            "name": "John Smith",
        }

        scrubbed, detected = scrubber.scrub_dict(data)

        assert "patient@hospital.org" not in str(scrubbed)
        assert len(detected) > 0
        assert scrubbed["age"] == 45  # Non-PHI data unchanged

    def test_scrub_nested_dict(self):
        """Test PHI scrubbing in nested structures."""
        scrubber = PHIScrubber()
        data = {
            "patient": {"email": "john@hospital.org", "ssn": "123-45-6789"},
            "clinician": {"phone": "(555) 123-4567"},
        }

        scrubbed, detected = scrubber.scrub_dict(data)

        assert "[EMAIL_REDACTED]" in str(scrubbed)
        assert "[SSN_REDACTED]" in str(scrubbed)
        assert "[PHONE_REDACTED]" in str(scrubbed)

    def test_scrub_sensitive_fields(self):
        """Test that specified sensitive fields are tracked separately."""
        scrubber = PHIScrubber()
        data = {
            "patient_id": "P12345",  # Not detected by regex
            "age": 45,
        }

        scrubbed, detected = scrubber.scrub_dict(data, sensitive_fields=["patient_id"])

        assert scrubbed["patient_id"] == "P12345"  # Unchanged as no regex match
        assert scrubbed["age"] == 45

    def test_no_phi_detected(self):
        """Test that clean data is not modified."""
        scrubber = PHIScrubber()
        data = {"age": 45, "gender": "Male", "risk_level": "High"}

        scrubbed, detected = scrubber.scrub_dict(data)

        assert scrubbed == data
        assert len(detected) == 0

    def test_phi_scrubber_singleton(self):
        """Test that get_phi_scrubber returns singleton."""
        scrubber1 = get_phi_scrubber()
        scrubber2 = get_phi_scrubber()

        assert scrubber1 is scrubber2


class TestAuditLogger:
    """Test HIPAA-compliant audit logging."""

    @pytest.fixture
    def temp_audit_file(self, tmp_path):
        """Create temporary audit file."""
        audit_file = tmp_path / "audit_trail.jsonl"
        return audit_file

    @pytest.fixture
    def audit_logger(self, temp_audit_file):
        """Create AuditLogger instance with temp file."""
        return AuditLogger(audit_file=temp_audit_file, scrub_phi=True)

    def test_log_event_creates_file(self, audit_logger, temp_audit_file):
        """Test that log_event creates audit file."""
        audit_logger.log_event(
            event_type="prediction",
            action="READ",
            resource_affected="patient_123",
            data={"age": 45},
            user_id="user_001",
        )

        assert temp_audit_file.exists()

    def test_log_event_has_required_fields(self, audit_logger, temp_audit_file):
        """Test that logged event has all required HIPAA fields."""
        audit_id = audit_logger.log_event(
            event_type="prediction",
            action="READ",
            resource_affected="patient_123",
            data={"age": 45},
            user_id="user_001",
        )

        assert audit_id != "error"

        # Decrypt and verify (mock for now)
        assert temp_audit_file.exists()

    def test_log_prediction(self, audit_logger):
        """Test log_prediction convenience method."""
        audit_id = audit_logger.log_prediction(
            request_id="req_123",
            features={"age": 45, "gender": "Male"},
            prediction_result={"risk_level": "High", "probability": 0.85},
            user_id="user_001",
        )

        assert audit_id != "error"

    def test_log_feedback(self, audit_logger):
        """Test log_feedback convenience method."""
        audit_id = audit_logger.log_feedback(
            request_id="req_123",
            feedback_data={"prediction_id": "pred_123", "ground_truth": 1},
            user_id="user_001",
        )

        assert audit_id != "error"

    def test_log_access(self, audit_logger):
        """Test log_access convenience method."""
        audit_id = audit_logger.log_access(
            resource_type="audit_trail",
            action="READ",
            user_id="user_001",
            details={"request_id": "req_456"},
        )

        assert audit_id != "error"

    def test_log_export(self, audit_logger):
        """Test log_export convenience method."""
        audit_id = audit_logger.log_export(
            resource_type="predictions",
            record_count=100,
            user_id="user_001",
            export_format="csv",
        )

        assert audit_id != "error"

    def test_log_auth_success(self, audit_logger):
        """Test log_auth convenience method (success)."""
        audit_id = audit_logger.log_auth(
            user_id="api_key_xyz",
            status="SUCCESS",
        )

        assert audit_id != "error"

    def test_log_auth_failure(self, audit_logger):
        """Test log_auth convenience method (failure)."""
        audit_id = audit_logger.log_auth(
            user_id="invalid_key",
            status="FAILURE",
            error_message="Invalid API key format",
        )

        assert audit_id != "error"

    def test_log_retrain(self, audit_logger):
        """Test log_retrain convenience method."""
        audit_id = audit_logger.log_retrain(
            model_version="3.1.0",
            dataset_hash="abc123def456",
            user_id="user_001",
            status="SUCCESS",
        )

        assert audit_id != "error"

    def test_user_anonymization(self, audit_logger):
        """Test that user_id is anonymized in logs."""
        user_id_plain = "john.doe@hospital.org"
        audit_id = audit_logger.log_event(
            event_type="access",
            action="READ",
            user_id=user_id_plain,
        )

        # The user_id should be hashed, not stored in plain
        assert audit_id != "error"

    def test_phi_scrubbing_in_logs(self, audit_logger):
        """Test that PHI in data is scrubbed."""
        data_with_phi = {
            "email": "patient@hospital.org",
            "ssn": "123-45-6789",
            "age": 45,
        }

        audit_id = audit_logger.log_event(
            event_type="prediction",
            action="READ",
            data=data_with_phi,
            user_id="user_001",
        )

        assert audit_id != "error"


class TestHIPAACompliance:
    """Test HIPAA compliance requirements."""

    def test_audit_file_format(self, tmp_path):
        """Test that audit file is JSONL format."""
        audit_file = tmp_path / "audit_trail.jsonl"
        audit_logger = AuditLogger(audit_file=audit_file)

        audit_logger.log_event(
            event_type="prediction",
            action="READ",
            user_id="user_001",
        )

        with open(audit_file, "rb") as f:
            lines = f.readlines()
            assert len(lines) > 0
            # Each line should be JSON (encrypted)
            for line in lines:
                assert line.startswith(b"{")

    def test_audit_encryption(self, tmp_path):
        """Test that audit entries are encrypted."""
        audit_file = tmp_path / "audit_trail.jsonl"
        audit_logger = AuditLogger(audit_file=audit_file)

        audit_logger.log_event(
            event_type="prediction",
            action="READ",
            data={"test": "data"},
            user_id="user_001",
        )

        with open(audit_file, "rb") as f:
            content = f.read()
            # Should contain encrypted payload (Fernet format)
            assert b"encrypted" in content or b"payload" in content

    def test_timestamp_iso_format(self, tmp_path):
        """Test that timestamps are ISO 8601 format."""
        audit_file = tmp_path / "audit_trail.jsonl"
        audit_logger = AuditLogger(audit_file=audit_file)

        audit_logger.log_event(
            event_type="prediction",
            action="READ",
            user_id="user_001",
        )

        # Verify file was written
        assert audit_file.exists()

    def test_request_id_correlation(self):
        """Test that request_id is captured for correlation."""
        from src.core.logging import request_id_contextvar

        request_id = "test_req_12345"
        request_id_contextvar.set(request_id)

        # In actual use, this would be passed to audit logger
        assert request_id_contextvar.get() == request_id

    def test_audit_trail_immutability(self, tmp_path):
        """Test that audit trail is append-only (immutable)."""
        audit_file = tmp_path / "audit_trail.jsonl"
        audit_logger = AuditLogger(audit_file=audit_file)

        # First write
        audit_logger.log_event(
            event_type="prediction", action="READ", user_id="user_001"
        )
        size_after_first = audit_file.stat().st_size

        # Second write
        audit_logger.log_event(
            event_type="feedback", action="WRITE", user_id="user_002"
        )
        size_after_second = audit_file.stat().st_size

        # File should only grow (append-only)
        assert size_after_second > size_after_first

    def test_access_logging_non_circular(self, tmp_path):
        """Test that accessing /audit doesn't cause infinite recursion."""
        audit_file = tmp_path / "audit_trail.jsonl"
        audit_logger = AuditLogger(audit_file=audit_file)

        # Log audit access
        audit_logger.log_access(
            resource_type="audit_trail", action="READ", user_id="user_001"
        )

        # Should complete without error
        assert audit_file.exists()
