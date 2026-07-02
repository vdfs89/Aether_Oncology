"""
src/ml_platform/train_oral_cancer.py
====================================
Training pipeline for the oral_cancer_prediction 25-feature dataset.

Usage:
    python -m src.ml_platform.train_oral_cancer \
        --data data/raw/oral_cancer_prediction.csv \
        --output models/oral_cancer_v1.pkl
"""

from __future__ import annotations

import argparse
import json
import logging
import pickle
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    classification_report,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline

from src.ml.pipelines.preprocessing.preprocessing import (
    INFERENCE_FEATURES,
    LEAKAGE_FEATURES,
    TARGET_COLUMN,
    build_preprocessing_pipeline,
)

logger = logging.getLogger("aether.train_oral_cancer")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

SEED = 42
CV_FOLDS = 5
REPORT_PATH = Path("reports/benchmark_25features.json")


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalizes Kaggle column names to Python-safe project names."""

    out = df.copy()
    out.columns = (
        out.columns.str.strip()
        .str.replace(r"[\s\(\)&/]", "_", regex=True)
        .str.replace(r"_+", "_", regex=True)
        .str.rstrip("_")
    )
    return out


def load_and_validate(data_path: str | Path) -> pd.DataFrame:
    """Loads the CSV and validates the minimum Sprint 3 schema."""

    df = normalize_columns(pd.read_csv(data_path))
    logger.info("Dataset loaded: shape=%s", df.shape)
    logger.info("Normalized columns: %s", list(df.columns))

    missing_required = set(INFERENCE_FEATURES + [TARGET_COLUMN]) - set(df.columns)
    if missing_required:
        raise ValueError(
            "Missing required columns in the dataset: "
            f"{sorted(missing_required)}. "
            "Check that the CSV is the 25-feature oral_cancer_prediction dataset."
        )

    leakage_present = sorted(set(LEAKAGE_FEATURES).intersection(df.columns))
    if leakage_present:
        logger.info("Leakage columns present and excluded: %s", leakage_present)

    return df


def encode_target(series: pd.Series) -> pd.Series:
    """Converts the Oral_Cancer target to binary 1/0."""

    normalized = series.astype(str).str.strip().str.lower()
    y = normalized.map({"yes": 1, "no": 0, "1": 1, "0": 0, "true": 1, "false": 0})
    if y.isna().any():
        raise ValueError(
            f"Target `{TARGET_COLUMN}` contains invalid values: {series.unique()}"
        )
    return y.astype(int)


def prepare_xy(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """Extracts inference features and binary target."""

    X = df[INFERENCE_FEATURES].copy()
    y = encode_target(df[TARGET_COLUMN])

    logger.info(
        "Target prevalence: %.4f (positives=%d / total=%d)",
        y.mean(),
        int(y.sum()),
        len(y),
    )
    return X, y


def build_candidate_models(seed: int = SEED) -> dict[str, Any]:
    """Returns transparent tabular baselines for Sprint 3 benchmarking."""

    return {
        "logistic_regression": LogisticRegression(
            max_iter=1000,
            random_state=seed,
            class_weight="balanced",
        ),
        "random_forest": RandomForestClassifier(
            n_estimators=300,
            min_samples_leaf=2,
            random_state=seed,
            class_weight="balanced",
            n_jobs=-1,
        ),
        "gradient_boosting": GradientBoostingClassifier(random_state=seed),
    }


def build_model_pipeline(model: Any) -> Pipeline:
    """Combines Sprint 3 preprocessing with a candidate estimator."""

    return Pipeline(
        steps=[
            ("preprocessing", build_preprocessing_pipeline()),
            ("model", model),
        ]
    )


def benchmark_models(
    X: pd.DataFrame,
    y: pd.Series,
    *,
    cv_folds: int = CV_FOLDS,
    seed: int = SEED,
    primary_metric: str = "roc_auc",
) -> tuple[dict[str, dict[str, float]], str]:
    """Runs stratified CV and returns aggregate metrics plus the best model."""

    cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=seed)
    scoring = {
        "roc_auc": "roc_auc",
        "average_precision": "average_precision",
        "recall": "recall",
        "f1": "f1",
        "accuracy": "accuracy",
    }

    results: dict[str, dict[str, float]] = {}
    for name, model in build_candidate_models(seed).items():
        pipeline = build_model_pipeline(model)
        scores = cross_validate(
            pipeline,
            X,
            y,
            scoring=scoring,
            cv=cv,
            n_jobs=-1,
            error_score="raise",
        )
        model_result: dict[str, float] = {}
        for metric_name in scoring:
            values = scores[f"test_{metric_name}"]
            model_result[f"{metric_name}_mean"] = float(np.mean(values))
            model_result[f"{metric_name}_std"] = float(np.std(values))
        results[name] = model_result
        logger.info("%s CV: %s", name, model_result)

    metric_key = f"{primary_metric}_mean"
    best_name = max(results, key=lambda model_name: results[model_name][metric_key])
    logger.info("Selected model: %s by %s", best_name, metric_key)
    return results, best_name


def evaluate_holdout(pipeline: Pipeline, X_test: pd.DataFrame, y_test: pd.Series) -> dict:
    """Computes holdout metrics for the selected model."""

    y_score = pipeline.predict_proba(X_test)[:, 1]
    y_pred = (y_score >= 0.5).astype(int)
    return {
        "roc_auc": float(roc_auc_score(y_test, y_score)),
        "average_precision": float(average_precision_score(y_test, y_score)),
        "classification_report": classification_report(
            y_test,
            y_pred,
            output_dict=True,
            zero_division=0,
        ),
    }


def train(
    data_path: str | Path,
    output_path: str | Path,
    *,
    report_path: str | Path = REPORT_PATH,
    cv_folds: int = CV_FOLDS,
    seed: int = SEED,
    primary_metric: str = "roc_auc",
) -> dict:
    """Runs the full Sprint 3 training pipeline and writes artifacts."""

    df = load_and_validate(data_path)
    X, y = prepare_xy(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        stratify=y,
        random_state=seed,
    )

    cv_results, best_name = benchmark_models(
        X_train,
        y_train,
        cv_folds=cv_folds,
        seed=seed,
        primary_metric=primary_metric,
    )

    selected_model = build_candidate_models(seed)[best_name]
    selected_pipeline = build_model_pipeline(selected_model)
    selected_pipeline.fit(X_train, y_train)
    holdout_metrics = evaluate_holdout(selected_pipeline, X_test, y_test)

    final_pipeline = build_model_pipeline(build_candidate_models(seed)[best_name])
    final_pipeline.fit(X, y)

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    artifact = {
        "pipeline": final_pipeline,
        "selected_model": best_name,
        "target": TARGET_COLUMN,
        "features": INFERENCE_FEATURES,
        "excluded_leakage_features": LEAKAGE_FEATURES,
        "cv_results": cv_results,
        "holdout_metrics": holdout_metrics,
    }
    with output_path.open("wb") as f:
        pickle.dump(artifact, f)

    report = {
        "dataset": {
            "path": str(data_path),
            "rows": int(len(df)),
            "columns": int(df.shape[1]),
            "target_prevalence": float(y.mean()),
        },
        "selected_model": best_name,
        "primary_metric": primary_metric,
        "features": INFERENCE_FEATURES,
        "excluded_leakage_features": [
            feature for feature in LEAKAGE_FEATURES if feature in df.columns
        ],
        "cv_results": cv_results,
        "holdout_metrics": holdout_metrics,
        "artifact_path": str(output_path),
    }

    report_path = Path(report_path)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    logger.info("Model artifact saved: %s", output_path)
    logger.info("Benchmark report saved: %s", report_path)
    return report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--data",
        required=True,
        help="Path to oral_cancer_prediction.csv.",
    )
    parser.add_argument(
        "--output",
        default="models/oral_cancer_v1.pkl",
        help="Path for the serialized model artifact.",
    )
    parser.add_argument(
        "--report",
        default=str(REPORT_PATH),
        help="Path for the JSON benchmark report.",
    )
    parser.add_argument("--cv-folds", type=int, default=CV_FOLDS)
    parser.add_argument("--seed", type=int, default=SEED)
    parser.add_argument(
        "--primary-metric",
        choices=["roc_auc", "average_precision", "recall", "f1", "accuracy"],
        default="roc_auc",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    train(
        data_path=args.data,
        output_path=args.output,
        report_path=args.report,
        cv_folds=args.cv_folds,
        seed=args.seed,
        primary_metric=args.primary_metric,
    )


if __name__ == "__main__":
    main()
