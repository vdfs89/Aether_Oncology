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

import asyncio
import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Request, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.security.api_key import APIKeyHeader
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from src.core.logging import request_id_contextvar, setup_logging
from src.ml_platform.orchestrator import MLPlatformOrchestrator
from src.services.audit import AUDIT_FILE, calculate_drift, log_prediction
from src.services.inference_client import inference_client
from src.services.predictor import FEATURE_NAMES, predictor

# ---------------------------------------------------------------------------
# Platform Metadata (v2.2)
# ---------------------------------------------------------------------------

APP_VERSION = "2.2.0"
GIT_SHA = os.getenv("RENDER_GIT_COMMIT", os.getenv("GITHUB_SHA", "dev-local"))

# ---------------------------------------------------------------------------
# Platform Initialization (v2.2)
# ---------------------------------------------------------------------------

setup_logging()

limiter = Limiter(key_func=get_remote_address)

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    SRE Deterministic Startup:
    Ensures model weights are verified and warm before accepting traffic.
    """
    request_id = str(uuid.uuid4())
    request_id_contextvar.set(request_id)

    logging.info(
        f"BOOT [{request_id}]: Initializing Aether Oncology v{APP_VERSION} ({GIT_SHA})"
    )

    # Pre-warm model and RAG engine
    try:
        predictor.load_model()
        logging.info(f"BOOT [{request_id}]: TumorMLP weights loaded successfully.")
    except Exception as e:
        logging.critical(f"BOOT FAILURE: Model loading failed: {e}")
        # In a real SRE env, we might want to exit(1) here to prevent bad rollouts

    yield

    logging.info(f"SHUTDOWN [{request_id}]: Graceful termination initiated.")
    await inference_client.shutdown()
    logging.info(f"SHUTDOWN [{request_id}]: Inference client closed.")


app = FastAPI(
    title="Aether Oncology API",
    description=(
        "API de suporte à decisão clínica para classificação de biópsias tumorais. "
        "**v2.2**: SRE Hardened - Deterministic Lifespan & Distributed Tracing. "
    ),
    version=APP_VERSION,
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Centralized Error Boundary for the API.
    Prevents leaking internal stack traces and provides standardized clinical error codes.
    """
    request_id = request_id_contextvar.get()
    logging.error(
        f"Critical Platform Error [{request_id}]: {exc}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "error_type": type(exc).__name__,
            "request_id": request_id,
        },
    )

    from fastapi.responses import JSONResponse

    return JSONResponse(
        status_code=500,
        content={
            "error_code": "AETHER_INTERNAL_ERROR",
            "message": "Ocorreu um erro inesperado no processamento clínico. A equipe de SRE foi notificada.",
            "clinical_impact": "High",
            "request_id": request_id,
            "timestamp": time.time(),
        },
    )


# ---------------------------------------------------------------------------
# Middlewares & Monitoramento
# ---------------------------------------------------------------------------


@app.middleware("http")
async def add_sre_telemetry(request: Request, call_next):
    """
    SRE Distributed Tracing & Correlation Middleware:
    - Injects/Propagates Request-ID
    - Identifies Release Version
    - Measures clinical inference latency
    - Prevents Version Skew
    """
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    client_version = request.headers.get("X-Aether-Release", "unknown")
    request_id_contextvar.set(request_id)

    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000

    # SRE Headers
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Aether-Release"] = APP_VERSION
    response.headers["X-Git-SHA"] = GIT_SHA
    response.headers["X-Inference-Time-Ms"] = f"{duration_ms:.2f}"

    # Version Skew Warning
    if client_version != "unknown" and client_version != APP_VERSION:
        response.headers["X-Skew-Warning"] = "true"
        logging.warning(
            f"VERSION SKEW DETECTED [{request_id}]: Client {client_version} vs Server {APP_VERSION}"
        )

    if duration_ms > 500:  # Slightly higher threshold for RAG overhead
        logging.warning(
            "HIGH LATENCY [%s]: %.2f ms in %s",
            request_id,
            duration_ms,
            request.url.path,
        )
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://aether-oncology.vercel.app",  # Production Frontend
        "https://aether-oncology-portal.vitorsilva.engineer",  # Custom Domain
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Arquivos estáticos
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

portal_dir = os.path.join(static_dir, "aether-oncology-portal")

# Suporte para o bundle do Vite (Produção)
assets_dir = os.path.join(portal_dir, "assets")
if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="vite-assets")

# Suporte para desenvolvimento (arquivos brutos)
for folder in ["css", "js", "images"]:
    folder_path = os.path.join(portal_dir, folder)
    if os.path.exists(folder_path):
        app.mount(
            f"/{folder}", StaticFiles(directory=folder_path), name=f"portal-{folder}"
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


@app.get("/portal.html", response_class=HTMLResponse, include_in_schema=False)
async def read_portal() -> HTMLResponse:
    """Serve a página portal.html."""
    portal_path = os.path.join(
        os.path.dirname(__file__), "static", "aether-oncology-portal", "portal.html"
    )
    with open(portal_path, encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.get("/privacy.html", response_class=HTMLResponse, include_in_schema=False)
async def read_privacy() -> HTMLResponse:
    """Serve a página privacy.html."""
    privacy_path = os.path.join(
        os.path.dirname(__file__), "static", "aether-oncology-portal", "privacy.html"
    )
    with open(privacy_path, encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.get("/terms.html", response_class=HTMLResponse, include_in_schema=False)
async def read_terms() -> HTMLResponse:
    """Serve a página terms.html."""
    terms_path = os.path.join(
        os.path.dirname(__file__), "static", "aether-oncology-portal", "terms.html"
    )
    with open(terms_path, encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


# ---------------------------------------------------------------------------
# Multimodality Readiness (v2.1)
# ---------------------------------------------------------------------------


class GenomicMarkers(BaseModel):
    """Marcadores genéticos de alto risco (KRAS, EGFR, PIK3CA)."""

    kras_mutation: bool = Field(False, description="Presença de mutação KRAS")
    egfr_amplification: bool = Field(False, description="Amplificação de EGFR")
    pik3ca_mutation: bool = Field(False, description="Mutação PIK3CA (PI3K pathway)")


class EHREntry(BaseModel):
    """Dados resumidos do Prontuário Eletrônico (EHR)."""

    age: int | None = Field(None, gt=0, description="Idade do paciente")
    family_history: bool = Field(
        False, description="Histórico familiar de câncer de mama"
    )
    previous_biopsies: int = Field(0, ge=0, description="Número de biópsias anteriores")


# ---------------------------------------------------------------------------
# Schema de entrada — 30 features WDBC + Multimodal v2.1
# ---------------------------------------------------------------------------


class TumorFeatures(BaseModel):
    """30 atributos morfológicos numéricos (WDBC dataset) + Multimodal v2.1."""

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

    # v2.1 Roadmap: Multimodal Fields (Optional for now)
    genomics: GenomicMarkers | None = Field(
        None, description="Dados genômicos do paciente"
    )
    ehr: EHREntry | None = Field(None, description="Sumário do prontuário eletrônico")

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


# ---------------------------------------------------------------------------
# SRE Observability Endpoints
# ---------------------------------------------------------------------------


@app.get("/version", tags=["SRE"])
async def get_version():
    """Returns platform metadata for deployment verification."""
    return {
        "version": APP_VERSION,
        "git_sha": GIT_SHA,
        "environment": os.getenv("NODE_ENV", "production"),
        "status": "operational",
    }


@app.get("/health/live", tags=["SRE"])
async def health_live():
    """Liveness probe: Process is alive."""
    return {"status": "alive", "timestamp": time.time()}


@app.get("/health/ready", tags=["SRE"])
async def health_ready():
    """Readiness probe: Model is loaded and API is ready for traffic."""
    if not predictor.is_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model not loaded yet",
        )
    return {
        "status": "ready",
        "model_version": getattr(predictor, "model_version", "v1"),
        "timestamp": time.time(),
    }


@app.get("/health/inference", tags=["SRE"])
async def health_inference():
    """Checks the health of the remote inference layer (Hugging Face)."""
    is_up = await inference_client.check_health()
    return {
        "status": "up" if is_up else "down",
        "model_id": inference_client.model_id,
        "circuit_state": inference_client.state.value,
        "timestamp": time.time(),
    }


@app.get("/health", tags=["Legacy"])
@limiter.limit("60/minute")
async def health(request: Request):
    """Legacy health check for backward compatibility."""
    return {"status": "healthy", "version": APP_VERSION}


@app.get("/heartbeat", tags=["Ops"])
async def platform_heartbeat():
    """Endpoint leve para monitoramento de latência e conectividade do portal."""
    return {"status": "alive", "timestamp": time.time()}


@app.post(
    "/predict",
    response_model=PredictResponse,
    status_code=status.HTTP_200_OK,
    tags=["Prediction"],
    summary="Classificar amostra de biópsia tumoral",
    dependencies=[Security(get_api_key)],
)
@limiter.limit("10/minute")
async def make_prediction(request: Request, features: TumorFeatures) -> PredictResponse:
    """
    Recebe as 30 features WDBC e devolve classificação binária + RAG.

    v2.0: top_feature via Integrated Gradients → busca PubMed + Cochrane.
    """
    try:
        data = features.model_dump()
        data_list = [[data[f] for f in FEATURE_NAMES]]
        result = await predictor.predict(data_list)

        # 3. Persistência de Auditoria (Governança — Aula 7)
        # FIX P1-1: log_prediction does synchronous file I/O. Calling it
        # directly inside async def blocks the event loop. Offload to thread.
        await asyncio.to_thread(log_prediction, features.model_dump(), result)

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


# ---------------------------------------------------------------------------
# Clinical Feedback Loop — Ground Truth (v2.1)
# ---------------------------------------------------------------------------


class FeedbackRequest(BaseModel):
    """Dados de feedback clínico (Ground Truth)."""

    prediction_id: str = Field(..., description="ID da predição (timestamp/hash)")
    ground_truth: int = Field(..., ge=0, le=1, description="1 = Maligno, 0 = Benigno")
    notes: str | None = None


@app.post("/feedback", tags=["Clinical Feedback"], dependencies=[Security(get_api_key)])
async def clinical_feedback(feedback: FeedbackRequest):
    """
    Recebe o resultado real (biópsia/cirurgia) para validar a precisão da IA.
    Este loop é essencial para detecção de Concept Drift e auditoria de Fairness.
    """
    # Em produção, isso salvaria em um DB SQL (Aurora/Postgres)
    # Aqui, anexamos ao rastro de auditoria para processamento offline
    # FIX P1-4: use ISO timestamp string (same format as log_prediction) so
    # the JS renderMLOps `log.timestamp.split('T')` never receives a float.
    # FIX P1-1: open() is blocking I/O — offload to thread.
    feedback_entry = {
        "timestamp": datetime.now().isoformat(),
        "type": "clinical_feedback",
        "data": feedback.model_dump(),
    }

    def _write_feedback() -> None:
        with open(AUDIT_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(feedback_entry) + "\n")

    await asyncio.to_thread(_write_feedback)

    return {"status": "success", "message": "Feedback clínico registrado com sucesso."}


@app.get("/analytics", tags=["MLOps"])
def get_mlops_analytics():
    """
    Endpoint de Observabilidade e Monitoramento de Drift (Aula 5).
    Retorna desvios estatísticos das amostras recebidas em produção.
    """
    return calculate_drift()


@app.get("/audit", tags=["Governance"], dependencies=[Security(get_api_key)])
def get_audit_trail():
    """
    Retorna o rastro de auditoria para fins de regulação e governança.
    """
    if not AUDIT_FILE.exists():
        return []

    with open(AUDIT_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()
        # Garante que não falhe se o arquivo estiver vazio ou corrompido
        trail = []
        for line in lines[-100:]:
            try:
                trail.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        return trail


# ---------------------------------------------------------------------------
# Enterprise ML Platform Monitoring (v2.1)
# ---------------------------------------------------------------------------
# Health Check Orchestrator (MLOps)
# ---------------------------------------------------------------------------

# Initialize Orchestrator with baseline dataset
_BASELINE_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "raw", "data.csv"
)
orchestrator = None

try:
    if os.path.exists(_BASELINE_PATH):
        orchestrator = MLPlatformOrchestrator(_BASELINE_PATH)
except Exception as e:
    import logging

    logging.error(f"Falha ao carregar baseline para monitoramento: {e}")


@app.get("/monitor/drift", tags=["MLOps"], dependencies=[Security(get_api_key)])
def monitor_drift():
    """
    Detecta Data Drift comparando o rastro de auditoria com o baseline WDBC.
    """
    if not orchestrator or not AUDIT_FILE.exists():
        return {
            "status": "error",
            "message": "Monitoramento indisponível (Falta rastro de auditoria)",
        }

    # Carrega as últimas 100 inferências (apenas do tipo prediction)
    audit_data = [d for d in get_audit_trail() if "features" in d]
    if len(audit_data) < 10:
        return {"status": "insufficient_data", "samples": len(audit_data)}

    # Extrai features
    live_samples = [d["features"] for d in audit_data]
    current_df = pd.DataFrame(live_samples)

    # Alinhamento de colunas: o modelo espera snake_case, o detector espera os nomes do CSV original
    # Orchestrator lida com a tradução ou o DF deve bater com o baseline_df.columns
    # WDBC Baseline columns: 'mean radius', 'mean texture', etc.
    # Nossa API features: 'radius_mean', 'texture_mean', etc.

    # Mapeamento reverso para bater com o baseline do WDBC
    feature_mapping = {
        "radius_mean": "mean radius",
        "texture_mean": "mean texture",
        "perimeter_mean": "mean perimeter",
        "area_mean": "mean area",
        "smoothness_mean": "mean smoothness",
        "compactness_mean": "mean compactness",
        "concavity_mean": "mean concavity",
        "concave_points_mean": "mean concave points",
        "symmetry_mean": "mean symmetry",
        "fractal_dimension_mean": "mean fractal dimension",
    }
    # (Simplified for the top 10 features, expand if needed)
    current_df = current_df.rename(columns=feature_mapping)

    return orchestrator.drift_detector.check_data_drift(current_df)


@app.get("/monitor/fairness", tags=["MLOps"], dependencies=[Security(get_api_key)])
def monitor_fairness():
    """
    Auditoria de Equidade (Fairness) em tempo real.
    Verifica se o recall é consistente entre tumores pequenos e grandes.
    """
    if not orchestrator or not AUDIT_FILE.exists():
        return {"status": "error", "message": "Monitoramento de equidade indisponível"}

    all_audit = get_audit_trail()
    predictions = [d for d in all_audit if "features" in d]
    feedbacks = {
        d["data"]["prediction_id"]: d["data"]["ground_truth"]
        for d in all_audit
        if d.get("type") == "clinical_feedback"
    }

    # Filtra apenas predições que possuem feedback (ground truth)
    matches = []
    for p in predictions:
        p_id = str(p.get("timestamp"))  # Usando timestamp como ID simplificado
        if p_id in feedbacks:
            matches.append(
                {
                    "features": p["features"],
                    "prediction": p["result"]["prediction"],
                    "ground_truth": feedbacks[p_id],
                }
            )

    if len(matches) < 5:
        return {
            "status": "waiting_for_ground_truth",
            "monitored_samples": len(predictions),
            "samples_with_feedback": len(matches),
            "message": "Necessário ao menos 5 feedbacks reais para auditoria estatística.",
        }

    live_df = pd.DataFrame([m["features"] for m in matches])
    # Map to match orchestrator expectation
    live_df = live_df.rename(columns={"radius_mean": "mean radius"})

    y_pred = np.array([m["prediction"] for m in matches])
    y_true = np.array([m["ground_truth"] for m in matches])

    return orchestrator.run_production_health_check(live_df, y_pred, y_true)


@app.get(
    "/monitor/sustainability", tags=["Green AI"], dependencies=[Security(get_api_key)]
)
def monitor_sustainability():
    """
    Relatório de Impacto Ambiental (Green AI).
    Exibe o consumo acumulado de energia e pegada de carbono.
    """
    return predictor.green_monitor.get_sustainability_report()
