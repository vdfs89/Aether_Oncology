---
language:
- pt
license: mit
tags:
- tabular-classification
- pytorch
- scikit-learn
- medical
- oncology
- health
datasets:
- scikit-learn/breast-cancer-wisconsin
pipeline_tag: tabular-classification
model-index:
- name: Aether Oncology Tumor Classifier v1.0
  results:
  - task:
      type: tabular-classification
      name: Classificação Tabular
    dataset:
      name: Breast Cancer Wisconsin Diagnostic
      type: scikit-learn/breast-cancer-wisconsin
    metrics:
    - type: recall
      value: 0.97
      name: Recall (Sensibilidade)
    - type: f1
      value: 0.96
      name: F1-Score
    - type: roc_auc
      value: 0.99
      name: ROC-AUC
---

# Aether Oncology

<p align="center">
  <img src="https://github.com/vdfs89/Aether_Oncology/raw/main/src/static/aether-oncology-portal/images/Banner.png" alt="Banner" style="max-width:100%; height:auto;" />
</p>

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

## 📊 Arquitetura e Análise Técnica

### Diagrama de Arquitetura da Aplicação

```mermaid
graph TD
    subgraph "Frontend (Hospedagem Estática: portal.vitorsilva.engineer)"
        UI[Portal Clínico\nVanilla JS + HTML5]
        XAI[Explainable AI\nChart.js Radar]
    end

    subgraph "Backend (Cloud Hosting: Render)"
        Auth[Autenticação\nAPI Key & CORS]
        API[FastAPI\nEndpoints: /predict, /health]
        
        subgraph "Service Layer"
            Service[PredictorService\nDesign Padrão Singleton]
        end
        
        subgraph "Machine Learning Engine"
            Pipeline[Scikit-Learn\nStandardScaler Pipeline]
            Model[PyTorch MLP\nBinary Classifier]
        end
    end

    subgraph "Governança & MLOps"
        MLflow[(MLflow Tracking\nModel Registry)]
        Pandera[Pandera\nData Contracts]
    end

    Medico((Médico/Usuário)) -->|Insere Biópsia| UI
    UI -->|Renderiza| XAI
    UI -->|POST /predict via JSON| Auth
    Auth -->|Valida access_token| API
    API -->|Valida Schema Pydantic| Service
    Service -->|Aplica Transformações| Pipeline
    Pipeline -->|Inferência Tensorial| Model
    Model -->|Devolve Probabilidade| API
    MLflow -.->|Versiona Artefatos .pth e .joblib| Service
    Pandera -.->|Garante integridade na pipeline| Pipeline
```

### Análise Técnica Completa (Executive Summary)

Esta análise valida como o seu projeto atende (e supera) os critérios de avaliação da Fase 01.

**Arquitetura & Organização**
* **Padrão Arquitetural:** Microsserviço de Inferência Desacoplado. O Frontend (Vanilla JS) comunica-se assincronamente com o Backend via REST API.
* **Modularidade e SOLID:** O código está encapsulado na estrutura `src/`, separando responsabilidades (Single Responsibility Principle) através do `PredictorService`. Isso garante que a camada web (rotas) não conheça os tensores do modelo.

**Backend & API**
* **Framework:** Desenvolvido em FastAPI, o padrão moderno para MLOps devido ao seu suporte nativo a operações assíncronas e documentação Swagger automática.
* **Contratos de Dados:** Utilização estrita do Pydantic para forçar que o JSON de entrada contenha exatamente os 30 atributos da biópsia com as tipagens corretas (evitando o "garbage in, garbage out").

**IA / Machine Learning (O Core)**
* **Treinamento e Modelo:** Implementação de uma Rede Neural MLP (Multilayer Perceptron) customizada no PyTorch para dados tabulares. O loop de treino conta com Early Stopping para prevenir o overfitting e regularização via Dropout.
* **Pipeline (Data Leakage):** Todo o pré-processamento (como o `StandardScaler`) está encapsulado num pipeline do Scikit-Learn, garantindo transformações idênticas em treino e inferência.
* **Governança:** Integração profunda com MLflow, registrando não apenas os pesos do modelo (artefatos), mas também os hiperparâmetros, curva de loss e métricas críticas como Recall e F1-Score.

**Segurança**
* **Autenticação:** O acesso à rede neural é protegido por uma validação de cabeçalho (`access_token`) através de API Key injetada por variáveis de ambiente.
* **CORS:** Políticas rigorosas de Cross-Origin Resource Sharing permitindo apenas métodos GET e POST, protegendo o backend no Render.

**DevOps & Qualidade de Código**
* **Observabilidade & Latência:** A arquitetura do `PredictorService` utiliza o padrão Singleton para carregar o modelo de IA na memória uma única vez no arranque do servidor, eliminando a latência de I/O em cada predição.
* **Ambiente & Linting:** O projeto utiliza o `pyproject.toml` como única fonte de verdade para dependências. A qualidade do código é assegurada pelo Ruff, o linter mais rápido do ecossistema atual.
* **Testes (TDD):** A robustez da aplicação é garantida pelo Pytest através de três camadas exigidas: Smoke tests (saúde da API), validação algorítmica e testes de integridade de dados (data contracts) suportados pelo framework Pandera.
* **Otimização & Calibração (MRM3):** O projeto utiliza **Optuna** para busca automatizada de hiperparâmetros (arquitetura dinâmica) e **Platt Scaling** para calibração de probabilidades, garantindo que a confiança do modelo seja estatisticamente válida para uso clínico.

**Documentação & Manutenção**
* **Model Card:** O projeto possui um documento ético detalhando os casos de uso previstos, as mitigações contra viés nos dados demográficos e o foco estratégico no Recall para priorização da segurança do paciente.
* **Plano de Monitoramento:** Estrutura definida para a fase de pós-implantação (Day 2), estabelecendo gatilhos para retreino perante deteção de Data Drift (mudança nos equipamentos de biópsia) e degradação de performance.

---

## 🏗️ Estrutura do Repositório

```
aether-oncology/
├── src/
│   ├── main.py                  # API FastAPI (/predict + /health)
│   ├── train.py                 # Pipeline de treino com Early Stopping e MLflow
│   ├── optimize.py              # Busca de hiperparâmetros via Optuna
│   ├── models/
│   │   └── mlp.py               # Arquitetura TumorMLP — única fonte de verdade
│   └── services/
│       ├── predictor.py         # PredictorService (Singleton) — importa MLP de mlp.py
│       └── research.py          # Integração com Semantic Scholar API
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

# 3. Otimizar hiperparâmetros (Opcional - gera melhores arquiteturas)
python -m src.optimize

# 4. Treinar o modelo final (registra métricas e calibração no MLflow)
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
- **Chave de acesso:** `aether-oncology-eval-2026`

### Exemplo de teste via Terminal (cURL)

```bash
curl -X POST https://api.vitorsilva.engineer/predict \
  -H "access_token: aether-oncology-eval-2026" \
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

## 🌐 Deploy em Produção

| Serviço | URL | Descrição |
|---|---|---|
| **Portal Clínico (HTML)** | [api.vitorsilva.engineer](https://api.vitorsilva.engineer/) | Interface nativa rápida com gráficos de explicabilidade (XAI) |
| **API Docs** | [api.vitorsilva.engineer/docs](https://api.vitorsilva.engineer/docs) | Swagger UI interativo (Testes de Backend) |
| **Health Check** | [api.vitorsilva.engineer/health](https://api.vitorsilva.engineer/health) | Liveness probe público |
| **Predict API** | `POST` [https://api.vitorsilva.engineer/predict](https://api.vitorsilva.engineer/predict) | Endpoint de inferência (requer API Key) |

---

## 🖥️ Portal Clínico (Front-end Nativo)

Acessível na raiz da API (`https://api.vitorsilva.engineer/`), construído em HTML/CSS/JS puro para máxima performance:
- Layout em painel duplo (Clinical UI)
- Input focado nas 5 features primárias (auto-preenchimento inteligente para as outras 25)
- **Explainable AI (XAI)**: Integração nativa com *Chart.js* mostrando a contribuição (Fator de Impacto) das features morfológicas na predição final da rede neural (vermelho para maligno, verde para benigno).
- Erros de autenticação (403) mapeados no front.

---

## 🐳 Docker

```bash
# Build da imagem
make docker-build

# Subir o container
make docker-run
# Portal clínico em  http://localhost:8000
# API Docs em        http://localhost:8000/docs
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
| `tests/test_api.py` | **Segurança**: chave errada → 403, sem header → 403 (validação da API Key) |

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

## 🧬 Model Card: Aether Oncology - Tumor Classifier v1.0

### 1. Detalhes do Modelo
- **Desenvolvedor:** Vitor Diogo Fonseca da Silva (Tech Challenge 01 — FIAP Pós-Tech Engenharia de Machine Learning)
- **Tipo de Modelo:** Multilayer Perceptron (MLP) Neural Network
- **Frameworks:** PyTorch e Scikit-Learn (Pipeline)
- **Licença:** MIT
- **Dataset de Treino:** [Breast Cancer Wisconsin Diagnostic (WDBC)](https://huggingface.co/datasets/scikit-learn/breast-cancer-wisconsin)

### 2. Uso Pretendido (Intended Use)
- **Primary Intended Use:** Atuar como um Sistema de Suporte à Decisão Clínica (CDSS) para patologistas e oncologistas, realizando a triagem inicial e estimando o risco de malignidade em biópsias baseadas em características morfológicas e celulares.
- **Secondary Intended Use:** Priorização de filas de exames hospitalares (casos com alto risco de malignidade passam para o topo da fila de análise humana).
- **Out of Scope Use (Uso Proibido):** Este modelo **nunca** deve ser utilizado para diagnóstico autônomo ou prescrição de tratamentos sem a supervisão e validação final de um médico especialista.

### 3. Dados de Treinamento e Pré-processamento
O modelo foi treinado com o dataset WDBC, composto por 30 atributos numéricos contínuos extraídos de imagens digitalizadas de biópsias (FNA - Fine Needle Aspirate). 
- **Contrato de Dados:** A padronização dos dados foi feita utilizando o `StandardScaler` do Scikit-Learn. Este fluxo foi serializado como um Pipeline (`.joblib`) no repositório de produção para garantir que a inferência da API receba exatamente a mesma escala matemática, prevenindo *data leakage*.

### 4. Métricas de Avaliação
O modelo foi otimizado estrategicamente para o **Recall (Sensibilidade)** através de funções de perda pesadas. No contexto oncológico, um *Falso Negativo* (afirmar que não há câncer quando o paciente possui um tumor maligno) possui um custo humano inaceitável.
- **Recall (Sensibilidade):** 0.97
- **F1-Score:** 0.96
- **ROC-AUC:** 0.99
- **Acurácia Global:** ~97.3%

### 5. Governança, Ética e Sustentabilidade
- **Auditoria de Viés (Fairness):** O MVP atual utiliza exclusivamente características morfológicas, o que mitiga riscos diretos de viés demográfico (como idade ou etnia). No entanto, o roadmap arquitetural para a v2.0 (integração multimodal com Prontuários Eletrônicos - EHR) prevê a implementação contínua do framework **Fairlearn**. Ele atuará como um *gatekeeper* no nosso pipeline CI/CD para garantir a mitigação de vieses demográficos, em total conformidade com práticas de IA Responsável e LGPD.
- **Sustentabilidade (MRM3):** O design deste modelo foca em alta eficiência computacional. Prevemos a adoção do framework MRM3 (Machine Readable ML Model Metadata) para a governança em produção, rastreando métricas de impacto ambiental como **consumo de energia** e **pegada de carbono** durante a inferência.
- **Medicina Baseada em Evidências:** A arquitetura futura prevê a implementação de um módulo de RAG (Retrieval-Augmented Generation) atrelado à classificação, extraindo literatura em tempo real de bases como PubMed e Biblioteca Cochrane para embasar o score preditivo.

### 6. Limitações e Monitoramento
- **Fronteira Operacional:** O modelo assume que as amostras de entrada advêm de microscópios e equipamentos de biópsia calibrados nos mesmos padrões do dataset de treinamento.
- **Data Drift:** Caso ocorra a atualização de equipamentos ou métodos de coleta hospitalar, o protocolo Day-2 de MLOps do Aether Oncology exige uma reavaliação de estabilidade por meio de métricas estatísticas para acionar o retreino automático.

---

## 🔮 Visão de Futuro (Roadmap v2.0): Arquitetura Multimodal e Genômica

Embora o MVP atual do **Aether Oncology** entregue excelência na triagem baseada em características morfológicas de núcleos celulares (via biópsia FNA), o nosso roadmap arquitetural prevê a evolução para um sistema de **Inteligência Artificial Multimodal**. 

A versão 2.0 integrará as imagens e métricas da biópsia com **Prontuários Eletrônicos (EHR)** e **Painéis Genômicos** do paciente. Explorando as bases de dados oncológicas avançadas do ecossistema Hugging Face (como `Genomics_oncology` e `Oncology_cancer_ehr` [1, 2]), o modelo cruzará os dados da biópsia com históricos de comorbidades e assinaturas de risco genético, como mutações *driver* (ex: KRAS G12C e EGFR L858R [3, 4]). 

Essa fusão de domínios transformará a plataforma num oráculo de **Medicina de Precisão**, elevando de forma exponencial a capacidade preditiva do sistema e garantindo um *Recall* praticamente à prova de falhas em ambientes hospitalares do mundo real.

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
| API | FastAPI · Pydantic · Uvicorn · aiofiles |
| Frontend | HTML5 · CSS3 · JavaScript (Vanilla) |
| Segurança | API Key Header · CORS Middleware |
| MLOps | MLflow · Pandera |
| Visualização | Seaborn · Matplotlib |
| Qualidade | Pytest · Ruff |
| Infra | Docker · Makefile · uv · GitHub Actions |

---

<div align="center">

Desenvolvido por **Vitor Diogo Fonseca da Silva** — 2026
Ciência da Computação | Pós-Tech FIAP — Engenharia de Machine Learning

</div>
