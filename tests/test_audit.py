import json
from src.services.audit import calculate_drift, log_prediction

def test_log_prediction(tmp_path, monkeypatch):
    # Setup temporary audit file
    test_audit_file = tmp_path / "test_audit.jsonl"
    monkeypatch.setattr("src.services.audit.AUDIT_FILE", test_audit_file)
    monkeypatch.setattr("src.services.audit.LOG_DIR", tmp_path)

    features = {"radius_mean": 15.0, "texture_mean": 20.0}
    prediction = {
        "prediction": 1,
        "label": "Malignant",
        "probability": 0.95,
        "top_feature": "area_mean",
    }

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

    # Log only 2 predictions (less than 10)
    for _ in range(2):
        log_prediction({"radius_mean": 14.0}, {"prediction": 0})

    result = calculate_drift()
    assert result["status"] == "collecting"
    assert result["count"] == 2

def test_calculate_drift_stable(tmp_path, monkeypatch):
    test_audit_file = tmp_path / "stable_audit.jsonl"
    monkeypatch.setattr("src.services.audit.AUDIT_FILE", test_audit_file)
    monkeypatch.setattr("src.services.audit.LOG_DIR", tmp_path)

    # Log 11 predictions close to training means to pass the threshold of 10
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
    
    # Mock DATA_PATH to a valid CSV for DriftDetector
    import pandas as pd
    test_data = tmp_path / "baseline.csv"
    pd.DataFrame([features] * 20).to_csv(test_data, index=False)
    monkeypatch.setattr("src.services.audit.DATA_PATH", test_data)

    for _ in range(11):
        log_prediction(features, {"prediction": 0})

    result = calculate_drift()
    assert result["status"] == "stable"
    assert "radius_mean" in result["metrics"]
    assert result["total_audited"] == 11

def test_calculate_drift_alert(tmp_path, monkeypatch):
    test_audit_file = tmp_path / "drift_audit.jsonl"
    monkeypatch.setattr("src.services.audit.AUDIT_FILE", test_audit_file)
    monkeypatch.setattr("src.services.audit.LOG_DIR", tmp_path)

    # Mock DATA_PATH with baseline features
    import pandas as pd
    baseline_features = {
        "radius_mean": 14.0,
        "texture_mean": 19.0,
        "perimeter_mean": 90.0,
        "area_mean": 650.0,
        "smoothness_mean": 0.1,
        "compactness_mean": 0.1,
        "concavity_mean": 0.1,
        "concave_points_mean": 0.05,
        "symmetry_mean": 0.2,
        "fractal_dimension_mean": 0.06,
        "radius_se": 0.4
    }
    test_data = tmp_path / "baseline_alert.csv"
    pd.DataFrame([baseline_features] * 20).to_csv(test_data, index=False)
    monkeypatch.setattr("src.services.audit.DATA_PATH", test_data)

    # Log 11 predictions with significant drift (enough to trigger 33% threshold)
    features = {
        "radius_mean": 30.0,
        "texture_mean": 30.0,
        "perimeter_mean": 150.0,
        "area_mean": 1500.0,
        "smoothness_mean": 0.2,
        "compactness_mean": 0.3,
        "concavity_mean": 0.4,
        "concave_points_mean": 0.2,
        "symmetry_mean": 0.3,
        "fractal_dimension_mean": 0.1,
        "radius_se": 2.0,
    }
    for _ in range(11):
        log_prediction(features, {"prediction": 1})

    result = calculate_drift()
    assert result["status"] == "alert"
    assert any("radius_mean" in alert for alert in result["alerts"])
