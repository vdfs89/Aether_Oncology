# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Frontend Build (Node.js + Vite)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /build

# Copy package files for caching
COPY package*.json ./
RUN npm install

# Copy source files needed for Vite build
COPY vite.config.js ./
COPY src/static/aether-oncology-portal/ ./src/static/aether-oncology-portal/

# Build the frontend
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Backend & Runtime (Python 3.11)
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim
# Note: "slim" without "bookworm" tag defaults to latest stable (bookworm) but allows point updates.

# Metadados da imagem
LABEL maintainer="Equipe Aether Oncology" \
      version="2.1.0" \
      description="Tumor Classifier API — Secured & Hardened Production Image"

# Variáveis de ambiente
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MLFLOW_TRACKING_URI=/app/mlruns \
    PIP_NO_CACHE_DIR=1

# Dependências de sistema e hardening de segurança (patches CVEs)
# 1. Update and Upgrade to patch OS-level vulnerabilities
# 2. Install build-essential for library compilation
# 3. Clean up immediately after use to reduce attack surface
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Usuário não-root para segurança (princípio do privilégio mínimo)
RUN useradd --create-home --shell /bin/bash appuser
WORKDIR /app

# Instalar dependências Python (usando uv para velocidade e resolução determinística)
COPY pyproject.toml requirements.txt ./
RUN pip install --upgrade pip && \
    pip install uv && \
    uv pip install --system --no-cache -r requirements.txt && \
    uv pip install --system --no-cache .

# Limpeza de ferramentas de build para reduzir vulnerabilidades
RUN apt-get purge -y --auto-remove build-essential && \
    rm -rf /var/lib/apt/lists/*

# Código-fonte e artefatos
COPY src/ src/
COPY models/ models/
COPY data/raw/ data/raw/

# Sobrescrever a pasta estática com o build do Vite
COPY --from=frontend-builder /build/src/static/aether-oncology-portal/dist/ ./src/static/aether-oncology-portal/

# Cria diretórios para persistência e define permissões
RUN mkdir -p logs .cache/research \
    && chown -R appuser:appuser /app

USER appuser

# Volumes para logs e cache de pesquisa
VOLUME ["/app/logs", "/app/.cache"]

EXPOSE 8000

# Healthcheck robusto
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Comando de inicialização
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
