# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Frontend Build (Node.js + Vite)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20.12-slim AS frontend-builder
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
# Stage 2: Backend (Python 3.11)
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim-bookworm

# Metadados da imagem
LABEL maintainer="Equipe Aether Oncology" \
      version="2.0.0" \
      description="Tumor Classifier API — MLP PyTorch via FastAPI + Modular ESM Frontend"

# Variáveis de ambiente
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MLFLOW_TRACKING_URI=/app/mlruns

# Dependências de sistema e hardening de segurança (patches CVEs)
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Usuário não-root
RUN useradd --create-home --shell /bin/bash appuser
WORKDIR /app

# Dependências Python
COPY pyproject.toml .
RUN pip install --no-cache-dir uv \
    && uv pip install --system --no-cache .

# Código-fonte e artefatos
COPY src/ src/
COPY models/ models/
COPY data/raw/ data/raw/

# Sobrescrever a pasta estática com o build do Vite (para que o FastAPI sirva os arquivos otimizados)
# O Vite gera o output em /build/dist
COPY --from=frontend-builder /build/src/static/aether-oncology-portal/dist/ ./src/static/aether-oncology-portal/

# Cria diretórios para persistência
RUN mkdir -p logs .cache/research \
    && chown -R appuser:appuser /app

USER appuser

# Volumes
VOLUME ["/app/logs", "/app/.cache"]

EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Inicialização
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
