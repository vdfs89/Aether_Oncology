"""
preprocessor.py
===============
Pipeline de pré-processamento para o Oral Cancer Top 30 Countries dataset.

Arquitetura:
    - Colunas numéricas (Age, Survival_Rate) → StandardScaler
    - Colunas binárias inteiras (Tobacco_Use, Alcohol_Use, HPV_Related) → passthrough
    - Colunas categóricas (Country, Gender, Socioeconomic_Status, Treatment_Type)
      → OneHotEncoder

O preprocessor é fitado APENAS nos dados de treino para evitar data leakage.
A instância completa é persistida via joblib para uso idêntico na API.
"""

from __future__ import annotations

from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# ---------------------------------------------------------------------------
# Definição das colunas por tipo
# ---------------------------------------------------------------------------

# Features numéricas contínuas — requerem normalização
NUMERIC_FEATURES: list[str] = ["Age", "Survival_Rate"]

# Features binárias já como 0/1 no dataset — passthrough sem transformação
BINARY_FEATURES: list[str] = ["Tobacco_Use", "Alcohol_Use", "HPV_Related"]

# Features categóricas nominais — one-hot encoding
CATEGORICAL_FEATURES: list[str] = [
    "Country",
    "Gender",
    "Socioeconomic_Status",
    "Treatment_Type",
]

# Coluna target — excluída do preprocessamento
TARGET_COLUMN: str = "high_risk"

# Colunas a descartar antes do treino (ID não agrega informação preditiva)
DROP_COLUMNS: list[str] = ["ID", "Diagnosis_Stage"]


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------


def build_preprocessor() -> ColumnTransformer:
    """
    Constrói e retorna o ColumnTransformer para o dataset de câncer oral.

    Returns:
        ColumnTransformer configurado com:
            - StandardScaler para Age e Survival_Rate
            - passthrough para binárias (Tobacco_Use, Alcohol_Use, HPV_Related)
            - OneHotEncoder para Country, Gender, Socioeconomic_Status, Treatment_Type
    """
    preprocessor = ColumnTransformer(
        transformers=[
            (
                "num",
                StandardScaler(),
                NUMERIC_FEATURES,
            ),
            (
                "bin",
                "passthrough",  # já são 0/1 — nenhuma transformação necessária
                BINARY_FEATURES,
            ),
            (
                "cat",
                OneHotEncoder(
                    handle_unknown="ignore",  # tolera países/tratamentos novos em prod
                    sparse_output=False,  # retorna array denso para compatibilidade PyTorch
                    drop=None,  # mantém todas as categorias para interpretabilidade
                ),
                CATEGORICAL_FEATURES,
            ),
        ],
        remainder="drop",  # descarta colunas não listadas (ID, Diagnosis_Stage)
        verbose_feature_names_out=True,
    )
    return preprocessor


def build_pipeline(model_step=None) -> Pipeline:
    """
    Constrói um Pipeline sklearn com preprocessamento + modelo opcional.

    Args:
        model_step: Estimador sklearn ou wrapper PyTorch compatível (opcional).
                    Se None, retorna pipeline apenas de preprocessamento.

    Returns:
        Pipeline com steps [('preprocessor', ...), ('model', ...)]
    """
    steps = [("preprocessor", build_preprocessor())]
    if model_step is not None:
        steps.append(("model", model_step))
    return Pipeline(steps=steps)
