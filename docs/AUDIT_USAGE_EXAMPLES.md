# HIPAA Audit & PHI Scrubber - Usage Examples

## Quick Start

### 1. Using PHI Scrubber

```python
from src.safety.phi_scrubber import get_phi_scrubber

scrubber = get_phi_scrubber()

# Scrub sensitive text
text = "Patient John Doe, email john@hospital.org, phone (555) 123-4567"
scrubbed, detected = scrubber.scrub_string(text)

print(f"Original: {text}")
print(f"Scrubbed: {scrubbed}")
print(f"Detected: {detected}")

# Output:
# Original: Patient John Doe, email john@hospital.org, phone (555) 123-4567
# Scrubbed: Patient [NAME_PATTERN_REDACTED], email [EMAIL_REDACTED], phone [PHONE_REDACTED]
# Detected: {'name_pattern': ['John Doe'], 'email': ['john@hospital.org'], 'phone': ['(555) 123-4567']}
```

### 2. Using Audit Logger

```python
from src.services.audit_logger import get_audit_logger

audit_logger = get_audit_logger()

# Log a prediction event
audit_id = audit_logger.log_prediction(
    request_id="req_abc123",
    features={
        "age": 52,
        "gender": "Male",
        "tobacco_use": "Yes"
    },
    prediction_result={
        "risk_level": "High",
        "probability": 0.85,
        "confidence": "High"
    },
    user_id="api_key_xyz"
)

print(f"Event logged with ID: {audit_id}")
```

### 3. In FastAPI Endpoints

```python
from fastapi import FastAPI, Request, Security
from src.services.audit_logger import get_audit_logger
from src.core.logging import request_id_contextvar

app = FastAPI()

@app.post("/predict")
async def predict(request: Request, data: PredictionRequest):
    request_id = request_id_contextvar.get()
    user_id = request.headers.get("access_token")
    
    # Your prediction logic...
    result = your_model.predict(data)
    
    # Log with audit logger (PHI is automatically scrubbed)
    audit_logger = get_audit_logger()
    await asyncio.to_thread(
        audit_logger.log_prediction,
        request_id,
        data.model_dump(),
        result,
        user_id
    )
    
    return result
```

---

## Common Scenarios

### Scenario 1: Scrub PHI Before Storing

```python
from src.safety.phi_scrubber import get_phi_scrubber
import json

patient_data = {
    "email": "jane@hospital.org",
    "phone": "(555) 987-6543",
    "ssn": "123-45-6789",
    "age": 45,
    "risk_score": 0.72
}

scrubber = get_phi_scrubber()
scrubbed_data, detected_phi = scrubber.scrub_dict(patient_data)

# Store scrubbed data
with open("patient_record.json", "w") as f:
    json.dump({
        "scrubbed_data": scrubbed_data,
        "phi_detected": bool(detected_phi),
        "phi_types": list(detected_phi.keys())
    }, f)

# Output:
# {
#   "scrubbed_data": {
#     "email": "[EMAIL_REDACTED]",
#     "phone": "[PHONE_REDACTED]",
#     "ssn": "[SSN_REDACTED]",
#     "age": 45,
#     "risk_score": 0.72
#   },
#   "phi_detected": true,
#   "phi_types": ["email", "phone", "ssn"]
# }
```

### Scenario 2: Track Clinical Feedback with Audit Trail

```python
from src.services.audit_logger import get_audit_logger
from src.core.logging import request_id_contextvar

audit_logger = get_audit_logger()

# User submits clinical feedback
feedback = {
    "prediction_id": "pred_12345",
    "ground_truth": 1,  # 1 = Malignant, 0 = Benign
    "notes": "Confirmed via biopsy on 2026-05-29"
}

audit_id = audit_logger.log_feedback(
    request_id=request_id_contextvar.get(),
    feedback_data=feedback,
    user_id="dr_smith_id"
)

# This creates an audit trail entry with:
# - Timestamp (ISO 8601)
# - User ID (anonymized)
# - Feedback data (PHI scrubbed if present)
# - Correlation via request_id
# - Encryption at rest
```

### Scenario 3: Monitor Audit Trail Access

```python
from src.services.audit_logger import get_audit_logger

audit_logger = get_audit_logger()

# Log when auditors access the audit trail
audit_id = audit_logger.log_access(
    resource_type="audit_trail",
    action="READ",
    user_id="auditor_team",
    details={
        "purpose": "quarterly_compliance_review",
        "date_range": "2026-01-01 to 2026-05-29"
    }
)

# This creates an entry showing:
# - Who accessed what
# - When (timestamp)
# - Why (purpose in details)
# - All encrypted
```

### Scenario 4: Log Model Retraining

```python
from src.services.audit_logger import get_audit_logger

audit_logger = get_audit_logger()

# Log model retraining event
audit_id = audit_logger.log_retrain(
    model_version="3.2.0",
    dataset_hash="sha256_of_training_data",
    user_id="ml_team",
    status="SUCCESS"
)

# Or if retraining failed:
audit_id = audit_logger.log_retrain(
    model_version="3.2.0",
    dataset_hash="sha256_of_training_data",
    user_id="ml_team",
    status="FAILURE",
    error_message="Insufficient training data for Oral Cancer v2 dataset"
)
```

### Scenario 5: Export Patient Data (HIPAA Compliance)

```python
from src.services.audit_logger import get_audit_logger
import asyncio

audit_logger = get_audit_logger()

async def export_patient_data(patient_ids: list, format: str = "csv"):
    # Perform export...
    record_count = len(patient_ids)
    
    # Log the export for compliance
    await asyncio.to_thread(
        audit_logger.log_export,
        resource_type="patient_records",
        record_count=record_count,
        user_id="data_team",
        export_format=format
    )
    
    return f"Exported {record_count} records in {format} format"
```

---

## Viewing Audit Logs

### Via Python

```python
from src.services.audit import decrypt_entry
from pathlib import Path

audit_file = Path("logs/audit_trail.jsonl")

print("=== AUDIT TRAIL ===")
with open(audit_file, "rb") as f:
    for line_num, line in enumerate(f, 1):
        line = line.strip()
        if not line:
            continue
        
        try:
            entry = decrypt_entry(line)
            print(f"\n[{line_num}] {entry['timestamp']}")
            print(f"    Event: {entry['event_type']}")
            print(f"    Action: {entry['action']}")
            print(f"    User: {entry['user_id']}")
            print(f"    Resource: {entry['resource_affected']}")
            print(f"    PHI Scrubbed: {entry['phi_scrubbed']}")
            print(f"    Status: {entry['status']}")
        except Exception as e:
            print(f"    [ERROR] Could not decrypt: {e}")
```

### Via CLI (Decryption)

```bash
# Create a script to view logs
python -c "
from src.services.audit import decrypt_entry
with open('logs/audit_trail.jsonl', 'rb') as f:
    for line in f:
        entry = decrypt_entry(line.strip())
        print(f\"{entry['timestamp']} | {entry['event_type']} | {entry['action']}\")
"
```

---

## Testing Your Implementation

### Unit Tests

```bash
# Run all compliance tests
pytest tests/test_audit_compliance.py -v

# Run specific test class
pytest tests/test_audit_compliance.py::TestPHIScrubber -v

# Run with coverage
pytest tests/test_audit_compliance.py --cov=src/safety --cov=src/services
```

### Integration Test

```python
import asyncio
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)

# Test prediction endpoint (should be audited)
response = client.post(
    "/predict",
    json={
        "age": 52,
        "gender": "Male",
        "country": "Brazil",
        "tobacco_use": "Yes",
        "alcohol_use": "Yes",
        "socioeconomic_status": "Middle"
    },
    headers={"access_token": "test_key"}
)

assert response.status_code == 200
# Audit trail should have a new entry for this prediction

# Check audit trail was updated
audit_response = client.get(
    "/audit",
    headers={"access_token": "test_key"}
)

assert audit_response.status_code == 200
assert len(audit_response.json()) > 0
```

---

## Security Best Practices

1. **Encryption Key Management**:
   - Always set `AUDIT_ENCRYPTION_KEY` in production
   - Rotate keys periodically
   - Store keys in secrets management (e.g., AWS Secrets Manager)

2. **Access Control**:
   - Only authorized users should access `/audit` endpoint
   - Use API key validation
   - Log all audit trail access

3. **Data Retention**:
   - Implement audit log retention policies
   - Archive old logs to secure storage
   - Define deletion schedules per compliance requirements

4. **Monitoring**:
   - Alert on suspicious access patterns
   - Monitor PHI detection rates
   - Track failed authentication attempts

---

## Troubleshooting

### Issue: "AUDIT_ENCRYPTION_KEY ausente"

**Solution**: Set the environment variable before running:
```bash
export AUDIT_ENCRYPTION_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
```

### Issue: PHI patterns not detecting email

**Check**: Verify regex pattern in `src/config/phi_patterns.json`

```python
import re
pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
test_email = "user@example.com"
print(re.search(pattern, test_email))  # Should find match
```

### Issue: Audit logs file growing too large

**Solution**: Implement log rotation:
```python
from pathlib import Path

AUDIT_FILE = Path("logs/audit_trail.jsonl")
MAX_SIZE = 100 * 1024 * 1024  # 100 MB

if AUDIT_FILE.stat().st_size > MAX_SIZE:
    backup = AUDIT_FILE.with_suffix(".jsonl.backup")
    AUDIT_FILE.rename(backup)
    # Archive backup file
```
