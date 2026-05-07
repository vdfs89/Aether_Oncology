"""
test_schema.py
==============
Testes de contrato de dados usando Pandera.

Garante que o dataset bruto (data/raw/data.csv) respeite os tipos e
restrições esperadas pelo pipeline de treino. Se o dataset mudar no futuro
(novas colunas, valores negativos inesperados, etc.), estes testes "quebram"
exactamente onde o problema está — evitando falhas silenciosas no treino.

Requisito: data/raw/data.csv deve existir com as 30 colunas WDBC + 'target'.
"""

from __future__ import annotations

import pandas as pd
import pandera.pandas as pa
import pytest
from pandera.pandas import Check, Column, DataFrameSchema

# ---------------------------------------------------------------------------
# Schema WDBC — todas as 30 features + coluna target
# ---------------------------------------------------------------------------

WDBC_FEATURE_SCHEMA = DataFrameSchema(
    columns={
        # ── Mean values ───────────────────────────────────────────────────
        "mean_radius": Column(float, Check.ge(0)),
        "mean_texture": Column(float, Check.ge(0)),
        "mean_perimeter": Column(float, Check.ge(0)),
        "mean_area": Column(float, Check.ge(0)),
        "mean_smoothness": Column(float, Check.between(0, 1)),
        "mean_compactness": Column(float, Check.ge(0)),
        "mean_concavity": Column(float, Check.ge(0)),
        "mean_concave_points": Column(float, Check.ge(0)),
        "mean_symmetry": Column(float, Check.ge(0)),
        "mean_fractal_dimension": Column(float, Check.ge(0)),
        # ── Standard error ────────────────────────────────────────────────
        "radius_error": Column(float, Check.ge(0)),
        "texture_error": Column(float, Check.ge(0)),
        "perimeter_error": Column(float, Check.ge(0)),
        "area_error": Column(float, Check.ge(0)),
        "smoothness_error": Column(float, Check.ge(0)),
        "compactness_error": Column(float, Check.ge(0)),
        "concavity_error": Column(float, Check.ge(0)),
        "concave_points_error": Column(float, Check.ge(0)),
        "symmetry_error": Column(float, Check.ge(0)),
        "fractal_dimension_error": Column(float, Check.ge(0)),
        # ── Worst values ──────────────────────────────────────────────────
        "worst_radius": Column(float, Check.ge(0)),
        "worst_texture": Column(float, Check.ge(0)),
        "worst_perimeter": Column(float, Check.ge(0)),
        "worst_area": Column(float, Check.ge(0)),
        "worst_smoothness": Column(float, Check.between(0, 1)),
        "worst_compactness": Column(float, Check.ge(0)),
        "worst_concavity": Column(float, Check.ge(0)),
        "worst_concave_points": Column(float, Check.ge(0)),
        "worst_symmetry": Column(float, Check.ge(0)),
        "worst_fractal_dimension": Column(float, Check.ge(0)),
        # ── Label ─────────────────────────────────────────────────────────
        "target": Column(int, Check.isin([0, 1])),
    },
    strict=False,  # permite colunas extras (ex.: 'id') sem falhar
    coerce=True,  # tenta converter tipos antes de validar
)

RAW_DATA_PATH = "data/raw/data.csv"


# ---------------------------------------------------------------------------
# Fixture
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def raw_df() -> pd.DataFrame:
    """Carrega as primeiras 50 linhas do dataset bruto."""
    return pd.read_csv(RAW_DATA_PATH).head(50)


# ---------------------------------------------------------------------------
# Testes
# ---------------------------------------------------------------------------


def test_input_data_schema(raw_df: pd.DataFrame) -> None:
    """O dataset deve respeitar todos os tipos e restrições do schema WDBC."""
    WDBC_FEATURE_SCHEMA.validate(raw_df, lazy=True)


def test_no_missing_values(raw_df: pd.DataFrame) -> None:
    """Nenhuma feature deve ter valores nulos — treinar com NaN corrompe o modelo."""
    feature_cols = [c for c in raw_df.columns if c != "target"]
    nulls = raw_df[feature_cols].isnull().sum()
    assert nulls.sum() == 0, f"Colunas com NaN encontradas:\n{nulls[nulls > 0]}"


def test_target_is_binary(raw_df: pd.DataFrame) -> None:
    """A coluna target deve conter apenas 0 (Benigno) ou 1 (Maligno)."""
    unique_vals = set(raw_df["target"].unique())
    assert unique_vals.issubset({0, 1}), (
        f"Valores inesperados em 'target': {unique_vals}"
    )


def test_dataset_has_both_classes(raw_df: pd.DataFrame) -> None:
    """O dataset deve conter exemplos de ambas as classes para treino estratificado."""
    counts = raw_df["target"].value_counts()
    assert 0 in counts.index, "Classe Benigno (0) ausente no dataset."
    assert 1 in counts.index, "Classe Maligno (1) ausente no dataset."


def test_schema_rejects_negative_radius() -> None:
    """O schema deve rejeitar linhas com mean_radius negativo."""
    bad_row = pd.DataFrame([{col: 0.5 for col in WDBC_FEATURE_SCHEMA.columns}])
    bad_row["mean_radius"] = -1.0
    bad_row["target"] = 0

    with pytest.raises(pa.errors.SchemaError):
        WDBC_FEATURE_SCHEMA.validate(bad_row)
