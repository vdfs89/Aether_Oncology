"""
train.py
========
Aether Oncology v3.1 — Hospital-Grade Clinical ML Pipeline.
"""

from __future__ import annotations

import json
import logging
import os
import shutil
from pathlib import Path

import joblib
import mlflow
import mlflow.pytorch
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

# Pipeline Imports
from src.features.preprocessor import TARGET, build_preprocessor
from src.ml.pipelines.audit.fairness import ClinicalFairnessAuditor
from src.ml.pipelines.audit.leakage import LeakageAuditor
from src.ml.pipelines.calibration.calibration_engine import ClinicalCalibrationEngine
from src.ml.pipelines.lineage import ClinicalDataLineageRegistry, hash_file
from src.ml.pipelines.model_card_generator import ClinicalModelCardGenerator
from src.ml.pipelines.preprocessing.ood import ClinicalOODDetector
from src.ml.pipelines.validation.clinical_rules import validate_training_record
from src.ml.pipelines.validation.training_schema import training_raw_schema
from src.models.mlp import MLP

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s"
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

RAW_DATA_PATH = Path("data/raw/oral_cancer_top30.csv")
MODELS_DIR = Path("models")
PREPROCESSOR_PATH = MODELS_DIR / "preprocessor.joblib"
CALIBRATOR_PATH = MODELS_DIR / "calibrator.joblib"
OOD_DETECTOR_PATH = MODELS_DIR / "ood_detector.joblib"
MODEL_WEIGHTS_PATH = MODELS_DIR / "aether_mlp_v2.pth"
LINEAGE_PATH = MODELS_DIR / "data_lineage.json"
MODEL_CARD_PATH = MODELS_DIR / "model_card.md"
SNAPSHOT_DIR = Path("data/snapshots")

HPARAMS = {
    "seed": 42,
    "test_size": 0.15,
    "val_size": 0.15,
    "hidden_dims": [128, 64, 32],
    "dropout_rate": 0.3,
    "learning_rate": 1e-3,
    "max_epochs": 100,
    "patience": 10,
    "batch_size": 512,
    "dataset": "oral_cancer_top30",
    "dataset_version": "v1.0",
    "target": "high_risk",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _evaluate(
    model: nn.Module,
    X_tensor: torch.Tensor,
    y_true: np.ndarray,
) -> dict[str, float]:
    """Calcula métricas clínicas no conjunto de teste."""
    model.eval()
    with torch.no_grad():
        logits = model(X_tensor)
        probs = torch.sigmoid(logits).squeeze().numpy()
        preds = (probs >= 0.5).astype(int)

    return {
        "recall": float(
            np.sum((preds == 1) & (y_true == 1)) / max(np.sum(y_true == 1), 1)
        ),
        "f1": float(
            2
            * np.sum((preds == 1) & (y_true == 1))
            / max(2 * np.sum((preds == 1) & (y_true == 1)) + np.sum(preds != y_true), 1)
        ),
        "accuracy": float(np.mean(preds == y_true)),
    }


def train_mlp(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    input_dim: int,
) -> nn.Module:
    """
    Treina MLP com Early Stopping e mini-batches.
    Registra métricas por época no MLflow (run já aberto pelo chamador).
    """
    hidden_dims: list[int] = HPARAMS["hidden_dims"]  # type: ignore[assignment]

    # Modelo
    model = MLP(
        input_shape=input_dim,
        hidden_dims=hidden_dims,
        dropout_rate=HPARAMS["dropout_rate"],
    )

    # Balanceamento de classes com pos_weight
    n_pos = int(y_train.sum())
    n_neg = len(y_train) - n_pos
    pos_weight = torch.tensor([n_neg / max(n_pos, 1)], dtype=torch.float32)
    log.info("pos_weight: %.4f  (neg=%d, pos=%d)", pos_weight.item(), n_neg, n_pos)

    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    optimizer = torch.optim.Adam(model.parameters(), lr=HPARAMS["learning_rate"])

    # DataLoader
    X_tr_t = torch.FloatTensor(X_train)
    y_tr_t = torch.FloatTensor(y_train).unsqueeze(1)
    X_v_t = torch.FloatTensor(X_val)
    y_v_t = torch.FloatTensor(y_val).unsqueeze(1)

    loader = DataLoader(
        TensorDataset(X_tr_t, y_tr_t),
        batch_size=HPARAMS["batch_size"],
        shuffle=True,
    )

    # Early Stopping
    best_val_loss = float("inf")
    patience_counter = 0
    best_state: dict | None = None

    for epoch in range(HPARAMS["max_epochs"]):
        # Treino
        model.train()
        epoch_loss = 0.0
        n_batches = 0
        for xb, yb in loader:
            optimizer.zero_grad()
            loss = criterion(model(xb), yb)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
            n_batches += 1
        _ = epoch_loss / max(n_batches, 1)

        # Validação
        model.eval()
        with torch.no_grad():
            val_logits = model(X_v_t)
            val_loss = criterion(val_logits, y_v_t).item()

        # Early Stopping check
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= HPARAMS["patience"]:
                log.info("Early stopping ativado na época %d.", epoch)
                break

    # Restaura o melhor estado
    if best_state is not None:
        model.load_state_dict(best_state)

    return model


# ---------------------------------------------------------------------------
# Pipeline principal
# ---------------------------------------------------------------------------


def train() -> None:
    """Executa o pipeline completo de treino hospital-grade."""
    log.info("Iniciando Pipeline de Treino Clínico...")

    # 1. Reprodutibilidade
    torch.manual_seed(HPARAMS["seed"])
    np.random.seed(HPARAMS["seed"])
    log.info("Seed fixada: %d", HPARAMS["seed"])

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)

    # 2. Carga e Validação do Dataset Bruto
    if not RAW_DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset bruto não encontrado em: {RAW_DATA_PATH}")

    df_raw = pd.read_csv(RAW_DATA_PATH)

    # Executa validação de schema rígida via Pandera
    log.info("Validando dataset bruto com Pandera...")
    try:
        training_raw_schema.validate(df_raw)
        log.info("Schema do dataset validado com sucesso.")
    except Exception as e:
        raise ValueError(f"Dataset bruto violou o schema do Pandera: {e}")

    # Deriva o target binário antes das regras clínicas e splits
    df_raw[TARGET] = df_raw["Diagnosis_Stage"].isin(["Moderate", "Late"]).astype(int)

    # Executa Clinical Rules em cada registro de treino (Warning/High/Critical)
    log.info("Executando validações clínicas de coerência...")

    invalid_records = 0
    records_list = df_raw.to_dict(orient="records")
    for rec in records_list:
        val_res = validate_training_record(rec)
        if not val_res.can_infer:
            invalid_records += 1

    if invalid_records > 0:
        log.warning(
            f"Aviso: {invalid_records} registros apresentaram incoerências clínicas críticas."
        )

    # 3. Snapshot Imutável do Dataset
    dataset_hash = hash_file(str(RAW_DATA_PATH))
    snapshot_path = SNAPSHOT_DIR / dataset_hash
    snapshot_path.mkdir(parents=True, exist_ok=True)

    raw_snapshot = snapshot_path / "raw.parquet"
    validated_snapshot = snapshot_path / "validated.parquet"
    metadata_snapshot = snapshot_path / "metadata.json"

    # Salva snapshots imutáveis em formato Parquet para auditoria/replay
    df_raw.to_parquet(raw_snapshot, index=False)

    # O dataset validado é o mesmo sem linhas duplicadas
    df_validated = df_raw.drop_duplicates()
    df_validated.to_parquet(validated_snapshot, index=False)

    # Salva metadados do snapshot
    metadata_data = {
        "dataset_hash": dataset_hash,
        "raw_record_count": len(df_raw),
        "validated_record_count": len(df_validated),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "columns": df_raw.columns.tolist(),
    }
    with open(metadata_snapshot, "w") as f:
        json.dump(metadata_data, f, indent=2)
    log.info(f"Snapshot imutável criado em: {snapshot_path}")

    # 4. Temporal/Sequential Split Enforcement (ID-based proxy)
    log.info("Executando Split Temporal / Sequencial (ID-based)...")
    df_sorted = df_validated.sort_values(by="ID").reset_index(drop=True)

    total_len = len(df_sorted)
    val_split_idx = int(total_len * (1 - HPARAMS["test_size"] - HPARAMS["val_size"]))
    test_split_idx = int(total_len * (1 - HPARAMS["test_size"]))

    df_train = df_sorted.iloc[:val_split_idx]
    df_val = df_sorted.iloc[val_split_idx:test_split_idx]
    df_test = df_sorted.iloc[test_split_idx:]

    log.info(
        "Splits: %d Treino | %d Validação | %d Teste",
        len(df_train),
        len(df_val),
        len(df_test),
    )

    # Separa X e y
    df_train_X = df_train.drop(
        columns=[TARGET, "Diagnosis_Stage", "ID", "HPV_Related"], errors="ignore"
    )
    y_train = df_train[TARGET].values

    df_val_X = df_val.drop(
        columns=[TARGET, "Diagnosis_Stage", "ID", "HPV_Related"], errors="ignore"
    )
    y_val = df_val[TARGET].values

    df_test_X = df_test.drop(
        columns=[TARGET, "Diagnosis_Stage", "ID", "HPV_Related"], errors="ignore"
    )
    y_test = df_test[TARGET].values

    # Adiciona HPV_Related de volta em X se presente, para o clinical feature extractor
    if "HPV_Related" in df_train.columns:
        df_train_X["HPV_Related"] = df_train["HPV_Related"]
        df_val_X["HPV_Related"] = df_val["HPV_Related"]
        df_test_X["HPV_Related"] = df_test["HPV_Related"]

    # 5. Preprocessamento Clínico
    preprocessor = build_preprocessor()
    X_train_t = preprocessor.fit_transform(df_train_X)
    X_val_t = preprocessor.transform(df_val_X)
    X_test_t = preprocessor.transform(df_test_X)

    # Persistir preprocessor
    joblib.dump(preprocessor, PREPROCESSOR_PATH)
    log.info("Preprocessor salvo: %s", PREPROCESSOR_PATH)

    # 6. Fit Out-of-Distribution Detector (Isolation Forest)
    log.info("Treinando Out-of-Distribution Detector...")
    ood_detector = ClinicalOODDetector(contamination=0.01)
    ood_detector.fit(X_train_t)
    ood_detector.save(str(OOD_DETECTOR_PATH))
    log.info("OOD Detector salvo: %s", OOD_DETECTOR_PATH)

    # 7. Leakage Auditor check
    log.info("Iniciando auditoria de vazamento de dados...")
    feature_names = (
        preprocessor.named_steps["preprocessor"].get_feature_names_out().tolist()
    )
    leakage_auditor = LeakageAuditor()
    _leakage_report = leakage_auditor.run_leakage_audit(
        X_df=df_train_X,
        y=y_train,
        preprocessed_feature_names=feature_names,
        X_train_t=X_train_t,
        y_train=y_train,
    )

    # 8. Treino do Modelo (MLP)
    input_dim = X_train_t.shape[1]
    model = train_mlp(
        X_train=X_train_t,
        y_train=y_train,
        X_val=X_val_t,
        y_val=y_val,
        input_dim=input_dim,
    )
    torch.save(model.state_dict(), MODEL_WEIGHTS_PATH)
    log.info("Pesos do MLP salvos: %s", MODEL_WEIGHTS_PATH)

    # 9. Calibração de Probabilidades
    log.info("Iniciando Calibração de Probabilidades...")
    model.eval()
    with torch.no_grad():
        val_logits = model(torch.FloatTensor(X_val_t)).numpy().flatten()
        test_logits = model(torch.FloatTensor(X_test_t)).numpy().flatten()

    calibration_engine = ClinicalCalibrationEngine(n_bins=10)
    calibration_metrics = calibration_engine.calibrate(
        y_val=y_val, val_logits=val_logits, output_dir=str(MODELS_DIR / "calibration")
    )

    # Copia calibrador principal para modelos/calibrador.joblib
    shutil.copy(MODELS_DIR / "calibration" / "calibrator.joblib", CALIBRATOR_PATH)

    # Carrega calibrador para avaliar test probs
    calibrator = joblib.load(CALIBRATOR_PATH)
    if calibration_metrics["best_calibration_method"] == "isotonic":
        test_probs = calibrator.predict(test_logits)
    else:
        test_probs = calibrator.predict_proba(test_logits.reshape(-1, 1))[:, 1]

    test_preds = (test_probs >= 0.5).astype(int)

    # 10. Clinical Fairness Audit
    log.info("Iniciando Auditoria de Fairness Clínica...")
    # derived featureExtractor mapping for test to allow fairness slices
    df_test_features = preprocessor.named_steps["extractor"].transform(df_test_X)
    fairness_auditor = ClinicalFairnessAuditor()
    fairness_report = fairness_auditor.run_fairness_audit(
        df=df_test_features, y_true=y_test, y_pred=test_preds, y_prob=test_probs
    )

    # Save fairness report to file
    with open(MODELS_DIR / "fairness_audit.json", "w") as f:
        json.dump(fairness_report, f, indent=2)

    # 11. Registrar Lineage
    log.info("Gerando Lineage do Dataset...")
    lineage_registry = ClinicalDataLineageRegistry(
        str(RAW_DATA_PATH), str(LINEAGE_PATH)
    )
    lineage_metadata = lineage_registry.register_lineage(
        calibration_method=calibration_metrics["best_calibration_method"],
        brier_score=calibration_metrics["brier_score"],
    )

    # 12. Gerar Model Card
    log.info("Gerando Model Card Clínico...")
    model_card_gen = ClinicalModelCardGenerator()
    model_card_gen.generate_card(
        lineage_metadata=lineage_metadata,
        calibration_metrics=calibration_metrics,
        fairness_report=fairness_report,
        output_path=str(MODEL_CARD_PATH),
    )

    # 13. MLflow Tracking Complete
    mlflow_uri = os.getenv("MLFLOW_TRACKING_URI")
    if not mlflow_uri:
        import socket

        try:
            with socket.create_connection(("localhost", 5000), timeout=1):
                mlflow_uri = "http://localhost:5000"
        except Exception:
            mlflow_uri = "sqlite:///mlflow.db"
    log.info("MLflow tracking URI: %s", mlflow_uri)
    # MLflow tracking is observability, not a build gate. The trained model and
    # all governance artifacts are already persisted to disk above; a tracking
    # failure (e.g. an unreachable server or invalid credentials supplied via a
    # CI secret) must NOT fail the training pipeline.
    try:
        mlflow.set_tracking_uri(mlflow_uri)
        mlflow.set_experiment("Aether_Oncology_OralCancer_HighRisk")

        with mlflow.start_run(run_name="aether_clinical_platform_v3_1"):
            mlflow.log_params(HPARAMS)
            mlflow.log_param("dataset_hash", dataset_hash)
            mlflow.log_metrics(
                {
                    "brier_score": calibration_metrics["brier_score"],
                    "ece": calibration_metrics["ece"],
                    "mce": calibration_metrics["mce"],
                    "fairness_recall_disparity_gender": fairness_report[
                        "sensitive_metrics"
                    ]
                    .get("Gender", {})
                    .get("recall_disparity", 0.0),
                }
            )

            # Log artifacts
            mlflow.log_artifact(str(PREPROCESSOR_PATH))
            mlflow.log_artifact(str(CALIBRATOR_PATH))
            mlflow.log_artifact(str(OOD_DETECTOR_PATH))
            mlflow.log_artifact(str(LINEAGE_PATH))
            mlflow.log_artifact(str(MODEL_CARD_PATH))
            mlflow.log_artifact(
                str(MODELS_DIR / "calibration" / "reliability_curve.png")
            )

            mlflow.pytorch.log_model(
                model,
                artifact_path="model",
                registered_model_name="AetherOncologyOralCancerHighRisk",
            )
    except Exception as exc:  # noqa: BLE001
        log.warning(
            "MLflow tracking skipped (non-fatal). Model artifacts are already "
            "saved to disk. Reason: %s",
            exc,
        )

    log.info("Pipeline de Treino Clínico Concluído com Sucesso!")


if __name__ == "__main__":
    from datetime import datetime

    train()
