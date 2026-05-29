"""
src/features/preprocessor.py
=============================
Facade wrapping Aether Oncology v3.1 Clinical Preprocessing.
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from src.ml.pipelines.preprocessing.preprocessing import (
    CATEGORICAL_FEATURES as CLINICAL_CATEGORICAL,
)
from src.ml.pipelines.preprocessing.preprocessing import (
    NUMERIC_FEATURES as CLINICAL_NUMERIC,
)
from src.ml.pipelines.preprocessing.preprocessing import (
    PASSTHROUGH_FEATURES as CLINICAL_PASS,
)
from src.ml.pipelines.preprocessing.preprocessing import (
    build_clinical_preprocessor as build_preprocessor,  # noqa: F401
)

logger = logging.getLogger("aether.preprocessor")

# Keep these constants for test compatibility, updated to reflect the new feature set
NUMERIC_FEATURES = CLINICAL_NUMERIC
CATEGORICAL_FEATURES = CLINICAL_CATEGORICAL
BINARY_FEATURES = CLINICAL_PASS

TARGET = "high_risk"


def load_and_prepare(path: str) -> tuple[pd.DataFrame, np.ndarray]:
    """
    Loads raw CSV and prepares X and y.
    Note: Categorical mappings and derived features are now handled downstream
    by the ClinicalFeatureExtractor in the preprocessing pipeline.
    """
    df = pd.read_csv(path)
    logger.info("Dataset loaded: %s", str(df.shape))

    # Derive binary high-risk target
    df[TARGET] = df["Diagnosis_Stage"].isin(["Moderate", "Late"]).astype(int)

    # We pass the raw feature columns to the pipeline, which handles scaling/encoding
    feature_cols = [
        "Age",
        "Survival_Rate",
        "Tobacco_Use",
        "Alcohol_Use",
        "Country",
        "Gender",
        "Socioeconomic_Status",
        "Treatment_Type",
    ]
    if "HPV_Related" in df.columns:
        feature_cols.append("HPV_Related")

    X = df[feature_cols]
    y = df[TARGET].values

    return X, y
