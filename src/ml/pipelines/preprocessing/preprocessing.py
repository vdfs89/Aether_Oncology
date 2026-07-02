"""
src/ml/pipelines/preprocessing/preprocessing.py
================================================
Feature schema and preprocessing for the oral_cancer_prediction dataset.

Dataset: Ankush Panday - oral-cancer-prediction-dataset (Kaggle, MIT).
Target: ``Oral_Cancer`` (Yes=1 / No=0), after column-name normalization.

Tier 1 - Risk factors available before diagnosis:
  Age, Gender, Country, Tobacco_Use, Alcohol_Use, HPV_Infection,
  Betel_Quid_Use, Chronic_Sun_Exposure, Poor_Oral_Hygiene,
  Family_History_of_Cancer, Compromised_Immune_System, Diet

Tier 2 - Clinical symptoms available during consultation:
  Oral_Lesions, Unexplained_Bleeding, Difficulty_Swallowing,
  White_or_Red_Patches_in_Mouth

Tier 3 - Leakage/post-diagnosis fields. These are never used for inference:
  Tumor_Size_cm, Cancer_Stage, Treatment_Type, Survival_Rate,
  Cost_of_Treatment, Economic_Burden, Early_Diagnosis
"""

from __future__ import annotations

import logging
from typing import Any

import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder, StandardScaler

logger = logging.getLogger("aether.preprocessing")

# ---------------------------------------------------------------------------
# Feature schema - oral_cancer_prediction (25-feature dataset)
# ---------------------------------------------------------------------------

NUMERIC_FEATURES: list[str] = ["Age"]

BINARY_FEATURES: list[str] = [
    "Tobacco_Use",
    "Alcohol_Use",
    "HPV_Infection",
    "Betel_Quid_Use",
    "Chronic_Sun_Exposure",
    "Poor_Oral_Hygiene",
    "Family_History_of_Cancer",
    "Compromised_Immune_System",
]

ORDINAL_FEATURES: list[str] = ["Diet"]
CATEGORICAL_FEATURES: list[str] = ["Gender", "Country"]

SYMPTOM_FEATURES: list[str] = [
    "Oral_Lesions",
    "Unexplained_Bleeding",
    "Difficulty_Swallowing",
    "White_or_Red_Patches_in_Mouth",
]

PASSTHROUGH_FEATURES: list[str] = BINARY_FEATURES + SYMPTOM_FEATURES

INFERENCE_FEATURES: list[str] = (
    NUMERIC_FEATURES
    + BINARY_FEATURES
    + ORDINAL_FEATURES
    + CATEGORICAL_FEATURES
    + SYMPTOM_FEATURES
)

LEAKAGE_FEATURES: list[str] = [
    "Tumor_Size_cm",
    "Cancer_Stage",
    "Treatment_Type",
    "Survival_Rate",
    "Cost_of_Treatment",
    "Economic_Burden",
    "Early_Diagnosis",
]

TARGET_COLUMN = "Oral_Cancer"

# Compatibility aliases used by src.features.preprocessor and older notebooks.
CLINICAL_CATEGORICAL = CATEGORICAL_FEATURES
CLINICAL_NUMERIC = NUMERIC_FEATURES
CLINICAL_PASS = PASSTHROUGH_FEATURES

_DEFAULT_VALUES: dict[str, Any] = {
    "Age": 0,
    "Diet": "Moderate",
    "Gender": "Unknown",
    "Country": "Unknown",
    **{feature: "No" for feature in BINARY_FEATURES + SYMPTOM_FEATURES},
}


# ---------------------------------------------------------------------------
# Transformers
# ---------------------------------------------------------------------------


class FeatureSchemaAligner(BaseEstimator, TransformerMixin):
    """Adds missing inference columns with deterministic defaults."""

    def __init__(
        self,
        required_columns: list[str] | None = None,
        defaults: dict[str, Any] | None = None,
        *,
        keep_extra: bool = False,
    ) -> None:
        self.required_columns = required_columns or INFERENCE_FEATURES
        self.defaults = defaults or _DEFAULT_VALUES
        self.keep_extra = keep_extra

    def fit(self, X: pd.DataFrame, y=None) -> "FeatureSchemaAligner":  # noqa: N803
        if not isinstance(X, pd.DataFrame):
            raise TypeError("FeatureSchemaAligner expects a pandas DataFrame.")
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:  # noqa: N803
        if not isinstance(X, pd.DataFrame):
            raise TypeError("FeatureSchemaAligner expects a pandas DataFrame.")

        out = X.copy()
        for column in self.required_columns:
            if column not in out.columns:
                out[column] = self.defaults.get(column, pd.NA)

        if self.keep_extra:
            return out
        return out[self.required_columns]


class BinaryYesNoEncoder(BaseEstimator, TransformerMixin):
    """Converts Yes/No-like columns to 1/0 and unknown values to -1."""

    def __init__(self, columns: list[str] | None = None) -> None:
        self.columns = columns or PASSTHROUGH_FEATURES

    def fit(self, X: pd.DataFrame, y=None) -> "BinaryYesNoEncoder":  # noqa: N803
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:  # noqa: N803
        out = X.copy()
        for col in self.columns:
            if col not in out.columns:
                continue
            out[col] = out[col].map(self._encode_value).astype(int)
        return out

    @staticmethod
    def _encode_value(value: Any) -> int:
        if pd.isna(value):
            return -1
        if isinstance(value, bool):
            return int(value)
        if isinstance(value, (int, float)) and value in {0, 1}:
            return int(value)

        normalized = str(value).strip().lower()
        if normalized in {"yes", "y", "true", "t", "1"}:
            return 1
        if normalized in {"no", "n", "false", "f", "0"}:
            return 0
        return -1


class RiskIndexBuilder(BaseEstimator, TransformerMixin):
    """
    Builds ``risk_index`` as a weighted sum of Tier 1 risk factors.

    Weights are intentionally transparent and literature-aligned, so model
    cards can explain the engineered feature without reverse engineering.
    """

    WEIGHTS: dict[str, float] = {
        "Tobacco_Use": 2.0,
        "Alcohol_Use": 1.5,
        "HPV_Infection": 1.5,
        "Betel_Quid_Use": 2.0,
        "Poor_Oral_Hygiene": 0.5,
        "Compromised_Immune_System": 1.0,
        "Family_History_of_Cancer": 0.5,
        "Chronic_Sun_Exposure": 0.5,
    }

    def fit(self, X: pd.DataFrame, y=None) -> "RiskIndexBuilder":  # noqa: N803
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:  # noqa: N803
        out = X.copy()
        risk_index = pd.Series(0.0, index=out.index)
        for col, weight in self.WEIGHTS.items():
            if col in out.columns:
                risk_index = risk_index + out[col].clip(lower=0).astype(float) * weight
        out["risk_index"] = risk_index
        return out


class SymptomBurdenBuilder(BaseEstimator, TransformerMixin):
    """Builds ``symptom_burden`` as the count of present Tier 2 symptoms."""

    def fit(self, X: pd.DataFrame, y=None) -> "SymptomBurdenBuilder":  # noqa: N803
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:  # noqa: N803
        out = X.copy()
        symptom_cols = [col for col in SYMPTOM_FEATURES if col in out.columns]
        if symptom_cols:
            out["symptom_burden"] = out[symptom_cols].clip(lower=0).sum(axis=1)
        else:
            out["symptom_burden"] = 0
        return out


class ClinicalFeatureExtractor(BaseEstimator, TransformerMixin):
    """
    Backward-compatible feature extractor used by older benchmark code.

    New training should prefer ``build_preprocessing_pipeline``. This class
    preserves the legacy derived fields while adding Sprint 3 risk/symptom
    features.
    """

    def __init__(self) -> None:
        self._schema = FeatureSchemaAligner(keep_extra=True)
        self._binary = BinaryYesNoEncoder()
        self._risk = RiskIndexBuilder()
        self._symptoms = SymptomBurdenBuilder()

    def fit(self, X: pd.DataFrame, y=None) -> "ClinicalFeatureExtractor":  # noqa: N803
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:  # noqa: N803
        out = self._schema.transform(X)
        out = self._binary.transform(out)
        out = self._risk.transform(out)
        out = self._symptoms.transform(out)

        if "Age" in out.columns:
            age_bins = [0, 30, 45, 60, 150]
            age_labels = ["18-30", "31-45", "46-60", "61+"]
            out["age_bucket"] = pd.cut(
                pd.to_numeric(out["Age"], errors="coerce").fillna(0),
                bins=age_bins,
                labels=age_labels,
                include_lowest=True,
            ).astype(str)

        high_incidence_countries = {
            "Vietnam",
            "Mexico",
            "South Africa",
            "India",
            "Pakistan",
            "Tanzania",
            "Russia",
            "Nigeria",
            "DR Congo",
            "United Kingdom",
            "Germany",
            "Philippines",
        }
        out["high_incidence_country"] = out["Country"].apply(
            lambda country: int(country in high_incidence_countries)
        )
        return out


def build_preprocessing_pipeline() -> Pipeline:
    """
    Builds the sklearn preprocessing pipeline for the 25-feature dataset.

    The pipeline excludes all Tier 3 leakage fields by construction and keeps
    only Tier 1 + Tier 2 fields for inference.
    """

    numeric_out = NUMERIC_FEATURES + ["risk_index", "symptom_burden"]
    diet_categories = [["Low", "Moderate", "High"]]

    col_transformer = ColumnTransformer(
        transformers=[
            (
                "ordinal_diet",
                OrdinalEncoder(
                    categories=diet_categories,
                    handle_unknown="use_encoded_value",
                    unknown_value=-1,
                ),
                ORDINAL_FEATURES,
            ),
            (
                "ohe_cat",
                OneHotEncoder(
                    handle_unknown="ignore",
                    sparse_output=False,
                    drop="first",
                ),
                CATEGORICAL_FEATURES,
            ),
            ("scaler", StandardScaler(), numeric_out),
        ],
        remainder="passthrough",
        verbose_feature_names_out=False,
    )

    return Pipeline(
        steps=[
            ("schema", FeatureSchemaAligner()),
            ("binary_encoder", BinaryYesNoEncoder()),
            ("risk_index", RiskIndexBuilder()),
            ("symptom_burden", SymptomBurdenBuilder()),
            ("col_transformer", col_transformer),
        ]
    )


def build_clinical_preprocessor() -> Pipeline:
    """Compatibility wrapper used by older code paths."""

    return build_preprocessing_pipeline()
