"""
main.py
=======
Camada web thin da Aether Oncology Tumor Classifier API v2.0.

O FastAPI NÃO conhece PyTorch, tensores ou Scikit-Learn.
Ele apenas:
  1. Valida o JSON de entrada via Pydantic (todas as 30 features WDBC)
  2. Delega para predictor.predict()
  3. Devolve uma resposta estruturada — com alerta quando confidence == 'Low'

RAG v2.0:
  - Integrated Gradients (XAI) identifica a feature de maior impacto
  - PubMed + Cochrane + Semantic Scholar fornecem evidência científica
  - Caching persistente via diskcache

Iniciar o servidor:
    uvicorn src.main:app --reload
"""

from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.security.api_key import APIKeyHeader
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from src.services.predictor import predictor

# ---------------------------------------------------------------------------
# Segurança — API Key lida de variável de ambiente
# ---------------------------------------------------------------------------

_RAW_API_KEY = os.getenv("API_KEY", "aether-oncology-eval-2026")
if _RAW_API_KEY == "aether-oncology-eval-2026":
    import warnings

    warnings.warn(
        "Utilizando API_KEY padrão de avaliação. "
        "Defina a variável de ambiente 'API_KEY' para produção.",
        stacklevel=1,
    )

_api_key_header = APIKeyHeader(name="access_token", auto_error=False)


async def get_api_key(key: str = Security(_api_key_header)) -> str:
    """Valida o header 'access_token'. Retorna 403 se a chave for incorreta."""
    if _RAW_API_KEY and key != _RAW_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: API Key inválida ou ausente",
        )
    return key


# ---------------------------------------------------------------------------
# Aplicação
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Aether Oncology API",
    description=(
        "API de suporte à decisão clínica para classificação de biópsias tumorais. "
        "**v2.0**: RAG com PubMed, Cochrane e Integrated Gradients (XAI). "
        "**Nunca deve ser usado para diagnóstico autónomo sem supervisão médica.**"
    ),
    version="2.0.0",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://portal.vitorsilva.engineer",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Arquivos estáticos
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

portal_dir = os.path.join(static_dir, "aether-oncology-portal")
app.mount(
    "/css", StaticFiles(directory=os.path.join(portal_dir, "css")), name="portal-css"
)
app.mount(
    "/js", StaticFiles(directory=os.path.join(portal_dir, "js")), name="portal-js"
)
app.mount(
    "/images",
    StaticFiles(directory=os.path.join(portal_dir, "images")),
    name="portal-images",
)


# ---------------------------------------------------------------------------
# Frontend — Portal Clínico
# ---------------------------------------------------------------------------


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def read_index() -> HTMLResponse:
    """Serve o portal clínico modular."""
    index_path = os.path.join(
        os.path.dirname(__file__), "static", "aether-oncology-portal", "index.html"
    )
    with open(index_path, encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


# ---------------------------------------------------------------------------
# Schema de entrada — 30 features WDBC
# ---------------------------------------------------------------------------


class TumorFeatures(BaseModel):
    """30 atributos morfológicos numéricos (WDBC dataset)."""

    radius_mean: float = Field(..., gt=0, description="Raio médio do núcleo")
    texture_mean: float = Field(..., gt=0, description="Textura média")
    perimeter_mean: float = Field(..., gt=0, description="Perímetro médio")
    area_mean: float = Field(..., gt=0, description="Área média")
    smoothness_mean: float = Field(..., gt=0, description="Suavidade média")
    compactness_mean: float = Field(..., gt=0, description="Compacidade média")
    concavity_mean: float = Field(..., ge=0, description="Concavidade média")
    concave_points_mean: float = Field(..., ge=0, description="Pontos côncavos médios")
    symmetry_mean: float = Field(..., gt=0, description="Simetria média")
    fractal_dimension_mean: float = Field(
        ..., gt=0, description="Dimensão fractal média"
    )
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
# Schema de saída — v2.0 com multi-fonte de evidência
# ---------------------------------------------------------------------------


class ResearchArticle(BaseModel):
    """Evidências científicas (PubMed, Cochrane, Semantic Scholar)."""

    title: str = Field(..., description="Título do artigo")
    url: str = Field(..., description="Link para o artigo")
    year: int | None = Field(None, description="Ano de publicação")
    tldr: str | None = Field(None, description="Resumo executivo (TL;DR)")
    abstract: str | None = Field(None, description="Resumo (PubMed)")
    source: str = Field(
        ..., description="Fonte: 'PubMed', 'Cochrane' ou 'Semantic Scholar'"
    )


class PredictResponse(BaseModel):
    prediction: int = Field(..., description="1 = Maligno, 0 = Benigno")
    label: str = Field(..., description="'Malignant' ou 'Benign'")
    probability: float = Field(..., ge=0.0, le=1.0)
    confidence: str = Field(..., description="'High' | 'Medium' | 'Low'")
    status: str
    top_feature: str | None = Field(
        None, description="Feature de maior impacto (XAI — Integrated Gradients)"
    )
    articles: list[ResearchArticle] = Field(
        default_factory=list,
        description="Evidências científicas multi-fonte (PubMed, Cochrane, S2)",
    )
    warning: str | None = Field(
        default=None,
        description="Alerta de baixa confiança",
    )


# ---------------------------------------------------------------------------
# Rotas
# ---------------------------------------------------------------------------


@app.get("/health")
def health_check():
    return {"status": "online", "model": "Aether Oncology v2.0"}


@app.post(
    "/predict",
    response_model=PredictResponse,
    status_code=status.HTTP_200_OK,
    tags=["Prediction"],
    summary="Classificar amostra de biópsia tumoral",
    dependencies=[Security(get_api_key)],
)
def make_prediction(features: TumorFeatures) -> PredictResponse:
    """
    Recebe as 30 features WDBC e devolve classificação binária + RAG.

    v2.0: top_feature via Integrated Gradients → busca PubMed + Cochrane.
    """
    try:
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
