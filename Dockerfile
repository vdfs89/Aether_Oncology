# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Base leve com Python 3.11
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim

# Metadados da imagem
LABEL maintainer="Equipe Aether Oncology" \
      version="1.0.0" \
      description="Tumor Classifier API — MLP PyTorch via FastAPI"

# Variáveis de ambiente para Python não gerar .pyc e não bufferizar stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

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

# Gera o dataset WDBC e treina o modelo durante o build
# (data/raw/ e models/ estão no .gitignore — gerados aqui para produção)
RUN mkdir -p data/raw models \
    && python -c "
from sklearn.datasets import load_breast_cancer
import pandas as pd
data = load_breast_cancer()
def normalize(n):
    n = n.strip()
    if n.startswith('mean '): return n[5:].replace(' ','_') + '_mean'
    if n.endswith(' error'): return n[:-6].replace(' ','_') + '_se'
    if n.startswith('worst '): return n[6:].replace(' ','_') + '_worst'
    return n.replace(' ','_')
cols = [normalize(c) for c in data.feature_names]
df = __import__('pandas').DataFrame(data.data, columns=cols)
df['target'] = 1 - data.target
df.to_csv('data/raw/data.csv', index=False)
print('Dataset gerado:', df.shape)
" \
    && python -m src.train \
    && echo 'Treino concluido'

# ─────────────────────────────────────────────────────────────────────────────
# Stage 5: Configuração de runtime
# ─────────────────────────────────────────────────────────────────────────────
# Usuário não-root para segurança (best practice NVIDIA/Docker)
RUN useradd --create-home appuser
USER appuser

EXPOSE 8000

# Healthcheck nativo do Docker — evita que o container fique "Up" sem estar pronto
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Comando de inicialização
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
