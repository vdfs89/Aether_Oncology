# ruff: noqa: E402
"""
main.py
=======
Camada web thin da Aether Oncology API v3.0.

O FastAPI NÃO conhece PyTorch, tensores ou Scikit-Learn.
Ele apenas:
  1. Valida o JSON de entrada via Pydantic (OralCancerRequest — 8 campos)
  2. Delega inferência ao modelo local treinado no Oral Cancer dataset
  3. Devolve PredictionResponse — com warning quando confidence == 'Low'

Dataset: Oral Cancer Top 30 Countries (160k records, MIT License)
Target:  high_risk — triagem binária (0=Early, 1=Moderate/Late)

Arquitetura de inferência:
  - Preprocessor : ColumnTransformer (StandardScaler + OHE) via joblib
  - MLP           : PyTorch (input_dim dinâmico após OHE)
  - Fallback      : 503 se artefatos não existirem (xfail em CI pré-treino)

Iniciar o servidor:
    uvicorn src.main:app --reload
"""

import asyncio
import json
import logging
import os

from dotenv import load_dotenv

load_dotenv()

import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
import torch
from fastapi import FastAPI, HTTPException, Request, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.security.api_key import APIKeyHeader
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from src.api.schemas import OralCancerRequest, PredictionResponse
from src.core.logging import request_id_contextvar, setup_logging
from src.ml_platform.orchestrator import MLPlatformOrchestrator
from src.models.mlp import MLP
from src.services.audit import (
    AUDIT_FILE,
    calculate_drift,
    decrypt_entry,
    get_fernet,
    log_prediction,
    seal_and_append,
)
from src.services.audit_logger import get_audit_logger
from src.services.inference_client import inference_client
from src.services.predictor import predictor

# ---------------------------------------------------------------------------
# Platform Metadata (v2.2)
# ---------------------------------------------------------------------------

APP_VERSION = "3.1.0"
GIT_SHA = os.getenv("RENDER_GIT_COMMIT", os.getenv("GITHUB_SHA", "dev-local"))

# ---------------------------------------------------------------------------
# Platform Initialization (v2.2)
# ---------------------------------------------------------------------------

setup_logging()

limiter = Limiter(key_func=get_remote_address)

# ---------------------------------------------------------------------------
# Segurança — API Key lida de variável de ambiente
# ---------------------------------------------------------------------------

_RAW_API_KEY = os.getenv("API_KEY")

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
# Oral Cancer model globals (loaded at startup, shared across requests)
# ---------------------------------------------------------------------------

_oral_preprocessor = None  # sklearn ColumnTransformer
_oral_model: MLP | None = None  # PyTorch MLP
_oral_input_dim: int = 0
_oral_calibrator = None  # sklearn Calibrator
_oral_ood_detector = None  # ClinicalOODDetector
_oral_lineage: dict | None = None  # data_lineage.json


def _load_oral_cancer_artifacts() -> bool:
    """
    Tenta carregar os artefatos treinados do pipeline Oral Cancer.
    Retorna True se todos os artefatos clínicos foram carregados com sucesso.
    """
    global _oral_preprocessor, _oral_model, _oral_input_dim
    global _oral_calibrator, _oral_ood_detector, _oral_lineage

    from pathlib import Path

    base = Path(__file__).resolve().parents[1]
    # Procura em root/models/ independente do CWD
    candidates = [
        base / "models",
        Path.cwd() / "models",
        Path("/app/models"),
    ]

    models_dir = next(
        (p for p in candidates if (p / "preprocessor.joblib").exists()), None
    )

    if models_dir is None:
        logging.warning(
            "BOOT: Artefatos Oral Cancer não encontrados. "
            "Execute `python -m src.train` para treinar o modelo."
        )
        return False

    preprocessor_path = models_dir / "preprocessor.joblib"
    weights_path = models_dir / "aether_mlp_v2.pth"
    calibrator_path = models_dir / "calibrator.joblib"
    ood_detector_path = models_dir / "ood_detector.joblib"
    lineage_path = models_dir / "data_lineage.json"

    try:
        _oral_preprocessor = joblib.load(preprocessor_path)
        _oral_calibrator = joblib.load(calibrator_path)

        from src.ml.pipelines.preprocessing.ood import ClinicalOODDetector

        _oral_ood_detector = ClinicalOODDetector.load(str(ood_detector_path))

        with open(lineage_path) as f:
            _oral_lineage = json.load(f)

        # Inferir input_dim via dummy transform
        _dummy = pd.DataFrame(
            [
                {
                    "Age": 50,
                    "Survival_Rate": 0.7,
                    "Tobacco_Use": "No",
                    "Alcohol_Use": "No",
                    "Country": "Brazil",
                    "Gender": "Male",
                    "Socioeconomic_Status": "Middle",
                    "Treatment_Type": "Unknown",
                }
            ]
        )
        _oral_input_dim = _oral_preprocessor.transform(_dummy).shape[1]

        _oral_model = MLP(input_shape=_oral_input_dim, hidden_dims=[128, 64, 32])
        if weights_path.exists():
            _oral_model.load_state_dict(
                torch.load(weights_path, weights_only=True, map_location="cpu")
            )
            _oral_model.eval()
            logging.info(
                "BOOT: Oral Cancer model carregado — input_dim=%d", _oral_input_dim
            )
        else:
            logging.warning("BOOT: Pesos MLP não encontrados (%s).", weights_path)
            _oral_model = None
            return False

        return True
    except Exception as exc:
        logging.error("BOOT: Falha ao carregar artefatos Oral Cancer: %s", exc)
        return False


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

    # ── Configuration & secrets (resilient: warn, never crash the boot) ──
    # A PaaS (Render / Fly / K8s) MUST be able to start the container. Missing
    # optional config degrades a single feature — it must not take the whole
    # API down in a crash loop. Readiness is reported via /health/* instead.
    from cryptography.fernet import Fernet

    api_key = os.getenv("API_KEY")
    if not api_key:
        os.environ["API_KEY"] = "aether-oncology-eval-2026"
        logging.warning(
            "BOOT: API_KEY ausente — usando chave de avaliação padrão. Defina 'API_KEY' em produção."
        )
    elif api_key == "aether-oncology-eval-2026":
        logging.warning(
            "BOOT: Utilizando API_KEY padrão de avaliação. Defina 'API_KEY' para produção."
        )

    # LLM provider keys gate the (experimental) clinical chat copilot only.
    # The diagnostic /predict endpoint does not need them.
    for _provider_var in ("OPENAI_API_KEY", "GROQ_API_KEY", "GEMINI_API_KEY"):
        if not os.getenv(_provider_var):
            logging.warning(
                "BOOT: %s ausente — copiloto clínico (chat) indisponível; /predict não é afetado.",
                _provider_var,
            )

    # Audit-trail encryption (HIPAA). Prefer a persistent operator-provided key.
    # If absent/invalid, fall back to an EPHEMERAL key so the service can boot —
    # audit logs stay encrypted, but are not decryptable across restarts.
    if not os.getenv("AUDIT_ENCRYPTION_KEY"):
        os.environ["AUDIT_ENCRYPTION_KEY"] = Fernet.generate_key().decode()
        logging.warning(
            "BOOT: AUDIT_ENCRYPTION_KEY ausente — gerada chave EFÊMERA. Logs de "
            "auditoria não sobreviverão a reinícios. Defina uma chave persistente "
            "em produção (HIPAA)."
        )
    try:
        get_fernet()
    except Exception as e:
        os.environ["AUDIT_ENCRYPTION_KEY"] = Fernet.generate_key().decode()
        logging.warning(
            "BOOT: AUDIT_ENCRYPTION_KEY inválida (%s) — regenerada efêmera.", e
        )

    # ── Model artifacts (resilient: warn + routes return 503 until ready) ──
    if not os.path.exists(_BASELINE_PATH):
        logging.warning(
            "BOOT: baseline ausente (%s) — monitoramento de drift/fairness degradado.",
            _BASELINE_PATH,
        )

    from pathlib import Path

    base = Path(__file__).resolve().parents[1]
    candidates = [base / "models", Path.cwd() / "models", Path("/app/models")]
    models_dir = next(
        (p for p in candidates if (p / "preprocessor.joblib").exists()), None
    )
    if not models_dir:
        logging.warning(
            "BOOT: artefatos do modelo ausentes — /predict responderá 503 até o treino."
        )

    # 1. Oral Cancer model (primary inference) — degrade to 503, do not crash.
    try:
        if _load_oral_cancer_artifacts():
            logging.info(
                f"BOOT [{request_id}]: Oral Cancer MLP pronto para inferência."
            )
        else:
            logging.warning(
                f"BOOT [{request_id}]: Oral Cancer MLP indisponível — /predict responderá 503."
            )
    except Exception as e:
        logging.warning(
            f"BOOT [{request_id}]: Falha ao carregar Oral Cancer MLP ({e}) — /predict responderá 503."
        )

    # 2. Legacy WDBC predictor (monitor/* endpoints) — optional.
    try:
        predictor.load_model()
        logging.info(
            f"BOOT [{request_id}]: Legacy WDBC predictor carregado (monitor/)."
        )
    except Exception as e:
        logging.warning(
            f"BOOT [{request_id}]: Legacy WDBC predictor indisponível ({e})."
        )

    # 3. MLPlatformOrchestrator (MLOps Health)
    try:
        app.state.orchestrator = MLPlatformOrchestrator(_BASELINE_PATH)
        await app.state.orchestrator.startup()
        logging.info(f"BOOT [{request_id}]: MLPlatformOrchestrator started.")
    except Exception as e:
        app.state.orchestrator = None
        logging.warning(
            f"BOOT [{request_id}]: MLPlatformOrchestrator failed to start: {e}"
        )

    # 4. ClinicalInferenceRuntime (Chat Copilot)
    from src.orchestration.clinical_runtime import ClinicalInferenceRuntime

    try:
        app.state.runtime = ClinicalInferenceRuntime()
        await app.state.runtime.startup()
        logging.info(f"BOOT [{request_id}]: ClinicalInferenceRuntime ready.")
    except Exception as e:
        app.state.runtime = None
        logging.error(
            f"BOOT [{request_id}]: ClinicalInferenceRuntime failed to start: {e}"
        )

    # 5. Approval cleanup worker — sweeps expired PENDING approvals every 60s
    # so timeout enforcement does not depend on the FE setTimeout.
    from src.services.approval_store import approval_repository

    async def _approval_cleanup_loop():
        while True:
            try:
                await asyncio.sleep(60)
                expired = await asyncio.to_thread(approval_repository.cleanup_expired)
                if expired:
                    logging.info(
                        "APPROVAL_CLEANUP: marked %d pending approval(s) as EXPIRED",
                        expired,
                    )
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logging.warning("APPROVAL_CLEANUP: sweep failed: %s", exc)

    app.state.approval_cleanup_task = asyncio.create_task(_approval_cleanup_loop())
    logging.info(f"BOOT [{request_id}]: approval cleanup worker started (60s).")

    # 6. Audit archival worker — moves audit docs older than the retention
    # window to a cold MongoDB collection, then expires them from the active one
    # (chain head preserved). In-process, no external scheduler.
    from src.services import audit_archive_job

    async def _audit_archive_loop():
        if not audit_archive_job.enabled():
            return
        period = audit_archive_job.interval_seconds()
        while True:
            try:
                res = await asyncio.to_thread(audit_archive_job.run_archive_cycle)
                if res.get("archived"):
                    logging.info("AUDIT_ARCHIVE: %s", res)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logging.warning("AUDIT_ARCHIVE: cycle failed: %s", exc)
            await asyncio.sleep(period)

    app.state.audit_archive_task = asyncio.create_task(_audit_archive_loop())
    logging.info(f"BOOT [{request_id}]: audit archival worker started.")

    # 7. Audit volume monitor — hourly Slack alert on silence/spike (T3).
    async def _audit_volume_loop():
        while True:
            await asyncio.sleep(3600)
            try:
                await asyncio.to_thread(audit_archive_job.check_volume_anomaly)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logging.warning("AUDIT_VOLUME: check failed: %s", exc)

    app.state.audit_volume_task = asyncio.create_task(_audit_volume_loop())
    logging.info(f"BOOT [{request_id}]: audit volume monitor started (1h).")

    yield

    # ── Shutdown Logic ──
    logging.info(f"SHUTDOWN [{request_id}]: Initiating graceful termination...")

    # Stop approval cleanup worker
    cleanup_task = getattr(app.state, "approval_cleanup_task", None)
    if cleanup_task is not None:
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass
        logging.info(f"SHUTDOWN [{request_id}]: approval cleanup worker stopped.")

    # Stop audit archival worker
    archive_task = getattr(app.state, "audit_archive_task", None)
    if archive_task is not None:
        archive_task.cancel()
        try:
            await archive_task
        except asyncio.CancelledError:
            pass
        logging.info(f"SHUTDOWN [{request_id}]: audit archival worker stopped.")

    # Stop audit volume monitor
    volume_task = getattr(app.state, "audit_volume_task", None)
    if volume_task is not None:
        volume_task.cancel()
        try:
            await volume_task
        except asyncio.CancelledError:
            pass
        logging.info(f"SHUTDOWN [{request_id}]: audit volume monitor stopped.")

    # Shutdown clinical runtime if exists
    if hasattr(app.state, "runtime") and app.state.runtime:
        await app.state.runtime.shutdown()
        logging.info(f"SHUTDOWN [{request_id}]: ClinicalInferenceRuntime stopped.")

    # Shutdown orchestrator if exists
    if hasattr(app.state, "orchestrator") and app.state.orchestrator:
        await app.state.orchestrator.shutdown()
        logging.info(f"SHUTDOWN [{request_id}]: MLPlatformOrchestrator stopped.")

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

from src.api.routes.clinical_chat import router as clinical_chat_router

app.include_router(clinical_chat_router, prefix="/api/v1/clinical")


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


@app.middleware("http")
async def audit_trail_middleware(request: Request, call_next):
    """
    HIPAA Audit Trail Middleware:
    - Logs access to sensitive endpoints (/audit, /feedback, /analytics)
    - Captures HTTP method and response status
    - Tracks request correlation via X-Request-ID
    """
    audit_logger = get_audit_logger()
    request_id = request_id_contextvar.get()

    # List of endpoints to audit
    sensitive_paths = ["/audit", "/feedback", "/analytics", "/monitor/"]
    should_audit = any(request.url.path.startswith(p) for p in sensitive_paths)

    if should_audit and request.method in ["GET", "POST", "DELETE"]:
        # Log access attempt (will log after call_next to capture status)
        response = await call_next(request)

        # Determine action from HTTP method
        action_map = {"GET": "READ", "POST": "WRITE", "DELETE": "DELETE"}
        action = action_map.get(request.method, "READ")

        audit_logger.log_access(
            resource_type=request.url.path.strip("/").split("/")[0] or "api",
            action=action,
            user_id=request.headers.get("access_token"),
            details={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "request_id": request_id,
            },
        )
        return response
    else:
        return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://aether-oncology.vercel.app",  # Production Frontend
        "https://aether-oncology-portal.vitorsilva.engineer",  # Custom Domain
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:5173",
        "http://localhost:3000",
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
# Multimodality Readiness (v2.1) — preserved for backward compatibility
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
# v3.0: OralCancerRequest e PredictionResponse importados de src/api/schemas.py
# ---------------------------------------------------------------------------
# (OralCancerRequest, PredictionResponse) → já importados no topo do arquivo.


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


# PredictResponse → v3.0 usa PredictionResponse importado de src/api/schemas.py


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
    response_model=PredictionResponse,
    status_code=status.HTTP_200_OK,
    tags=["Prediction"],
    summary="Triagem de risco de câncer oral (Oral Cancer v3.0)",
    description=(
        "Recebe dados clínicos do paciente e retorna o nível de risco de "
        "diagnóstico avançado (Moderate/Late). Dataset: Oral Cancer Top 30 "
        "Countries (160k registros, MIT License). "
        "**confidence='Low'** ativa o campo `warning` — revisão clínica obrigatória."
    ),
    dependencies=[Security(get_api_key)],
)
@limiter.limit("10/minute")
async def make_prediction(
    request: Request, features: OralCancerRequest
) -> PredictionResponse:
    """
    Pipeline de inferência v3.0 — Oral Cancer High Risk:

    1. Valida OralCancerRequest via Pydantic
    2. Monta DataFrame com as 8 colunas esperadas pelo ColumnTransformer
    3. Preprocessor.transform() → StandardScaler + OHE
    4. MLP.forward() + sigmoid → probabilidade
    5. Confidence tiering: margem absoluta em relação ao limiar 0.5
    6. warning ativado quando confidence == 'Low' (safety loop clínico)
    7. Auditoria assíncrona via asyncio.to_thread
    """
    if _oral_preprocessor is None or _oral_model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Modelo Oral Cancer não carregado. "
                "Execute `python -m src.train` para treinar os artefatos."
            ),
        )

    try:
        input_df = pd.DataFrame(
            [
                {
                    "Age": features.age,
                    "Survival_Rate": features.survival_rate
                    if features.survival_rate is not None
                    else 0.5,
                    "Tobacco_Use": features.tobacco_use,
                    "Alcohol_Use": features.alcohol_use,
                    "Country": features.country,
                    "Gender": features.gender,
                    "Socioeconomic_Status": features.socioeconomic_status,
                    "Treatment_Type": features.treatment_type
                    if features.treatment_type is not None
                    else "Unknown",
                }
            ]
        )

        X = _oral_preprocessor.transform(input_df)

        if np.isnan(X).any() or np.isinf(X).any():
            raise ValueError(
                "Valores NaN/Inf detectados após pré-processamento. "
                "Verifique os dados de entrada."
            )

        X_tensor = torch.FloatTensor(X)
        with torch.no_grad():
            logit = _oral_model(X_tensor)
            prob = float(torch.sigmoid(logit).item())

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na inferência: {exc}",
        ) from exc

    # Nível de risco
    risk_level = "High" if prob >= 0.5 else "Low"

    # Confidence tiering — baseada na margem absoluta em relação ao limiar
    margin = abs(prob - 0.5)
    if margin >= 0.30:
        confidence = "High"
    elif margin >= 0.15:
        confidence = "Medium"
    else:
        confidence = "Low"

    # Safety loop: warning obrigatório quando confidence == 'Low'
    warning: str | None = None
    if confidence == "Low":
        warning = (
            "⚠️ BAIXA CONFIANÇA: Probabilidade próxima ao limiar de decisão ("
            f"{prob:.1%}). Revisão clínica manual dupla obrigatória "
            "antes de qualquer intervenção."
        )

    result_for_audit = {
        "risk_level": risk_level,
        "probability": round(prob, 4),
        "confidence": confidence,
        "prediction": 1 if risk_level == "High" else 0,
        "label": risk_level,
        "status": "success",
    }

    # Auditoria assíncrona — não bloqueia o event loop
    async def _audit_prediction():
        request_id = request_id_contextvar.get()
        user_id = request.headers.get("access_token")
        await asyncio.to_thread(log_prediction, features.model_dump(), result_for_audit)
        # Log with new audit logger (includes PHI scrubbing)
        audit_logger = get_audit_logger()
        await asyncio.to_thread(
            audit_logger.log_prediction,
            request_id,
            features.model_dump(),
            result_for_audit,
            user_id,
        )

    await _audit_prediction()

    return PredictionResponse(
        risk_level=risk_level,
        probability=round(prob, 4),
        confidence=confidence,
        warning=warning,
        model_version="3.0.0",
    )


# ---------------------------------------------------------------------------
# Clinical Feedback Loop — Ground Truth (v2.1)
# ---------------------------------------------------------------------------


class FeedbackRequest(BaseModel):
    """Dados de feedback clínico (Ground Truth)."""

    prediction_id: str = Field(..., description="ID da predição (timestamp/hash)")
    ground_truth: int = Field(..., ge=0, le=1, description="1 = Maligno, 0 = Benigno")
    notes: str | None = None


@app.post("/feedback", tags=["Clinical Feedback"], dependencies=[Security(get_api_key)])
async def clinical_feedback(request: Request, feedback: FeedbackRequest):
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
        seal_and_append(feedback_entry, AUDIT_FILE)

        # Log with audit logger (HIPAA-compliant)
        request_id = request_id_contextvar.get()
        audit_logger = get_audit_logger()
        audit_logger.log_feedback(
            request_id,
            feedback.model_dump(),
            request.headers.get("access_token"),
        )

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
def get_audit_trail(request: Request):
    """
    Retorna o rastro de auditoria para fins de regulação e governança.
    """
    # Log this audit access (HIPAA compliance)
    audit_logger = get_audit_logger()
    audit_logger.log_access(
        resource_type="audit_trail",
        action="READ",
        user_id=request.headers.get("access_token"),
        details={"request_id": request_id_contextvar.get()},
    )

    if not AUDIT_FILE.exists():
        return []

    with open(AUDIT_FILE, "rb") as f:
        lines = f.readlines()
        # Garante que não falhe se o arquivo estiver vazio ou corrompido
        trail = []
        for line in lines[-100:]:
            line = line.strip()
            if not line:
                continue
            try:
                decoded = decrypt_entry(line)
            except Exception:
                continue
            # Don't surface rotation segment headers in the audit view.
            if isinstance(decoded, dict) and decoded.get("type") == "segment_header":
                continue
            trail.append(decoded)
        return trail


@app.get(
    "/compliance/report", tags=["Governance"], dependencies=[Security(get_api_key)]
)
def get_compliance_report(request: Request, days: int | None = None):
    """Automated HIPAA compliance report over the audit trail (Mongo/JSONL),
    including the tamper-evidence integrity verdict."""
    from src.services.compliance_report import generate_report

    get_audit_logger().log_access(
        resource_type="audit_trail",
        action="EXPORT",
        user_id=request.headers.get("access_token"),
        details={"request_id": request_id_contextvar.get(), "report_days": days},
    )
    return generate_report(days=days)


# ---------------------------------------------------------------------------
# Enterprise ML Platform Monitoring (v2.1)
# ---------------------------------------------------------------------------
# Health Check Orchestrator (MLOps)
# ---------------------------------------------------------------------------

# Initialize Orchestrator with baseline dataset (instantiated in lifespan)
_BASELINE_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "raw", "data.csv"
)


@app.get("/monitor/drift", tags=["MLOps"], dependencies=[Security(get_api_key)])
def monitor_drift(request: Request):
    """
    Detecta Data Drift comparando o rastro de auditoria com o baseline WDBC.
    """
    orchestrator = request.app.state.orchestrator
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
def monitor_fairness(request: Request):
    """
    Auditoria de Equidade (Fairness) em tempo real.
    Verifica se o recall é consistente entre tumores pequenos e grandes.
    """
    orchestrator = request.app.state.orchestrator
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
