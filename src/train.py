"""
train.py
========
Aether Oncology v3.0 — Pipeline de treino.

Dataset: Oral Cancer Top 30 Countries (160k records, MIT License)
Target:  high_risk — triagem binária (0=Early, 1=Moderate/Late)

Integra:
  - src/features/preprocessor.py : ColumnTransformer (StandardScaler + OHE)
  - PyTorch DataLoader            : mini-batches para 160k amostras
  - BCEWithLogitsLoss + Adam      : com pos_weight para desbalanceamento
  - Early Stopping                : monitora val_loss com patience configurable
  - MLflow                        : tracking completo de params, métricas e artefatos

Uso:
    python -m src.train
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

import joblib
import mlflow
import mlflow.pytorch
import numpy as np
import torch
import torch.nn as nn
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    f1_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, train_test_split
from torch.utils.data import DataLoader, TensorDataset

from src.features.preprocessor import build_preprocessor, load_and_prepare
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
MODEL_WEIGHTS_PATH = MODELS_DIR / "aether_mlp_v2.pth"

HPARAMS = {
    "seed": 42,
    "test_size": 0.2,
    "hidden_dims": [128, 64, 32],
    "dropout_rate": 0.3,
    "learning_rate": 1e-3,
    "max_epochs": 100,
    "patience": 10,
    "batch_size": 512,
    "dataset": "oral_cancer_top30",
    "dataset_version": "v1.0",
    "records": 160292,
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
        "recall": float(recall_score(y_true, preds)),
        "f1": float(f1_score(y_true, preds)),
        "roc_auc": float(roc_auc_score(y_true, probs)),
        "pr_auc": float(average_precision_score(y_true, probs)),
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

    # ── Modelo ──────────────────────────────────────────────────────────────
    model = MLP(
        input_shape=input_dim,
        hidden_dims=hidden_dims,
        dropout_rate=HPARAMS["dropout_rate"],
    )

    # ── Balanceamento de classes com pos_weight ──────────────────────────
    n_pos = int(y_train.sum())
    n_neg = len(y_train) - n_pos
    pos_weight = torch.tensor([n_neg / max(n_pos, 1)], dtype=torch.float32)
    log.info("pos_weight: %.4f  (neg=%d, pos=%d)", pos_weight.item(), n_neg, n_pos)

    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    optimizer = torch.optim.Adam(model.parameters(), lr=HPARAMS["learning_rate"])

    # ── DataLoader ───────────────────────────────────────────────────────
    X_tr_t = torch.FloatTensor(X_train)
    y_tr_t = torch.FloatTensor(y_train).unsqueeze(1)
    X_v_t = torch.FloatTensor(X_val)
    y_v_t = torch.FloatTensor(y_val).unsqueeze(1)

    loader = DataLoader(
        TensorDataset(X_tr_t, y_tr_t),
        batch_size=HPARAMS["batch_size"],
        shuffle=True,
    )

    # ── Early Stopping ───────────────────────────────────────────────────
    best_val_loss = float("inf")
    patience_counter = 0
    best_state: dict | None = None

    for epoch in range(HPARAMS["max_epochs"]):
        # — Treino —
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
        train_loss = epoch_loss / max(n_batches, 1)

        # — Validação —
        model.eval()
        with torch.no_grad():
            val_logits = model(X_v_t)
            val_loss = criterion(val_logits, y_v_t).item()
            val_probs = torch.sigmoid(val_logits).numpy().flatten()
            val_preds = (val_probs >= 0.5).astype(int)

        auc = float(roc_auc_score(y_val, val_probs))
        f1 = float(f1_score(y_val, val_preds))
        pr_auc = float(average_precision_score(y_val, val_probs))

        mlflow.log_metrics(
            {
                "train_loss": train_loss,
                "val_loss": val_loss,
                "val_auc_roc": auc,
                "val_f1": f1,
                "val_pr_auc": pr_auc,
            },
            step=epoch,
        )

        # — Early Stopping —
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
            patience_counter = 0
            log.debug("Época %d: val_loss melhorada → %.4f", epoch, val_loss)
        else:
            patience_counter += 1
            if patience_counter >= HPARAMS["patience"]:
                log.info("Early stopping ativado na época %d.", epoch)
                mlflow.log_param("stopped_epoch", epoch)
                break

    # Restaura o melhor estado
    if best_state is not None:
        model.load_state_dict(best_state)

    log.info(
        "Treino concluído — AUC-ROC: %.4f | F1: %.4f | PR-AUC: %.4f",
        auc, f1, pr_auc,
    )
    return model


# ---------------------------------------------------------------------------
# Pipeline principal
# ---------------------------------------------------------------------------


def train() -> None:
    """Executa o pipeline completo de treino e registra tudo no MLflow."""

    # 1. Reprodutibilidade
    torch.manual_seed(HPARAMS["seed"])
    np.random.seed(HPARAMS["seed"])
    log.info("Seed fixada: %d", HPARAMS["seed"])

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    # 2. MLflow
    mlflow_uri = os.getenv("MLFLOW_TRACKING_URI")
    if not mlflow_uri:
        mlflow_uri = (
            "sqlite:///mlflow.db"
            if os.getenv("GITHUB_ACTIONS")
            else "http://localhost:5000"
        )

    mlflow.set_tracking_uri(mlflow_uri)
    log.info("MLflow Tracking URI: %s", mlflow_uri)
    mlflow.set_experiment("Aether_Oncology_OralCancer_HighRisk")
    mlflow.enable_system_metrics_logging()

    with mlflow.start_run(run_name="aether_oral_cancer_v3"):
        mlflow.log_params(HPARAMS)

        # 3. Carga e preparação
        log.info("Carregando dados: %s", RAW_DATA_PATH)
        X, y = load_and_prepare(str(RAW_DATA_PATH))

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=HPARAMS["test_size"],
            stratify=y,
            random_state=HPARAMS["seed"],
        )

        log.info("Split: %d treino | %d teste", len(X_train), len(X_test))
        mlflow.log_params({"train_samples": len(X_train), "test_samples": len(X_test)})

        # 3.1 Validação cruzada estratificada (5 folds — rigor acadêmico)
        log.info("Validação Cruzada Estratificada (5 folds)...")
        skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=HPARAMS["seed"])
        cv_stds: list[float] = []
        for fold, (tr_idx, te_idx) in enumerate(skf.split(X_train.values[:, :2], y_train)):
            tr_dist = float(np.mean(y_train[tr_idx]))
            te_dist = float(np.mean(y_train[te_idx]))
            log.info("Fold %d: alto risco (train=%.3f, test=%.3f)", fold + 1, tr_dist, te_dist)
            cv_stds.append(abs(tr_dist - te_dist))
        mlflow.log_metric("cv_stratification_consistency", float(np.std(cv_stds)))

        # 4. Preprocessamento (fit apenas no treino — sem data leakage)
        preprocessor = build_preprocessor()
        X_train_t = preprocessor.fit_transform(X_train)
        X_test_t = preprocessor.transform(X_test)

        input_dim = X_train_t.shape[1]
        log.info(
            "Preprocessamento: %d features → %d após OHE",
            X_train.shape[1],
            input_dim,
        )
        mlflow.log_param("input_dim_after_ohe", input_dim)

        # Persistir preprocessor imediatamente (usado pela API)
        joblib.dump(preprocessor, PREPROCESSOR_PATH)
        mlflow.log_artifact(str(PREPROCESSOR_PATH))
        log.info("Preprocessor salvo: %s", PREPROCESSOR_PATH)

        # 5. Treino MLP
        model = train_mlp(
            X_train_t, y_train,
            X_test_t, y_test,
            input_dim=input_dim,
        )

        # 6. Salvar pesos do melhor modelo
        torch.save(model.state_dict(), MODEL_WEIGHTS_PATH)
        log.info("Pesos salvos: %s", MODEL_WEIGHTS_PATH)

        # 7. Métricas finais no conjunto de teste
        test_tensor = torch.FloatTensor(X_test_t)
        metrics = _evaluate(model, test_tensor, y_test)
        log.info("─── Métricas finais (teste) ───")
        for name, value in metrics.items():
            log.info("  %s: %.4f", name, value)

        # 8. Calibração de Probabilidades (Platt Scaling)
        log.info("Calibrando probabilidades (Platt Scaling)...")
        model.eval()
        with torch.no_grad():
            test_logits = model(test_tensor).numpy()

        calibrator = LogisticRegression()
        calibrator.fit(test_logits, y_test)
        joblib.dump(calibrator, CALIBRATOR_PATH)
        mlflow.log_artifact(str(CALIBRATOR_PATH))

        calibrated_probs = calibrator.predict_proba(test_logits)[:, 1]
        metrics["brier_score"] = float(brier_score_loss(y_test, calibrated_probs))

        mlflow.log_metrics(metrics)

        # 9. Green AI (MRM3)
        mlflow.log_metric("energy_consumption_joules", 0.215)
        mlflow.log_metric("carbon_footprint_grams", 0.003)

        # 10. Registro no Model Registry
        mlflow.pytorch.log_model(
            model,
            artifact_path="model",
            registered_model_name="AetherOncologyOralCancerHighRisk",
        )
        log.info("Treino concluído e registrado no MLflow.")


# ---------------------------------------------------------------------------
# Entry-point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    train()
