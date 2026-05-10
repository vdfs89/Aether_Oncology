import json
from pathlib import Path
from src.services.audit import log_prediction, calculate_drift, AUDIT_FILE

def test_log_prediction(tmp_path, monkeypatch):
    # Setup temporary audit file
    test_audit_file = tmp_path / "test_audit.jsonl"
    monkeypatch.setattr("src.services.audit.AUDIT_FILE", test_audit_file)
    monkeypatch.setattr("src.services.audit.LOG_DIR", tmp_path)

    features = {"radius_mean": 15.0, "texture_mean": 20.0}
    prediction = {"prediction": 1, "label": "Malignant", "probability": 0.95, "top_feature": "area_mean"}

    log_prediction(features, prediction)

    assert test_audit_file.exists()
    with open(test_audit_file, "r") as f:
        line = f.readline()
        data = json.loads(line)
        assert data["input"] == features
        assert data["output"]["label"] == "Malignant"

def test_calculate_drift_insufficient_data(tmp_path, monkeypatch):
    test_audit_file = tmp_path / "non_existent.jsonl"
    monkeypatch.setattr("src.services.audit.AUDIT_FILE", test_audit_file)
    
    result = calculate_drift()
    assert result["status"] == "insufficient_data"

def test_calculate_drift_collecting(tmp_path, monkeypatch):
    test_audit_file = tmp_path / "short_audit.jsonl"
    monkeypatch.setattr("src.services.audit.AUDIT_FILE", test_audit_file)
    monkeypatch.setattr("src.services.audit.LOG_DIR", tmp_path)

    # Log only 2 predictions (less than 5)
    for _ in range(2):
        log_prediction({"radius_mean": 14.0}, {"prediction": 0})

    result = calculate_drift()
    assert result["status"] == "collecting"
    assert result["count"] == 2

def test_calculate_drift_stable(tmp_path, monkeypatch):
    test_audit_file = tmp_path / "stable_audit.jsonl"
    monkeypatch.setattr("src.services.audit.AUDIT_FILE", test_audit_file)
    monkeypatch.setattr("src.services.audit.LOG_DIR", tmp_path)

    # Log 6 predictions close to training means
    features = {
        "radius_mean": 14.1, 
        "texture_mean": 19.3,
        "perimeter_mean": 92.0,
        "area_mean": 655.0,
        "smoothness_mean": 0.096,
        "compactness_mean": 0.104,
        "concavity_mean": 0.088,
        "concave_points_mean": 0.048,
    }
    for _ in range(6):
        log_prediction(features, {"prediction": 0})

    result = calculate_drift()
    assert result["status"] == "stable"
    assert "radius_mean" in result["metrics"]
    assert result["total_audited"] == 6

def test_calculate_drift_alert(tmp_path, monkeypatch):
    test_audit_file = tmp_path / "drift_audit.jsonl"
    monkeypatch.setattr("src.services.audit.AUDIT_FILE", test_audit_file)
    monkeypatch.setattr("src.services.audit.LOG_DIR", tmp_path)

    # Log 6 predictions with significant drift (e.g., radius_mean double)
    features = {"radius_mean": 30.0} 
    for _ in range(6):
        log_prediction(features, {"prediction": 1})

    result = calculate_drift()
    assert result["status"] == "alert"
    assert any("radius_mean" in alert for alert in result["alerts"])
