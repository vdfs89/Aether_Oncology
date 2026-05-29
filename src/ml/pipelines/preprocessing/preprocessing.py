from __future__ import annotations

import logging

import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

logger = logging.getLogger("aether.preprocessing")

# Feature lists
NUMERIC_FEATURES = ["Age", "Survival_Rate", "risk_index"]
CATEGORICAL_FEATURES = [
    "Country",
    "Gender",
    "Socioeconomic_Status",
    "Treatment_Type",
    "age_bucket",
]
PASSTHROUGH_FEATURES = ["high_incidence_country", "Tobacco_Use", "Alcohol_Use"]


class ClinicalFeatureExtractor(BaseEstimator, TransformerMixin):
    """
    Hospital-grade transformer for derived clinical features.
    Ensures deterministic calculations and full ANVISA/FDA auditable lineage.
    """

    def fit(self, X: pd.DataFrame, y=None) -> ClinicalFeatureExtractor:
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        X_out = X.copy()

        # 1. Map tobacco and alcohol to binary 0/1
        def to_binary(val):
            if isinstance(val, str):
                return 1 if val.lower() == "yes" else 0
            if pd.isna(val):
                return 0
            return 1 if val == 1 else 0

        # Calculate risk_index
        tobacco = (
            X_out["Tobacco_Use"].map(to_binary)
            if "Tobacco_Use" in X_out.columns
            else pd.Series(0, index=X_out.index)
        )
        alcohol = (
            X_out["Alcohol_Use"].map(to_binary)
            if "Alcohol_Use" in X_out.columns
            else pd.Series(0, index=X_out.index)
        )
        hpv = (
            X_out["HPV_Related"].map(to_binary)
            if "HPV_Related" in X_out.columns
            else pd.Series(0, index=X_out.index)
        )

        X_out["risk_index"] = tobacco + alcohol + hpv

        # Keep tobacco/alcohol as 0/1 for binary passthrough modeling
        X_out["Tobacco_Use"] = tobacco
        X_out["Alcohol_Use"] = alcohol

        # 2. age_bucket
        age_bins = [0, 30, 45, 60, 150]
        age_labels = ["18-30", "31-45", "46-60", "61+"]
        X_out["age_bucket"] = pd.cut(
            X_out["Age"], bins=age_bins, labels=age_labels
        ).astype(str)

        # 3. high_incidence_country
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
        X_out["high_incidence_country"] = X_out["Country"].apply(
            lambda c: 1 if c in high_incidence_countries else 0
        )

        return X_out


def build_clinical_preprocessor() -> Pipeline:
    """
    Builds the complete clinical preprocessing pipeline:
    Extractor -> ColumnTransformer (StandardScaler + OneHotEncoder)
    """
    col_transformer = ColumnTransformer(
        transformers=[
            (
                "num",
                StandardScaler(),
                NUMERIC_FEATURES,
            ),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CATEGORICAL_FEATURES,
            ),
            (
                "pass",
                "passthrough",
                PASSTHROUGH_FEATURES,
            ),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )

    return Pipeline(
        [("extractor", ClinicalFeatureExtractor()), ("preprocessor", col_transformer)]
    )
