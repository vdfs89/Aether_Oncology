# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Base leve com Python 3.11
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim

# Metadados da imagem
LABEL maintainer="Equipe Aether Oncology" \
      version="1.0.0" \
      description="Tumor Classifier API — MLP PyTorch via FastAPI"

# Variáveis de ambiente para Python não gerar .pyc e não bufferizar stdout/stderr
# MLFLOW_TRACKING_URI fixado em /app/mlruns para evitar criação de paths com %20 no host
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MLFLOW_TRACKING_URI=/app/mlruns

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Dependências de sistema (mínimo necessário para PyTorch CPU)
# ─────────────────────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Dependências Python
# Copiamos apenas o pyproject.toml ANTES do código fonte para maximizar
# o cache de camadas — se o código mudar mas as deps não, esta camada
# não é reconstruída.
# ─────────────────────────────────────────────────────────────────────────────
WORKDIR /app

COPY pyproject.toml .

RUN pip install --no-cache-dir uv \
    && uv pip install --system --no-cache .

# ─────────────────────────────────────────────────────────────────────────────
# Stage 4: Código-fonte e artefatos do modelo
# ─────────────────────────────────────────────────────────────────────────────
COPY src/ src/
COPY models/ models/
COPY data/raw/data.csv data/raw/data.csv

# Cria diretórios para persistência (Auditoria e Cache RAG)
RUN mkdir -p logs .cache/research \
    && chown -R appuser:appuser /app

# ─────────────────────────────────────────────────────────────────────────────
# Stage 5: Configuração de runtime
# ─────────────────────────────────────────────────────────────────────────────
# Usuário não-root para segurança
USER appuser

# Volumes para persistência de dados críticos (Aula 7 e Otimização)
# - logs: Audit Trail e Governança
# - .cache: Cache RAG (PubMed/Cochrane)
VOLUME ["/app/logs", "/app/.cache"]

EXPOSE 8000

# Healthcheck nativo do Docker
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Comando de inicialização
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
