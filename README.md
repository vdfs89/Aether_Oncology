# Aether Oncology

> **"Precision for Life"** — Inteligência Artificial a serviço da triagem oncológica segura.

**Autor:** Vitor Diogo Fonseca da Silva
**Tech Challenge 01 — FIAP Pós-Tech · Engenharia de Machine Learning**

---

## 📖 Motivação: O que o IBM Watson nos ensinou

Em 2017, o IBM Watson for Oncology foi descontinuado em vários hospitais após gerar recomendações consideradas "inseguras" por oncologistas. O diagnóstico do fracasso foi claro: um sistema de IA que age como caixa-preta, sem transparência, sem contexto clínico e sem governança — não serve à medicina. Serve ao marketing.

O Aether Oncology nasce como resposta direta a esse erro.

Em vez de recomendar tratamentos de forma autônoma, o sistema propõe um paradigma diferente: **triagem de segurança assistida**. O modelo aponta risco; o médico decide. A IA como ferramenta — não como oráculo.

---

## 🎯 Princípios de Engenharia

### Recall acima de tudo

Em oncologia, um Falso Negativo não é um erro estatístico — é uma vida que perde a janela de tratamento precoce. Toda a arquitetura deste projeto foi construída com uma obsessão única: **maximizar o Recall (Sensibilidade)**, aceitando conscientemente uma taxa maior de Falsos Positivos como trade-off ético justificável.

### MLOps como contrato, não como feature

IA na saúde não pode viver em notebooks. Este projeto trata MLOps como infraestrutura crítica:

- **Contratos de dados** via Pydantic e Pandera — nenhum dado entra no modelo sem validação explícita
- **Rastreabilidade total** via MLflow — cada experimento, parâmetro e métrica é auditável
- **Reprodutibilidade garantida** — qualquer predição pode ser explicada e replicada

---

## 🏗️ Estrutura do Repositório

```
aether-oncology/
├── src/
│   ├── main.py                  # API FastAPI (/predict + /health)
│   ├── train.py                 # Pipeline de treino com Early Stopping e MLflow
│   ├── models/
│   │   └── mlp.py               # Arquitetura TumorMLP — única fonte de verdade
│   └── services/
│       └── predictor.py         # PredictorService (Singleton) — importa MLP de mlp.py
├── data/
│   └── raw/                     # Dataset WDBC (Wisconsin Diagnostic Breast Cancer)
├── models/                      # Artefatos gerados: pesos .pth e pipeline .joblib
├── notebooks/
│   └── eda_aether_oncology.ipynb  # EDA + baseline + treino MLP + tabela comparativa
├── tests/
│   ├── test_schema.py           # Validação de schema com Pandera
│   └── test_api.py              # Testes de integração da API
├── docs/
│   ├── MODEL_CARD.md            # Documentação ética e limites do modelo
│   └── MONITORING.md            # Protocolo de monitoramento pós-deploy
├── Dockerfile                   # Imagem de produção (usuário não-root + healthcheck)
├── .dockerignore                # Exclui mlruns/, notebooks/, cache
├── .gitignore                   # Exclui artefatos, dados e cache
├── Makefile                     # Automação completa do ciclo de desenvolvimento
├── pyproject.toml               # Source of truth: dependências + ruff + pytest
└── README.md
```

---

## 🚀 Executando o Projeto

### Passo a passo completo

```bash
# 1. Instalar dependências
make install

# 2. Gerar o dataset WDBC via scikit-learn (sem download externo)
python -c "
from sklearn.datasets import load_breast_cancer
import pandas as pd
data = load_breast_cancer()
df = pd.DataFrame(data.data, columns=[c.lower().replace(' ','_') for c in data.feature_names])
df['target'] = 1 - data.target  # 1=Maligno, 0=Benigno
df.to_csv('data/raw/data.csv', index=False)
"

# 3. Treinar o modelo (registra métricas no MLflow)
make train

# 4. Rodar os testes com cobertura
make test

# 5. Subir a API de inferência
make run
# → http://localhost:8000/docs
```

### Pipeline completo para o avaliador (um comando)

```bash
make setup-and-test   # install → train → test → lint
```

---

## 🔬 Destaques de Implementação

### 🧠 Arquitetura Neural: TumorMLP

Definida **uma única vez** em `src/models/mlp.py` e importada tanto pelo `train.py` quanto pelo `predictor.py`. Essa decisão elimina o risco de *mismatch* entre os pesos salvos e o modelo carregado na API.

- **Topologia:** `Linear(30→64) → BatchNorm → ReLU → Dropout → Linear(64→32) → BatchNorm → ReLU → Dropout → Linear(32→1)`
- **BCEWithLogitsLoss** — numericamente estável (evita overflow no sigmoid)
- **Early Stopping** — monitora `val_loss` com paciência configurável
- **`state_dict`** — serialização segura em produção (não executa pickle arbitrário)

### ⚙️ Decisões de Engenharia

| Decisão | Justificativa |
|---|---|
| `MLP` importada em `predictor.py` | Garante que treino e inferência usam **exatamente** a mesma arquitetura |
| `StandardScaler` dentro do `Pipeline` | Evita data leakage — a escala do treino é reproduzida na inferência |
| `Singleton` no `PredictorService` | Modelo carregado uma vez no startup — latência < 200 ms por predição |
| Validação via Pandera | Medições fora dos limites biológicos são rejeitadas antes do modelo |
| MLflow como backbone de governança | Cada treino gera run rastreável com params, métricas e artefatos |

### 📊 Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Liveness probe — usado pelo HEALTHCHECK do Docker |
| `POST` | `/predict` | Classifica amostra (30 features WDBC) |

**Response de exemplo:**
```json
{
  "prediction": 1,
  "label": "Malignant",
  "probability": 0.9731,
  "confidence": "High",
  "status": "sucesso",
  "warning": null
}
```

> Quando `confidence == "Low"`, o campo `warning` é preenchido com alerta de **revisão manual dupla obrigatória**.

---

## 🔐 Segurança e Autenticação

Para simular um ambiente produtivo de dados sensíveis (saúde), a API está protegida por uma **API Key**.

- **Header obrigatório:** `access_token`
- **Chave de acesso:** `vitor-silva-aether-key`

### Exemplo de teste via Terminal (cURL)

```bash
curl -X POST https://seu-app.onrender.com/predict \
  -H "access_token: vitor-silva-aether-key" \
  -H "Content-Type: application/json" \
  -d '{
    "radius_mean": 17.99, "texture_mean": 10.38, "perimeter_mean": 122.8,
    "area_mean": 1001.0, "smoothness_mean": 0.1184, "compactness_mean": 0.2776,
    "concavity_mean": 0.3001, "concave_points_mean": 0.1471,
    "symmetry_mean": 0.2419, "fractal_dimension_mean": 0.07871,
    "radius_se": 1.095, "texture_se": 0.9053, "perimeter_se": 8.589,
    "area_se": 153.4, "smoothness_se": 0.006399, "compactness_se": 0.04904,
    "concavity_se": 0.05373, "concave_points_se": 0.01587,
    "symmetry_se": 0.03003, "fractal_dimension_se": 0.006193,
    "radius_worst": 25.38, "texture_worst": 17.33, "perimeter_worst": 184.6,
    "area_worst": 2019.0, "smoothness_worst": 0.1622, "compactness_worst": 0.6656,
    "concavity_worst": 0.7119, "concave_points_worst": 0.2654,
    "symmetry_worst": 0.4601, "fractal_dimension_worst": 0.1189
  }'
```

**Resposta esperada:**
```json
{
  "prediction": 1,
  "label": "Malignant",
  "probability": 0.9942,
  "confidence": "High",
  "status": "sucesso",
  "warning": null
}
```

> ⚠️ Requisições sem o header `access_token` correto recebem `403 Forbidden`.  
> A rota `GET /health` permanece **pública** (sem autenticação).

---

## 🐳 Docker

```bash
# Build da imagem
make docker-build

# Subir o container
make docker-run
# API disponível em http://localhost:8000
# Docs em http://localhost:8000/docs
```

A imagem usa `python:3.11-slim`, usuário não-root (`appuser`) e `HEALTHCHECK` nativo contra `/health`.

---

## 📊 MLflow — Rastreamento de Experimentos

```bash
# Visualizar todos os experimentos e métricas
make mlflow-ui
# → http://localhost:5000
```

Experimentos registrados:
- **`Aether_Oncology_Diagnostic`** — runs do pipeline de treino (`make train`)
- **`Baseline_Models`** — run da Regressão Logística (notebook EDA)

---

## 🧪 Testes

```bash
make test   # pytest + cobertura
```

| Arquivo | O que valida |
|---|---|
| `tests/test_schema.py` | Schema Pandera: 30 colunas WDBC, sem NaN, classes presentes, rejeita inválidos |
| `tests/test_api.py` | Health check, predição maligna/benigna, payload inválido (422) |

> Testes de predição usam `pytest.mark.xfail` automático enquanto os artefatos de treino não existem — o CI não bloqueia antes do primeiro `make train`.

---

## 📓 Notebook EDA

```
notebooks/eda_aether_oncology.ipynb
```

Contém as 6 seções obrigatórias:

| Seção | Conteúdo |
|---|---|
| 1. Introdução | Contexto clínico, justificativa do Recall |
| 2. Setup | Carga do dataset (mesma lógica do `train.py`) |
| 3. EDA | Distribuição de classes, heatmap de correlação, boxplots, pairplot |
| 4. Baseline | `Pipeline([scaler, LogisticRegression])` com MLflow tracking |
| 5. MLP PyTorch | Loop de treino, Early Stopping, curvas de convergência |
| 6. Tabela Comparativa | Recall / F1 / AUC-ROC: Baseline vs Aether MLP |

---

## 📄 Governança e Ética

### [`docs/MODEL_CARD.md`](docs/MODEL_CARD.md)
Documenta explicitamente o que o modelo **não pode fazer**: nenhum diagnóstico autônomo, nunca. Inclui grupos avaliados, riscos de viés, conformidade LGPD/HIPAA e mecanismo de alerta de "Baixa Confiança".

### [`docs/MONITORING.md`](docs/MONITORING.md)
Define thresholds de alerta e **Playbook de Incidentes** com 4 níveis de severidade — do 🟢 BAIXO (F1 queda > 5%) ao 🔴 CRÍTICO (Recall < 0.90 → suspender predições).

---

## 🛠️ Referência de Comandos

| Comando | Descrição |
|---|---|
| `make install` | Instala dependências via pip |
| `make train` | Treino completo com MLflow |
| `make test` | Testes com cobertura |
| `make run` | API local em `localhost:8000` |
| `make lint` | Ruff check em `src/` e `tests/` |
| `make format` | Ruff format (auto-fix) |
| `make mlflow-ui` | Dashboard MLflow em `localhost:5000` |
| `make docker-build` | Build da imagem Docker |
| `make docker-run` | Container na porta 8000 |
| `make clean` | Remove artefatos de build e cache |
| `make setup-and-test` | Pipeline completo para o avaliador |

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias |
|---|---|
| Core ML | Python 3.11 · PyTorch · Scikit-Learn |
| API | FastAPI · Pydantic · Uvicorn |
| MLOps | MLflow · Pandera |
| Visualização | Seaborn · Matplotlib |
| Qualidade | Pytest · Ruff |
| Infra | Docker · Makefile · uv |

---

<div align="center">

Desenvolvido por **Vitor Diogo Fonseca da Silva** — 2026
Ciência da Computação | Pós-Tech FIAP — Engenharia de Machine Learning

</div>
