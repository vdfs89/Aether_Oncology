# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Frontend Build (Node.js + Vite)
# ─────────────────────────────────────────────────────────────────────────────
# node:22-bookworm-slim — LTS with latest security patches (fewer CVEs vs 20-slim)
FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /build

# Copy package files for caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source files needed for Vite build
COPY vite.config.js ./
COPY src/static/aether-oncology-portal/ ./src/static/aether-oncology-portal/

# Build the frontend
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Backend & Runtime (Python 3.12 — fewer CVEs than 3.11)
# ─────────────────────────────────────────────────────────────────────────────
# python:3.12-slim-bookworm — explicit tag prevents silent digest changes;
# 3.12 receives active security patches and has fewer known CVEs than 3.11.
FROM python:3.12-slim-bookworm

# Image metadata
LABEL maintainer="Equipe Aether Oncology" \
      version="2.1.0" \
      description="Tumor Classifier API — Secured & Hardened Production Image"

# Environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MLFLOW_TRACKING_URI=/app/mlruns \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# ── OS hardening ──────────────────────────────────────────────────────────────
# 1. Patch ALL OS packages (apt-get upgrade) to pull latest Debian security fixes
# 2. Install only what is strictly required for compilation
# 3. Purge build tools and clean apt state immediately — reduces image surface
# 4. Remove cached lists; the final layer contains no package manager state
RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
    && pip install --upgrade pip setuptools wheel \
    && apt-get purge -y --auto-remove build-essential \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Non-root user (principle of least privilege)
RUN useradd --create-home --shell /bin/bash appuser
WORKDIR /app

# ── Python dependencies ───────────────────────────────────────────────────────
# uv is used for fast, deterministic resolution.
# We upgrade pip/setuptools/wheel first so the resolver uses patched versions.
COPY pyproject.toml requirements.txt ./
RUN pip install uv \
    && uv pip install --system --no-cache -r requirements.txt \
    && uv pip install --system --no-cache . \
    && pip uninstall -y uv \
    && rm -rf ~/.cache/pip

# ── Application code & artefacts ─────────────────────────────────────────────
COPY src/ src/
COPY models/ models/
COPY data/raw/ data/raw/

# Replace static folder with Vite build output
COPY --from=frontend-builder /build/src/static/aether-oncology-portal/dist/ \
     ./src/static/aether-oncology-portal/

# ── Runtime directories & ownership ──────────────────────────────────────────
RUN mkdir -p logs .cache/research \
    && chown -R appuser:appuser /app

USER appuser

# Volumes for logs and research cache
VOLUME ["/app/logs", "/app/.cache"]

EXPOSE 8000

# Robust healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Startup command
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
