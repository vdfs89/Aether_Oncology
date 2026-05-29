
from src.services.audit import calculate_drift, decrypt_entry, log_prediction


def test_log_prediction(tmp_path, monkeypatch):
    # Setup temporary audit file
    test_audit_file = tmp_path / "test_audit.jsonl"
    monkeypatch.setattr("src.services.audit.AUDIT_FILE", test_audit_file)
    monkeypatch.setattr("src.services.audit.LOG_DIR", tmp_path)

    features = {"Age": 50, "Survival_Rate": 0.5}
    prediction = {
        "risk_level": "High",
        "probability": 0.95,
        "confidence": "95.0%",
        "warning": "Test",
    }

    log_prediction(features, prediction)

    assert test_audit_file.exists()
    with open(test_audit_file, "rb") as f:
        line = f.readline()
        data = decrypt_entry(line)
        assert data["input"] == features
        assert data["output"]["risk_level"] == "High"


def test_calculate_drift_insufficient_data(tmp_path, monkeypatch):
    test_audit_file = tmp_path / "non_existent.jsonl"
    monkeypatch.setattr("src.services.audit.AUDIT_FILE", test_audit_file)

    result = calculate_drift()
    assert result["status"] == "insufficient_data"


def test_calculate_drift_collecting(tmp_path, monkeypatch):
    test_audit_file = tmp_path / "short_audit.jsonl"
    monkeypatch.setattr("src.services.audit.AUDIT_FILE", test_audit_file)
    monkeypatch.setattr("src.services.audit.LOG_DIR", tmp_path)

    # Log only 2 predictions (less than 10)
    for _ in range(2):
        log_prediction({"Age": 50.0}, {"prediction": 0})

    result = calculate_drift()
    assert result["status"] == "collecting"
    assert result["count"] == 2


def test_calculate_drift_stable(tmp_path, monkeypatch):
    test_audit_file = tmp_path / "stable_audit.jsonl"
    monkeypatch.setattr("src.services.audit.AUDIT_FILE", test_audit_file)
    monkeypatch.setattr("src.services.audit.LOG_DIR", tmp_path)

    # Log 11 predictions close to training means to pass the threshold of 10
    features = {
        "Age": 50.0,
        "Survival_Rate": 0.5,
    }

    # Mock DATA_PATH to a valid CSV for DriftDetector
    import pandas as pd

    test_data = tmp_path / "baseline.csv"
    pd.DataFrame([features] * 20).to_csv(test_data, index=False)
    monkeypatch.setattr("src.services.audit.DATA_PATH", test_data)

    for _ in range(11):
        log_prediction(features, {"prediction": 0})

    result = calculate_drift()
    assert result["status"] == "stable"
    assert "Age" in result["metrics"]
    assert result["total_audited"] == 11


def test_calculate_drift_alert(tmp_path, monkeypatch):
    test_audit_file = tmp_path / "drift_audit.jsonl"
    monkeypatch.setattr("src.services.audit.AUDIT_FILE", test_audit_file)
    monkeypatch.setattr("src.services.audit.LOG_DIR", tmp_path)

    # Mock DATA_PATH with baseline features
    import pandas as pd

    baseline_features = {
        "Age": 50.0,
        "Survival_Rate": 0.5,
        "dummy1": 0.0, "dummy2": 0.0, "dummy3": 0.0, "dummy4": 0.0, "dummy5": 0.0, "dummy6": 0.0
    }
    test_data = tmp_path / "baseline_alert.csv"
    pd.DataFrame([baseline_features] * 20).to_csv(test_data, index=False)
    monkeypatch.setattr("src.services.audit.DATA_PATH", test_data)

    # Log 11 predictions with significant drift (enough to trigger 33% threshold)
    features = {
        "Age": 90.0,
        "Survival_Rate": 0.0,
        "dummy1": 1.0, "dummy2": 1.0, "dummy3": 1.0, "dummy4": 1.0, "dummy5": 1.0, "dummy6": 1.0
    }
    for _ in range(11):
        log_prediction(features, {"prediction": 1})

    result = calculate_drift()
    assert result["status"] == "alert"
    assert any("Age" in alert for alert in result["alerts"])
