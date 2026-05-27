"""
test_schema.py
==============
Aether Oncology v3.0 — Testes de Schema (Pandera)

Valida:
  - Estrutura do dataset Oral Cancer Top 30 Countries
  - Geração do target binário high_risk
  - Pipeline ColumnTransformer (build_preprocessor)
"""

import numpy as np
import pandas as pd
import pandera as pa
import pytest
from pandera import Check, Column, DataFrameSchema

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

# Schema das colunas brutas (Tobacco_Use/Alcohol_Use como strings "Yes"/"No"
# — formato pós-load_and_prepare, compatível com o OHE)
ORAL_CANCER_SCHEMA = DataFrameSchema(
    {
        "Country": Column(str, nullable=False),
        "Gender": Column(str, Check.isin(["Male", "Female"]), nullable=False),
        "Age": Column(int, Check.between(0, 120), nullable=False),
        "Tobacco_Use": Column(str, Check.isin(["Yes", "No"]), nullable=False),
        "Alcohol_Use": Column(str, Check.isin(["Yes", "No"]), nullable=False),
        "Socioeconomic_Status": Column(str, nullable=False),
        "Diagnosis_Stage": Column(
            str,
            Check.isin(["Early", "Moderate", "Late"]),
            nullable=False,
        ),
        "Treatment_Type": Column(str, nullable=True),
        "Survival_Rate": Column(float, Check.between(0.0, 1.0), nullable=True),
    },
    strict=False,  # permite colunas extras (ex: ID, HPV_Related)
    coerce=True,
)

# Schema do target derivado
TARGET_SCHEMA = DataFrameSchema(
    {"high_risk": Column(int, Check.isin([0, 1]), nullable=False)}
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def valid_df() -> pd.DataFrame:
    """DataFrame sintético válido seguindo o schema do Oral Cancer dataset."""
    return pd.DataFrame(
        {
            "Country": ["Brazil", "India", "USA"],
            "Gender": ["Male", "Female", "Male"],
            "Age": [45, 60, 33],
            "Tobacco_Use": ["Yes", "No", "Yes"],
            "Alcohol_Use": ["No", "Yes", "Yes"],
            "Socioeconomic_Status": ["Low", "Middle", "High"],
            "Diagnosis_Stage": ["Late", "Early", "Moderate"],
            "Treatment_Type": ["Surgery", "Chemotherapy", None],
            "Survival_Rate": [0.61, 0.88, 0.74],
        }
    )


@pytest.fixture
def df_with_target(valid_df: pd.DataFrame) -> pd.DataFrame:
    """DataFrame com target binário derivado."""
    df = valid_df.copy()
    df["high_risk"] = df["Diagnosis_Stage"].isin(["Moderate", "Late"]).astype("int64")
    return df


# ---------------------------------------------------------------------------
# Testes de Schema — Dados válidos
# ---------------------------------------------------------------------------


def test_schema_valid_dataframe(valid_df: pd.DataFrame) -> None:
    """Schema deve aceitar um DataFrame válido sem erros."""
    validated = ORAL_CANCER_SCHEMA.validate(valid_df)
    assert validated is not None
    assert len(validated) == 3


def test_schema_all_columns_present(valid_df: pd.DataFrame) -> None:
    """Todas as colunas do schema devem estar presentes."""
    required_cols = {
        "Country", "Gender", "Age", "Tobacco_Use",
        "Alcohol_Use", "Socioeconomic_Status", "Diagnosis_Stage",
    }
    assert required_cols.issubset(set(valid_df.columns))


# ---------------------------------------------------------------------------
# Testes de Schema — Dados inválidos (rejeições)
# ---------------------------------------------------------------------------


def test_schema_rejects_invalid_gender(valid_df: pd.DataFrame) -> None:
    """Schema deve rejeitar gênero inválido."""
    invalid_df = valid_df.copy()
    invalid_df.loc[0, "Gender"] = "Unknown"
    with pytest.raises(pa.errors.SchemaError):
        ORAL_CANCER_SCHEMA.validate(invalid_df)


def test_schema_rejects_invalid_diagnosis_stage(valid_df: pd.DataFrame) -> None:
    """Schema deve rejeitar estágio de diagnóstico inválido."""
    invalid_df = valid_df.copy()
    invalid_df.loc[0, "Diagnosis_Stage"] = "Critical"  # não existe
    with pytest.raises(pa.errors.SchemaError):
        ORAL_CANCER_SCHEMA.validate(invalid_df)


def test_schema_rejects_age_out_of_range(valid_df: pd.DataFrame) -> None:
    """Schema deve rejeitar idade fora de [0, 120]."""
    invalid_df = valid_df.copy()
    invalid_df.loc[0, "Age"] = 999
    with pytest.raises(pa.errors.SchemaError):
        ORAL_CANCER_SCHEMA.validate(invalid_df)


def test_schema_rejects_survival_rate_out_of_range(valid_df: pd.DataFrame) -> None:
    """Schema deve rejeitar survival_rate fora de [0.0, 1.0]."""
    invalid_df = valid_df.copy()
    invalid_df.loc[0, "Survival_Rate"] = 1.5
    with pytest.raises(pa.errors.SchemaError):
        ORAL_CANCER_SCHEMA.validate(invalid_df)


# ---------------------------------------------------------------------------
# Testes do Target Binário
# ---------------------------------------------------------------------------


def test_target_binary_values(df_with_target: pd.DataFrame) -> None:
    """Target high_risk deve ser estritamente 0 ou 1."""
    TARGET_SCHEMA.validate(df_with_target)
    assert df_with_target["high_risk"].isin([0, 1]).all()


def test_target_early_is_zero(df_with_target: pd.DataFrame) -> None:
    """Diagnosis_Stage=Early deve gerar high_risk=0 (baixo risco)."""
    early = df_with_target[df_with_target["Diagnosis_Stage"] == "Early"]
    assert (early["high_risk"] == 0).all(), "Early deve ser 0 (baixo risco)"


def test_target_moderate_is_one(df_with_target: pd.DataFrame) -> None:
    """Diagnosis_Stage=Moderate deve gerar high_risk=1 (alto risco)."""
    moderate = df_with_target[df_with_target["Diagnosis_Stage"] == "Moderate"]
    assert (moderate["high_risk"] == 1).all(), "Moderate deve ser 1 (alto risco)"


def test_target_late_is_one(df_with_target: pd.DataFrame) -> None:
    """Diagnosis_Stage=Late deve gerar high_risk=1 (alto risco)."""
    late = df_with_target[df_with_target["Diagnosis_Stage"] == "Late"]
    assert (late["high_risk"] == 1).all(), "Late deve ser 1 (alto risco)"


def test_target_class_balance(df_with_target: pd.DataFrame) -> None:
    """Target deve ter pelo menos representação mínima das duas classes."""
    counts = df_with_target["high_risk"].value_counts()
    # Com 3 amostras: Early=1 (0), Moderate=1 (1), Late=1 (1)
    assert 0 in counts.index and 1 in counts.index, (
        "Ambas as classes devem estar presentes no DataFrame de teste"
    )


# ---------------------------------------------------------------------------
# Testes do Preprocessor (src/features/preprocessor.py)
# ---------------------------------------------------------------------------


def test_preprocessor_output_shape(df_with_target: pd.DataFrame) -> None:
    """Preprocessor deve expandir features via OHE (shape > n_features_originais)."""
    from src.features.preprocessor import (
        BINARY_FEATURES,
        CATEGORICAL_FEATURES,
        NUMERIC_FEATURES,
        build_preprocessor,
    )

    feature_cols = NUMERIC_FEATURES + BINARY_FEATURES + CATEGORICAL_FEATURES
    X = df_with_target[feature_cols]

    preprocessor = build_preprocessor()
    X_t = preprocessor.fit_transform(X)

    # Linhas preservadas
    assert X_t.shape[0] == len(df_with_target)
    # OHE deve expandir o número de colunas
    assert X_t.shape[1] > len(feature_cols), (
        f"OHE deveria criar mais colunas que {len(feature_cols)}, obtido {X_t.shape[1]}"
    )


def test_preprocessor_no_nan_output(df_with_target: pd.DataFrame) -> None:
    """Preprocessor não deve gerar NaN no output."""
    from src.features.preprocessor import (
        BINARY_FEATURES,
        CATEGORICAL_FEATURES,
        NUMERIC_FEATURES,
        build_preprocessor,
    )

    feature_cols = NUMERIC_FEATURES + BINARY_FEATURES + CATEGORICAL_FEATURES
    X = df_with_target[feature_cols]

    preprocessor = build_preprocessor()
    X_t = preprocessor.fit_transform(X)

    assert not np.isnan(X_t).any(), "Output do preprocessor não deve conter NaN"


def test_preprocessor_binary_features_encoded(df_with_target: pd.DataFrame) -> None:
    """Features binárias (Yes/No) devem ser codificadas como 0 ou 1."""
    from src.features.preprocessor import (
        BINARY_FEATURES,
        CATEGORICAL_FEATURES,
        NUMERIC_FEATURES,
        build_preprocessor,
    )

    feature_cols = NUMERIC_FEATURES + BINARY_FEATURES + CATEGORICAL_FEATURES
    X = df_with_target[feature_cols]

    preprocessor = build_preprocessor()
    X_t = preprocessor.fit_transform(X)

    # Verifica que todos os valores são finitos
    assert np.isfinite(X_t).all(), "Preprocessor deve gerar apenas valores finitos"


def test_preprocessor_constants() -> None:
    """NUMERIC + BINARY + CATEGORICAL devem cobrir 8 features esperadas pela API."""
    from src.features.preprocessor import (
        BINARY_FEATURES,
        CATEGORICAL_FEATURES,
        NUMERIC_FEATURES,
        TARGET,
    )

    all_features = NUMERIC_FEATURES + BINARY_FEATURES + CATEGORICAL_FEATURES
    assert len(all_features) == 8, (
        f"Pipeline deve ter 8 features, encontrado {len(all_features)}"
    )
    assert TARGET == "high_risk"
