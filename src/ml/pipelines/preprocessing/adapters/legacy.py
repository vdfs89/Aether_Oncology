"""
Adapter for the legacy oral_cancer_top30 dataset (11 features).

Dataset: Oral Cancer Top 30 Countries (160k records, MIT License).
Target: ``high_risk`` derived from ``Diagnosis_Stage``
        (0 = Early, 1 = Moderate/Late).

This adapter preserves the legacy feature contract consumed by
``src/train.py`` and older notebooks. It maps the 8 core features plus
optional ``HPV_Related`` into the order expected by the legacy
ColumnTransformer.
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from src.ml.pipelines.preprocessing.adapters._common import (
    apply_alias_mapping,
    normalize_column_names,
)

logger = logging.getLogger("aether.adapters.legacy")

TARGET = "high_risk"
LEGACY_TARGET_COLUMN = "Diagnosis_Stage"

# Canonical 8-feature order used by the legacy pipeline.
LEGACY_FEATURES: list[str] = [
    "Age",
    "Survival_Rate",
    "Tobacco_Use",
    "Alcohol_Use",
    "Country",
    "Gender",
    "Socioeconomic_Status",
    "Treatment_Type",
]

# Optional feature present in some versions of the legacy dataset.
OPTIONAL_FEATURES: list[str] = ["HPV_Related"]

# Aliases for legacy column names.
_ALIASES: dict[str, list[str]] = {
    "Diagnosis_Stage": [
        "DiagnosisStage",
        "diagnosis_stage",
        "Diagnosis Stage",
        "Stage",
    ],
    "Survival_Rate": ["SurvivalRate", "survival_rate", "Survival"],
    "Tobacco_Use": ["TobaccoUse", "tobacco_use", "Tobacco"],
    "Alcohol_Use": ["AlcoholUse", "alcohol_use", "Alcohol"],
    "Socioeconomic_Status": [
        "SocioeconomicStatus",
        "socioeconomic_status",
        "Socioeconomic",
    ],
    "Treatment_Type": ["TreatmentType", "treatment_type", "Treatment"],
    "HPV_Related": ["HPVRelated", "hpv_related", "HPV"],
}


def detect(df: pd.DataFrame) -> bool:
    """
    Returns True when ``df`` looks like the legacy top-30 dataset.

    Detection rule: ``Diagnosis_Stage`` is present AND at least 6 of the
    8 canonical legacy features are present (allowing for alias variants).
    """
    normalized = normalize_column_names(df)
    normalized = apply_alias_mapping(normalized, _ALIASES)

    if LEGACY_TARGET_COLUMN not in normalized.columns:
        return False

    present = sum(1 for f in LEGACY_FEATURES if f in normalized.columns)
    return present >= 6


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names and apply alias mapping for the legacy dataset."""
    out = normalize_column_names(df)
    out = apply_alias_mapping(out, _ALIASES)
    return out


def _derive_target(df: pd.DataFrame) -> pd.DataFrame:
    """Derives the binary ``high_risk`` target from ``Diagnosis_Stage``."""
    out = df.copy()
    if LEGACY_TARGET_COLUMN not in out.columns:
        raise ValueError(
            f"Legacy target column `{LEGACY_TARGET_COLUMN}` not found."
        )
    mask = out[LEGACY_TARGET_COLUMN].isin(["Moderate", "Late"])
    out[TARGET] = mask.astype(int)
    return out


def prepare(df: pd.DataFrame) -> tuple[pd.DataFrame, np.ndarray]:
    """
    Prepare X, y for the legacy preprocessing pipeline.

    Raises ``ValueError`` when required legacy columns are missing.
    """
    out = normalize_columns(df)
    out = _derive_target(out)

    missing = set(LEGACY_FEATURES) - set(out.columns)
    if missing:
        raise ValueError(
            f"Missing legacy feature columns: {sorted(missing)}"
        )

    feature_cols = list(LEGACY_FEATURES)
    for opt in OPTIONAL_FEATURES:
        if opt in out.columns:
            feature_cols.append(opt)

    X = out[feature_cols]
    y = out[TARGET].to_numpy()
    return X, y


def get_feature_order() -> list[str]:
    """Returns the canonical feature order for the legacy pipeline."""
    return list(LEGACY_FEATURES)


def get_target() -> str:
    """Returns the target column name for the legacy dataset."""
    return TARGET