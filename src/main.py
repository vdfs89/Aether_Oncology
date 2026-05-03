"""
main.py
=======
Camada web thin da Aether Oncology Tumor Classifier API.

O FastAPI NÃO conhece PyTorch, tensores ou Scikit-Learn.
Ele apenas:
  1. Valida o JSON de entrada via Pydantic (todas as 30 features WDBC)
  2. Delega para predictor.predict()
  3. Devolve uma resposta estruturada — com alerta quando confidence == 'Low'

Iniciar o servidor:
    uvicorn src.main:app --reload
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from src.services.predictor import predictor

# ---------------------------------------------------------------------------
# Aplicação
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Aether Oncology API",
    description=(
        "API de suporte à decisão clínica para classificação de biópsias tumorais. "
        "**Nunca deve ser usado para diagnóstico autónomo sem supervisão médica.**"
    ),
    version="1.0.0",
)


# ---------------------------------------------------------------------------
# Schema de entrada — todas as 30 features WDBC com nomes explícitos
# ---------------------------------------------------------------------------


class TumorFeatures(BaseModel):
    """
    30 atributos morfológicos numéricos extraídos de núcleos celulares
    (Wisconsin Diagnostic Breast Cancer — WDBC dataset).
    """

    # --- Mean values ---
    radius_mean: float = Field(..., gt=0, description="Raio médio do núcleo")
    texture_mean: float = Field(
        ..., gt=0, description="Textura média (desvio padrão de intensidades)"
    )
    perimeter_mean: float = Field(..., gt=0, description="Perímetro médio")
    area_mean: float = Field(..., gt=0, description="Área média")
    smoothness_mean: float = Field(
        ..., gt=0, description="Suavidade média (variação local do raio)"
    )
    compactness_mean: float = Field(..., gt=0, description="Compacidade média")
    concavity_mean: float = Field(..., ge=0, description="Concavidade média")
    concave_points_mean: float = Field(..., ge=0, description="Pontos côncavos médios")
    symmetry_mean: float = Field(..., gt=0, description="Simetria média")
    fractal_dimension_mean: float = Field(
        ..., gt=0, description="Dimensão fractal média"
    )

    # --- Standard error ---
    radius_se: float = Field(..., ge=0, description="Erro padrão do raio")
    texture_se: float = Field(..., ge=0, description="Erro padrão da textura")
    perimeter_se: float = Field(..., ge=0, description="Erro padrão do perímetro")
    area_se: float = Field(..., ge=0, description="Erro padrão da área")
    smoothness_se: float = Field(..., ge=0, description="Erro padrão da suavidade")
    compactness_se: float = Field(..., ge=0, description="Erro padrão da compacidade")
    concavity_se: float = Field(..., ge=0, description="Erro padrão da concavidade")
    concave_points_se: float = Field(
        ..., ge=0, description="Erro padrão dos pontos côncavos"
    )
    symmetry_se: float = Field(..., ge=0, description="Erro padrão da simetria")
    fractal_dimension_se: float = Field(
        ..., ge=0, description="Erro padrão da dimensão fractal"
    )

    # --- Worst (largest) values ---
    radius_worst: float = Field(..., gt=0, description="Raio máximo (pior)")
    texture_worst: float = Field(..., gt=0, description="Textura máxima (pior)")
    perimeter_worst: float = Field(..., gt=0, description="Perímetro máximo (pior)")
    area_worst: float = Field(..., gt=0, description="Área máxima (pior)")
    smoothness_worst: float = Field(..., gt=0, description="Suavidade máxima (pior)")
    compactness_worst: float = Field(..., gt=0, description="Compacidade máxima (pior)")
    concavity_worst: float = Field(..., ge=0, description="Concavidade máxima (pior)")
    concave_points_worst: float = Field(
        ..., ge=0, description="Pontos côncavos máximos (pior)"
    )
    symmetry_worst: float = Field(..., gt=0, description="Simetria máxima (pior)")
    fractal_dimension_worst: float = Field(
        ..., gt=0, description="Dimensão fractal máxima (pior)"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "radius_mean": 17.99,
                    "texture_mean": 10.38,
                    "perimeter_mean": 122.8,
                    "area_mean": 1001.0,
                    "smoothness_mean": 0.1184,
                    "compactness_mean": 0.2776,
                    "concavity_mean": 0.3001,
                    "concave_points_mean": 0.1471,
                    "symmetry_mean": 0.2419,
                    "fractal_dimension_mean": 0.07871,
                    "radius_se": 1.095,
                    "texture_se": 0.9053,
                    "perimeter_se": 8.589,
                    "area_se": 153.4,
                    "smoothness_se": 0.006399,
                    "compactness_se": 0.04904,
                    "concavity_se": 0.05373,
                    "concave_points_se": 0.01587,
                    "symmetry_se": 0.03003,
                    "fractal_dimension_se": 0.006193,
                    "radius_worst": 25.38,
                    "texture_worst": 17.33,
                    "perimeter_worst": 184.6,
                    "area_worst": 2019.0,
                    "smoothness_worst": 0.1622,
                    "compactness_worst": 0.6656,
                    "concavity_worst": 0.7119,
                    "concave_points_worst": 0.2654,
                    "symmetry_worst": 0.4601,
                    "fractal_dimension_worst": 0.1189,
                }
            ]
        }
    }


# ---------------------------------------------------------------------------
# Schema de saída
# ---------------------------------------------------------------------------


class PredictResponse(BaseModel):
    prediction: int = Field(..., description="1 = Maligno, 0 = Benigno")
    label: str = Field(..., description="'Malignant' ou 'Benign'")
    probability: float = Field(..., ge=0.0, le=1.0)
    confidence: str = Field(..., description="'High' | 'Medium' | 'Low'")
    status: str
    warning: str | None = Field(
        default=None,
        description="Alerta de baixa confiança — revisão manual obrigatória",
    )


# ---------------------------------------------------------------------------
# Rotas
# ---------------------------------------------------------------------------


@app.get("/health")
def health_check():
    # O Render precisa receber este 200 OK para confirmar o deploy
    return {"status": "online", "model": "Aether Oncology v1.0"}


@app.post(
    "/predict",
    response_model=PredictResponse,
    status_code=status.HTTP_200_OK,
    tags=["Prediction"],
    summary="Classificar amostra de biópsia tumoral",
)
def make_prediction(features: TumorFeatures) -> PredictResponse:
    """
    Recebe as 30 features morfológicas WDBC e devolve a classificação binária.

    Quando ``confidence == 'Low'``, o campo ``warning`` é preenchido,
    sinalizando revisão manual dupla obrigatória (Model Card — Secção 6).
    """
    try:
        # Converte Pydantic → lista ordenada de floats (preserva ordem WDBC)
        data_list = [list(features.model_dump().values())]
        result = predictor.predict(data_list)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    warning = None
    if result["confidence"] == "Low":
        warning = (
            "⚠️  BAIXA CONFIANÇA: Os dados diferem significativamente "
            "do padrão de treino. Revisão manual dupla obrigatória."
        )

    return PredictResponse(**result, warning=warning)
