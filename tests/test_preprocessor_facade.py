"""
tests/test_preprocessor_facade.py
=================================
Tests for the compatibility facade and dataset adapters.
"""

from __future__ import annotations

import warnings

import pandas as pd
import pytest

from src.features.preprocessor import (
    get_migration_stats,
    load_and_prepare_df,
    reset_migration_stats,
)
from src.ml.pipelines.preprocessing.adapters import (
    AmbiguousSchemaError,
    detect_adapter,
)
from src.ml.pipelines.preprocessing.adapters import legacy as legacy_adapter
from src.ml.pipelines.preprocessing.adapters import oral as oral_adapter
from src.ml.pipelines.preprocessing.preprocessing import (
    INFERENCE_FEATURES,
    TARGET_COLUMN,
)


@pytest.fixture
def oral_cancer_df() -> pd.DataFrame:
    data: dict[str, object] = {col: "No" for col in INFERENCE_FEATURES}
    data["Age"] = 50
    data["Gender"] = "Male"
    data["Country"] = "Brazil"
    data["Diet"] = "Moderate"
    data[TARGET_COLUMN] = "Yes"
    return pd.DataFrame([data, {**data, TARGET_COLUMN: "No"}])


@pytest.fixture
def legacy_df() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "ID": 1,
                "Country": "Brazil",
                "Gender": "Male",
                "Age": 55,
                "Tobacco_Use": 1,
                "Alcohol_Use": 0,
                "Socioeconomic_Status": "Middle",
                "Diagnosis_Stage": "Moderate",
                "Treatment_Type": "Surgery",
                "Survival_Rate": 0.7,
                "HPV_Related": 0,
            },
            {
                "ID": 2,
                "Country": "India",
                "Gender": "Female",
                "Age": 40,
                "Tobacco_Use": 0,
                "Alcohol_Use": 0,
                "Socioeconomic_Status": "Low",
                "Diagnosis_Stage": "Early",
                "Treatment_Type": "Chemotherapy",
                "Survival_Rate": 0.9,
                "HPV_Related": 1,
            },
        ]
    )


@pytest.fixture(autouse=True)
def _reset_telemetry():
    reset_migration_stats()
    yield
    reset_migration_stats()


class TestAdapterDetection:
    def test_oral_adapter_detected(self, oral_cancer_df):
        assert oral_adapter.detect(oral_cancer_df) is True
        assert legacy_adapter.detect(oral_cancer_df) is False

    def test_legacy_adapter_detected(self, legacy_df):
        assert legacy_adapter.detect(legacy_df) is True
        assert oral_adapter.detect(legacy_df) is False

    def test_detect_adapter_returns_oral(self, oral_cancer_df):
        adapter = detect_adapter(oral_cancer_df)
        assert adapter is oral_adapter

    def test_detect_adapter_returns_legacy(self, legacy_df):
        adapter = detect_adapter(legacy_df)
        assert adapter is legacy_adapter

    def test_ambiguous_raises(self, oral_cancer_df):
        df = oral_cancer_df.copy()
        df["Diagnosis_Stage"] = "Moderate"
        with pytest.raises(AmbiguousSchemaError, match="BOTH"):
            detect_adapter(df)

    def test_unrecognised_raises(self):
        df = pd.DataFrame({"foo": [1, 2], "bar": [3, 4]})
        with pytest.raises(AmbiguousSchemaError, match="NEITHER"):
            detect_adapter(df)


class TestOralAdapter:
    def test_prepare_returns_correct_features(self, oral_cancer_df):
        X, y = oral_adapter.prepare(oral_cancer_df)
        assert list(X.columns) == INFERENCE_FEATURES
        assert X.shape == (2, len(INFERENCE_FEATURES))
        assert y.tolist() == [1, 0]

    def test_get_feature_order(self):
        assert oral_adapter.get_feature_order() == INFERENCE_FEATURES

    def test_get_target(self):
        assert oral_adapter.get_target() == TARGET_COLUMN

    def test_prepare_missing_target_raises(self):
        df = pd.DataFrame({"Age": [50]})
        with pytest.raises(ValueError, match="Target column"):
            oral_adapter.prepare(df)

    def test_prepare_missing_features_raises(self, oral_cancer_df):
        df = oral_cancer_df.drop(columns=["Tobacco_Use"])
        with pytest.raises(ValueError, match="Missing Sprint 3"):
            oral_adapter.prepare(df)

    def test_alias_mapping(self):
        data: dict[str, object] = {
            "TobaccoUse": "Yes",
            "AlcoholUse": "No",
            "HPVInfection": "No",
            "BetelQuidUse": "No",
            "ChronicSunExposure": "No",
            "PoorOralHygiene": "No",
            "FamilyHistoryOfCancer": "No",
            "CompromisedImmuneSystem": "No",
            "OralLesions": "No",
            "UnexplainedBleeding": "No",
            "DifficultySwallowing": "No",
            "WhiteOrRedPatchesInMouth": "No",
            "Age": 45,
            "Gender": "Female",
            "Country": "India",
            "Diet": "High",
            "OralCancer": "Yes",
        }
        df = pd.DataFrame([data])
        assert oral_adapter.detect(df) is True
        X, y = oral_adapter.prepare(df)
        assert "Tobacco_Use" in X.columns
        assert y.tolist() == [1]


class TestLegacyAdapter:
    def test_prepare_returns_correct_features(self, legacy_df):
        X, y = legacy_adapter.prepare(legacy_df)
        expected = legacy_adapter.LEGACY_FEATURES + ["HPV_Related"]
        assert list(X.columns) == expected
        assert y.tolist() == [1, 0]

    def test_get_feature_order(self):
        assert legacy_adapter.get_feature_order() == (
            legacy_adapter.LEGACY_FEATURES
        )

    def test_get_target(self):
        assert legacy_adapter.get_target() == "high_risk"

    def test_prepare_missing_target_raises(self):
        df = pd.DataFrame({"Age": [50]})
        with pytest.raises(ValueError, match="Legacy target column"):
            legacy_adapter.prepare(df)

    def test_prepare_missing_features_raises(self, legacy_df):
        df = legacy_df.drop(columns=["Country"])
        with pytest.raises(ValueError, match="Missing legacy feature"):
            legacy_adapter.prepare(df)

    def test_alias_mapping(self):
        df = pd.DataFrame(
            [
                {
                    "ID": 1,
                    "Country": "Brazil",
                    "Gender": "Male",
                    "Age": 55,
                    "TobaccoUse": 1,
                    "AlcoholUse": 0,
                    "SocioeconomicStatus": "Middle",
                    "DiagnosisStage": "Late",
                    "TreatmentType": "Surgery",
                    "SurvivalRate": 0.7,
                    "HPVRelated": 0,
                }
            ]
        )
        assert legacy_adapter.detect(df) is True
        X, y = legacy_adapter.prepare(df)
        assert "Tobacco_Use" in X.columns
        assert "Diagnosis_Stage" not in X.columns
        assert y.tolist() == [1]


class TestFacade:
    def test_oral_route(self, oral_cancer_df):
        X, y = load_and_prepare_df(oral_cancer_df)
        assert list(X.columns) == INFERENCE_FEATURES
        assert y.tolist() == [1, 0]

    def test_legacy_route(self, legacy_df):
        with pytest.warns(DeprecationWarning, match="legacy"):
            X, y = load_and_prepare_df(legacy_df)
        assert "Age" in X.columns
        assert y.tolist() == [1, 0]

    def test_telemetry_records_oral(self, oral_cancer_df):
        load_and_prepare_df(oral_cancer_df)
        stats = get_migration_stats()
        assert stats.get("oral") == 1
        assert stats.get("legacy", 0) == 0

    def test_telemetry_records_legacy(self, legacy_df):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", DeprecationWarning)
            load_and_prepare_df(legacy_df)
        stats = get_migration_stats()
        assert stats.get("legacy") == 1
        assert stats.get("oral", 0) == 0

    def test_telemetry_multiple_calls(self, oral_cancer_df, legacy_df):
        load_and_prepare_df(oral_cancer_df)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", DeprecationWarning)
            load_and_prepare_df(legacy_df)
        load_and_prepare_df(oral_cancer_df)
        stats = get_migration_stats()
        assert stats.get("oral") == 2
        assert stats.get("legacy") == 1

    def test_ambiguous_raises(self, oral_cancer_df):
        df = oral_cancer_df.copy()
        df["Diagnosis_Stage"] = "Moderate"
        with pytest.raises(AmbiguousSchemaError, match="BOTH"):
            load_and_prepare_df(df)

    def test_unrecognised_raises(self):
        df = pd.DataFrame({"foo": [1], "bar": [2]})
        with pytest.raises(AmbiguousSchemaError, match="NEITHER"):
            load_and_prepare_df(df)

    def test_facade_constants_preserved(self):
        from src.features.preprocessor import (
            BINARY_FEATURES,
            CATEGORICAL_FEATURES,
            NUMERIC_FEATURES,
            ORAL_CANCER_TARGET,
            SPRINT3_BINARY_FEATURES,
            SPRINT3_CATEGORICAL_FEATURES,
            SPRINT3_NUMERIC_FEATURES,
            TARGET,
        )

        assert TARGET == "high_risk"
        assert ORAL_CANCER_TARGET == TARGET_COLUMN
        assert "Age" in NUMERIC_FEATURES
        assert "Country" in CATEGORICAL_FEATURES
        assert "Tobacco_Use" in BINARY_FEATURES
        assert SPRINT3_NUMERIC_FEATURES is not None
        assert SPRINT3_CATEGORICAL_FEATURES is not None
        assert SPRINT3_BINARY_FEATURES is not None
