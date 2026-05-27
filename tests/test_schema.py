"""
test_schema.py
==============
Testes de contrato de dados usando Pandera.

Garante que o dataset bruto (data/raw/oral_cancer_top30.csv) respeite os tipos
e restrições esperadas pelo pipeline de treino. Se o dataset mudar no futuro
(novas colunas, valores negativos inesperados, etc.), estes testes "quebram"
exactamente onde o problema está — evitando falhas silenciosas no treino.

Requisito: data/raw/oral_cancer_top30.csv deve existir com as colunas
           do Oral Cancer Top 30 Countries dataset + coluna 'high_risk'.
"""

from __future__ import annotations

import pandas as pd
import pandera.pandas as pa
import pytest
from pandera.pandas import Check, Column, DataFrameSchema

# ---------------------------------------------------------------------------
# Schema Oral Cancer Top 30 Countries — colunas raw + target derivado
# ---------------------------------------------------------------------------

ORAL_CANCER_SCHEMA = DataFrameSchema(
    columns={
        # ── Identificadores e Demográficos ────────────────────────────────
        "Country": Column(str, nullable=False),
        "Gender": Column(str, Check.isin(["Male", "Female"]), nullable=False),
        "Age": Column(int, Check.between(0, 120), nullable=False),
        # ── Fatores de Risco — armazenados como inteiros 0/1 no dataset ──
        "Tobacco_Use": Column(int, Check.isin([0, 1]), nullable=False),
        "Alcohol_Use": Column(int, Check.isin([0, 1]), nullable=False),
        "HPV_Related": Column(int, Check.isin([0, 1]), nullable=False),
        # ── Contexto Socioeconômico ───────────────────────────────────────
        "Socioeconomic_Status": Column(
            str, Check.isin(["High", "Middle", "Low"]), nullable=False
        ),
        # ── Dados Clínicos ────────────────────────────────────────────────
        "Diagnosis_Stage": Column(
            str, Check.isin(["Early", "Moderate", "Late"]), nullable=False
        ),
        "Treatment_Type": Column(str, nullable=True),
        "Survival_Rate": Column(float, Check.between(0.0, 1.0), nullable=True),
        # ── Target binário derivado (alto risco) ──────────────────────────
        "high_risk": Column(int, Check.isin([0, 1]), nullable=False),
    },
    strict=False,  # permite colunas extras (ex.: 'ID') sem falhar
    coerce=True,   # tenta converter tipos antes de validar
)

RAW_DATA_PATH = "data/raw/oral_cancer_top30.csv"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _load_with_target(path: str, n: int | None = 50) -> pd.DataFrame:
    """Carrega o CSV e cria o target binário high_risk antes da validação."""
    df = pd.read_csv(path)
    if n is not None:
        df = df.head(n)
    # Target binário: triagem de alto risco
    # Diagnóstico Precoce (Early) → Baixo risco → 0
    # Diagnóstico Moderado/Tardio (Moderate/Late) → Alto risco → 1
    df["high_risk"] = df["Diagnosis_Stage"].isin(["Moderate", "Late"]).astype(int)
    return df


# ---------------------------------------------------------------------------
# Fixture
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def raw_df() -> pd.DataFrame:
    """Carrega as primeiras 50 linhas do dataset bruto com target derivado."""
    return _load_with_target(RAW_DATA_PATH, n=50)


# ---------------------------------------------------------------------------
# Testes
# ---------------------------------------------------------------------------


def test_input_data_schema(raw_df: pd.DataFrame) -> None:
    """O dataset deve respeitar todos os tipos e restrições do schema Oral Cancer."""
    ORAL_CANCER_SCHEMA.validate(raw_df, lazy=True)


def test_no_missing_values_critical_cols(raw_df: pd.DataFrame) -> None:
    """Colunas críticas para o modelo não devem ter valores nulos."""
    critical_cols = [
        "Country", "Gender", "Age", "Tobacco_Use", "Alcohol_Use",
        "Socioeconomic_Status", "Diagnosis_Stage", "high_risk",
    ]
    nulls = raw_df[critical_cols].isnull().sum()
    assert nulls.sum() == 0, f"Colunas críticas com NaN encontradas:\n{nulls[nulls > 0]}"


def test_target_is_binary(raw_df: pd.DataFrame) -> None:
    """A coluna high_risk deve conter apenas 0 (baixo risco) ou 1 (alto risco)."""
    unique_vals = set(raw_df["high_risk"].unique())
    assert unique_vals.issubset({0, 1}), (
        f"Valores inesperados em 'high_risk': {unique_vals}"
    )


def test_dataset_has_both_classes(raw_df: pd.DataFrame) -> None:
    """O dataset deve conter exemplos de ambas as classes para treino estratificado."""
    counts = raw_df["high_risk"].value_counts()
    assert 0 in counts.index, "Classe baixo risco (0) ausente no dataset."
    assert 1 in counts.index, "Classe alto risco (1) ausente no dataset."


def test_diagnosis_stage_maps_to_high_risk(raw_df: pd.DataFrame) -> None:
    """Verifica que o mapeamento clínico Early→0, Moderate/Late→1 é correto."""
    early_mask = raw_df["Diagnosis_Stage"] == "Early"
    moderate_late_mask = raw_df["Diagnosis_Stage"].isin(["Moderate", "Late"])

    assert (raw_df.loc[early_mask, "high_risk"] == 0).all(), (
        "Diagnóstico Early deve mapear para high_risk=0"
    )
    assert (raw_df.loc[moderate_late_mask, "high_risk"] == 1).all(), (
        "Diagnósticos Moderate/Late devem mapear para high_risk=1"
    )


def test_age_range_is_valid(raw_df: pd.DataFrame) -> None:
    """Idades devem estar entre 0 e 120 anos."""
    assert raw_df["Age"].between(0, 120).all(), (
        f"Idades fora do range esperado: {raw_df['Age'].describe()}"
    )


def test_survival_rate_range(raw_df: pd.DataFrame) -> None:
    """Survival_Rate deve estar entre 0.0 e 1.0 (proporção)."""
    non_null = raw_df["Survival_Rate"].dropna()
    assert non_null.between(0.0, 1.0).all(), (
        f"Survival_Rate fora de [0,1]: min={non_null.min():.4f}, max={non_null.max():.4f}"
    )


def test_schema_rejects_invalid_diagnosis_stage() -> None:
    """O schema deve rejeitar linhas com Diagnosis_Stage inválido."""
    bad_row = pd.DataFrame([{
        "Country": "Brazil",
        "Gender": "Male",
        "Age": 45,
        "Tobacco_Use": 1,
        "Alcohol_Use": 0,
        "HPV_Related": 0,
        "Socioeconomic_Status": "Middle",
        "Diagnosis_Stage": "Unknown",  # valor inválido
        "Treatment_Type": "Surgery",
        "Survival_Rate": 0.75,
        "high_risk": 0,
    }])

    with pytest.raises(pa.errors.SchemaError):
        ORAL_CANCER_SCHEMA.validate(bad_row)
