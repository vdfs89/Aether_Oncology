"""
src/features/preprocessor.py
=============================
Aether Oncology v3.0 — Feature Engineering Pipeline.

Dataset: Oral Cancer Top 30 Countries (160k records, MIT License)
Target:  high_risk — triagem binária (0=Early, 1=Moderate/Late)

Notas sobre os tipos do dataset bruto:
    - Tobacco_Use / Alcohol_Use: inteiros 0/1 no CSV.
      → load_and_prepare converte para "No"/"Yes" antes do OHE,
        garantindo que treino e API usem o mesmo formato de string.
    - HPV_Related: excluído do pipeline (não exposto na API).
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

logger = logging.getLogger("aether.preprocessor")

# ---------------------------------------------------------------------------
# Definição das colunas por tipo
# ---------------------------------------------------------------------------

# Features numéricas contínuas
NUMERIC_FEATURES: list[str] = ["Age", "Survival_Rate"]

# Features binárias como strings "Yes"/"No" (tanto no treino quanto na API)
BINARY_FEATURES: list[str] = ["Tobacco_Use", "Alcohol_Use"]

# Features categóricas nominais
CATEGORICAL_FEATURES: list[str] = [
    "Country",
    "Gender",
    "Socioeconomic_Status",
    "Treatment_Type",
]

# Coluna target
TARGET: str = "high_risk"

# Mapeamento 0/1 → "No"/"Yes" para colunas binárias do CSV
_BINARY_MAP: dict[int, str] = {0: "No", 1: "Yes"}


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------


def build_preprocessor() -> ColumnTransformer:
    """
    Retorna o ColumnTransformer configurado para o Oral Cancer dataset.

    Transformações:
        - num   → StandardScaler (Age, Survival_Rate)
        - bin   → OneHotEncoder(drop='if_binary') para "Yes"/"No"
                  → produz 1 coluna por feature binária
        - cat   → OneHotEncoder(handle_unknown='ignore') para Country, Gender, etc.
    """
    return ColumnTransformer(
        transformers=[
            (
                "num",
                StandardScaler(),
                NUMERIC_FEATURES,
            ),
            (
                "bin",
                OneHotEncoder(drop="if_binary", sparse_output=False),
                BINARY_FEATURES,
            ),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CATEGORICAL_FEATURES,
            ),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------


def load_and_prepare(path: str) -> tuple[pd.DataFrame, np.ndarray]:
    """
    Carrega o CSV, deriva o target binário e retorna (X, y).

    Conversões aplicadas:
        - Tobacco_Use / Alcohol_Use: 0→"No", 1→"Yes" (normalização para OHE)
        - Survival_Rate NaN: preenchido com mediana para não bloquear o scaler
        - Treatment_Type NaN: preenchido com "Unknown"

    Returns:
        X : pd.DataFrame com colunas em NUMERIC + BINARY + CATEGORICAL_FEATURES
        y : np.ndarray com valores 0/1 (high_risk)
    """
    df = pd.read_csv(path)
    logger.info("Dataset carregado: %s", str(df.shape))

    # Target binário: triagem de alto risco
    # Early → 0 (baixo risco) | Moderate/Late → 1 (alto risco)
    df[TARGET] = df["Diagnosis_Stage"].isin(["Moderate", "Late"]).astype(int)
    logger.info("Distribuição high_risk:\n%s", df[TARGET].value_counts().to_string())

    # Converter binárias de int → string para compatibilidade com OHE e API
    for col in BINARY_FEATURES:
        if col in df.columns:
            df[col] = df[col].map(_BINARY_MAP).fillna("No")

    # Preencher nulos
    if "Survival_Rate" in df.columns:
        df["Survival_Rate"] = df["Survival_Rate"].fillna(
            df["Survival_Rate"].median()
        )
    if "Treatment_Type" in df.columns:
        df["Treatment_Type"] = df["Treatment_Type"].fillna("Unknown")

    feature_cols = NUMERIC_FEATURES + BINARY_FEATURES + CATEGORICAL_FEATURES
    X = df[feature_cols]
    y = df[TARGET].values

    return X, y
