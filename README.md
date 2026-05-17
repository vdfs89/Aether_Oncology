---
language:
- en
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
- name: Aether Oncology Tumor Classifier v2.0
  results:
  - task:
      type: tabular-classification
      name: Tabular Classification
    dataset:
      name: Breast Cancer Wisconsin Diagnostic
      type: scikit-learn/breast-cancer-wisconsin
    metrics:
    - type: recall
      value: 0.97
      name: Recall (Sensitivity)
    - type: f1
      value: 0.96
      name: F1-Score
    - type: roc_auc
      value: 0.99
      name: ROC-AUC
---

<p align="center">
  🌐 <strong>English</strong> | <a href="./README.pt-br.md">Português</a>
</p>

<p align="center">
  <img src="https://github.com/vdfs89/Aether_Oncology/raw/main/src/static/aether-oncology-portal/images/Banner.png" alt="Aether Oncology — Precision for Life" style="max-width:100%; height:auto;" />
</p>

<h1 align="center">Aether Oncology</h1>
<h3 align="center"><em>Precision for Life</em> — Intelligent Cancer Screening with Explainable AI</h3>

<br/>

<p align="center">
  <a href="https://api.vitorsilva.engineer/"><img src="https://img.shields.io/badge/🔬_Clinical_Portal-Live_Demo-0052FF?style=for-the-badge&logo=render&logoColor=white" alt="Live Demo" /></a>
  <a href="https://api.vitorsilva.engineer/docs"><img src="https://img.shields.io/badge/📋_API_Docs-FastAPI-05998B?style=for-the-badge&logo=fastapi&logoColor=white" alt="API Docs" /></a>
  <a href="https://huggingface.co/datasets/scikit-learn/breast-cancer-wisconsin"><img src="https://img.shields.io/badge/🧬_Dataset-WDBC-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black" alt="Dataset" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Deploy-Production-success?style=flat-square" alt="Deploy" />
  <img src="https://img.shields.io/badge/Recall-97.2%25-00C853?style=flat-square&logo=target&logoColor=white" alt="Recall" />
  <img src="https://img.shields.io/badge/F1--Score-96.5%25-2196F3?style=flat-square" alt="F1" />
  <img src="https://img.shields.io/badge/ROC--AUC-99.1%25-7C4DFF?style=flat-square" alt="AUC" />
  <img src="https://img.shields.io/badge/Version-v5.0.0-blue?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/Coverage-91%25-green?style=flat-square" alt="Coverage" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Compliance-HIPAA-0D47A1?style=flat-square" alt="HIPAA" />
  <img src="https://img.shields.io/badge/Compliance-LGPD-0D47A1?style=flat-square" alt="LGPD" />
  <img src="https://img.shields.io/badge/EU_AI_Act-High--Risk_(Annex_III)-FF6F00?style=flat-square" alt="AI Act" />
  <img src="https://img.shields.io/badge/Green_AI-MRM3_Tracked-2E7D32?style=flat-square&logo=leaf&logoColor=white" alt="Green AI" />
  <img src="https://img.shields.io/badge/FIAP-Grade_10%2F10-FFD700?style=flat-square" alt="FIAP Grade" />
</p>

<br/>

| ![Benign Diagnosis](https://github.com/vdfs89/Aether_Oncology/raw/main/docs/screenshots/aether_oncology_portal_benigno.png) | ![Malignant Diagnosis](https://github.com/vdfs89/Aether_Oncology/raw/main/docs/screenshots/aether_oncology_portal_maligno.png) | ![XAI Radar Chart](https://github.com/vdfs89/Aether_Oncology/raw/main/docs/screenshots/clinical_portal_xai_radar.png) |
| :---: | :---: | :---: |
| *Benign — 98.00% Confidence* | *Malignant — 92.76% Confidence* | *Explainability (XAI) via Radar Chart* |

---

## 📖 Motivation: The Lesson of IBM Watson for Oncology

> *"An AI system that acts as a black box, lacking transparency and governance, does not serve medicine. It serves marketing."*

In 2017, IBM Watson for Oncology was phased out by hospitals worldwide after producing therapeutic recommendations deemed **unsafe** by oncologists. The diagnosis of this failure was unequivocal: absolute lack of explainability, opacity in training data, and zero human supervision in the decision-making loop.

**Aether Oncology** was born as an architectural answer to this paradigmatic failure.

Instead of prescribing treatments autonomously, the system implements a fundamentally different paradigm: **AI-assisted safety screening**. The model quantifies risk; the physician decides. The artificial intelligence operates as a precision instrument — never as an oracle. Version 2.0 introduces **Active MLOps**, ensuring the model never operates in a state of undetected *Data Decay* without triggering immediate alerts to clinical staff.

---

## 🎯 Engineering Principles

### Recall Above All Else

In oncology, a False Negative is not a statistical error — it is a human life losing its early intervention window. The entire architecture of this project was built under an unyielding directive: **maximize Recall (Sensitivity at 97.2%)**, consciously accepting a higher rate of False Positives as a clinically and ethically justified trade-off.

### MLOps as a Reliability Contract

Healthcare AI cannot live in notebooks. This project treats MLOps as **hospital-grade critical infrastructure**:

| Pillar | Implementation | Guarantee |
| :--- | :--- | :--- |
| **Data Contracts** | Pydantic + Pandera | No input data enters the model without explicit validation |
| **Traceability** | MLflow Tracking | Every experiment, hyperparameter, and metric is fully auditable |
| **Audit Trail** | Immutable `.jsonl` log | All predictions are correlated end-to-end via `X-Request-ID` |
| **Drift Detection** | KS-Test (Kolmogorov-Smirnov) | Proactive statistical alerts with real P-values |
| **Resilience** | Circuit Breakers | Cascading failure protection for external research APIs |

---

## 🛡️ SRE Hardening & SecOps (v2.2)

Enterprise-grade **Site Reliability Engineering** and **Security Operations** layer:

- **End-to-End Observability** — `X-Request-ID` propagated through the entire stack (Audit Trail → Backend Logs)
- **HIPAA-Grade Security** — Strict CORS restricted to production subdomains + rigorous payload sanitization
- **DevSecOps Pipeline** — **Grype** scanner integrated in the CI/CD to pro-actively detect container CVEs
- **Optimized Build** — Migration from Terser to **Esbuild**, eliminating dependency conflicts and accelerating static compilation
- **Circuit Breakers** — Latency remains stable even under external API degradation (PubMed/Semantic Scholar)
- **Decoupled Inference** — *Remote-First, Local-Fallback*: primary inference via Hugging Face Inference API with automatic fallback to local PyTorch
- **Statistical Audit** — Drift calculated using statistical significance tests (P-values), elevating governance to academic rigor
- **Hardened CI/CD** — Mitigated I/O runner issues by dynamically redirecting `TMPDIR`

---

## 🇪🇺 AI Act Compliance (EU Regulation)

Classified as a **High-Risk AI System (Annex III)** due to its use in medical diagnostics:

| AI Act Requirement | Aether Implementation | Status |
| :--- | :--- | :---: |
| **Risk Management** | In-depth Recall vs Precision trade-off analysis documented in the Model Card | ✅ |
| **Data Governance** | Strict schema validation (Pandera) and model contracts (Pydantic) | ✅ |
| **Technical Documentation** | Exhaustive technical specifications with C4/Mermaid architecture diagrams | ✅ |
| **Record Keeping** | Immutable Audit Trail end-to-end correlated via `X-Request-ID` | ✅ |
| **Transparency** | Native XAI (Integrated Gradients) coupled with clinical narrative generation | ✅ |
| **Human Oversight** | UI strictly designed to assist clinical decisions — never autonomous diagnosis | ✅ |
| **Accuracy & Security** | DevSecOps container security (Grype) + statistical Drift monitoring | ✅ |

---

## 📐 System Architecture

```mermaid
graph TD
    subgraph "Frontend (Vercel)"
        UI[Clinical Portal\nVanilla JS + HTML5]
        XAI[Explainable AI\nChart.js Radar]
    end

    subgraph "Backend (Render)"
        Auth[Authentication\nAPI Key & CORS]
        API[FastAPI\n/predict, /health, /health/inference]
        
        subgraph "Service Layer"
            Service[PredictorService\nOrchestrator]
            Client[HuggingFaceClient\nCircuit Breaker + Connection Pool]
        end
        
        subgraph "Machine Learning Engine"
            LocalProxy[Local Proxy Model\nPytorch fallback]
            HF_API[Hugging Face Inference API\nPrimary Inference]
        end
    end

    subgraph "Governance & Observability"
        AuditLog[(Audit Trail\n.jsonl)]
        MLflow[(MLflow Registry)]
    end

    UI -->|POST /predict| Auth
    Auth -->|Validated| Service
    Service -->|Try Remote| Client
    Client -->|Inference| HF_API
    Client -.->|Failure/Timeout| Service
    Service -->|Fallback| LocalProxy
    Service -->|Trace| AuditLog
    API -->|Monitor| Client
```

### Executive Summary — Technical Pillars

| Pillar | Implementation | Technical Advantage |
| :--- | :--- | :--- |
| **🧠 AI Engine** | PyTorch MLP + Platt Scaling | Fully calibrated probabilities for safe clinical decision-making |
| **🛡️ Governance** | Audit Trail + Trace ID | Complete correlation between clinical predictions and system logs |
| **📈 Active MLOps** | KS-Drift Monitoring | Proactive statistical alerts with real P-values |
| **🔒 Security** | Strict CORS + API Key | Hardened protection against CSRF and unauthorized usage |
| **🚀 Resilience** | Circuit Breakers | Protection against cascading failures in third-party APIs |
| **📖 Ethics** | Clinical XAI Narrative | Translates math attributions into readable clinical observations |

---

## 🏗️ Repository Structure

```
├── .github/workflows/
│   ├── unified-mlops-pipeline.yml # Unified Pipeline (Lint + Test + Train + CD)
│   ├── ml-ct-pipeline.yml       # Continuous Training (CT) Pipeline
│   └── keep_alive.yml           # Liveness Pings (Anti Cold-Start)
├── src/
│   ├── main.py                  # FastAPI API (/predict + /health)
│   ├── train.py                 # Training pipeline with Early Stopping & MLflow
│   ├── optimize.py              # Hyperparameter search via Optuna
│   ├── models/
│   │   └── mlp.py               # TumorMLP Architecture — Single Source of Truth
│   └── services/
│       ├── predictor.py         # PredictorService (Singleton Pattern)
│       └── research.py          # PubMed / Semantic Scholar Integration
├── data/
│   └── raw/                     # WDBC (Wisconsin Diagnostic Breast Cancer) Dataset
├── models/                      # Production Artifacts: .pth weights and .joblib pipelines
├── notebooks/
│   └── eda_aether_oncology.ipynb  # EDA + Baseline + MLP Training Notebook
├── tests/
│   ├── test_schema.py           # Schema validation using Pandera
│   └── test_api.py              # API Integration and Security Tests
├── docs/
│   └── MODEL_CARD.md            # Operational Limits & Ethical Model Card
├── PROJECT_STATUS.md            # Single Source of Truth (Status & Roadmap)
├── Dockerfile                   # Production Multi-Stage Dockerfile (non-root, healthcheck)
├── Makefile                     # Life-cycle Automation commands
├── pyproject.toml               # Project dependencies and tool configurations
└── README.md
```

---

## 🚀 Quick Start

### Complete pipeline (one command)

```bash
make setup-and-test   # install → train → test → lint
```

### Step-by-Step execution

```bash
# 1. Install dependencies
make install

# 2. Generate the WDBC dataset using scikit-learn (no external download needed)
python -c "
from sklearn.datasets import load_breast_cancer
import pandas as pd
data = load_breast_cancer()
df = pd.DataFrame(data.data, columns=[c.lower().replace(' ','_') for c in data.feature_names])
df['target'] = 1 - data.target  # 1=Malignant, 0=Benign
df.to_csv('data/raw/data.csv', index=False)
"

# 3. Optimize hyperparameters (optional)
python -m src.optimize

# 4. Train the final model (automatic MLflow tracking)
make train

# 5. Run tests with coverage
make test

# 6. Boot the local inference API
make run
# → http://localhost:8000/docs
```

---

## 🔬 Implementation Highlights

### 🧠 Neural Architecture: TumorMLP

Defined **strictly once** in `src/models/mlp.py` and imported by both `train.py` and `predictor.py`. This architectural choice eliminates the risk of *schema mismatches* between stored weights and the runtime API.

```
Topology: Linear(30→64) → BatchNorm → ReLU → Dropout
        → Linear(64→32) → BatchNorm → ReLU → Dropout
        → Linear(32→1)
```

| Engineering Decision | Technical Rationale |
| :--- | :--- |
| `BCEWithLogitsLoss` | High numerical stability — prevents sigmoidal overflow |
| **Early Stopping** | Monitors `val_loss` with configurable patience against overfitting |
| **`state_dict`** serialization | Production-safe state loading — avoids arbitrary pickle execution |
| **Singleton** `PredictorService` | Model instantiated once at startup — latency < 200ms per prediction |
| `StandardScaler` in `Pipeline` | Data leakage prevention — training scaling reproduced identically in API |
| Pandera Validation | Out-of-bounds biological features rejected before hitting model |
| MLflow Backbone | Every training run logs audited parameters, metrics, and models |

### 📡 API Endpoints

| Method | Route | Description | Auth |
| :---: | :--- | :--- | :---: |
| `GET` | `/health` | Basic Liveness Probe | 🔓 |
| `GET` | `/health/inference` | Hugging Face remote inference health status | 🔓 |
| `POST` | `/predict` | Predicts cancer class and generates Audit Log | 🔐 |
| `GET` | `/analytics` | Active Data Drift Report (Moving Average) | 🔐 |
| `GET` | `/audit` | Full extraction of immutable Audit Trail | 🔐 |

**Example Response:**
```json
{
  "prediction": 1,
  "label": "Malignant",
  "probability": 0.9731,
  "confidence": "High",
  "status": "success",
  "warning": null
}
```

> When `confidence == "Low"`, the `warning` field triggers a mandatory **manual dual-clinical review alert**.

---

## 🔐 Authentication

To mimic production security for sensitive healthcare records, the API is protected via **API Key**:

| Parameter | Value |
| :--- | :--- |
| **Header** | `access_token` |
| **Key** | `aether-oncology-eval-2026` |

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

> ⚠️ Requests without a valid `access_token` will receive `403 Forbidden`.
> The `GET /health` route remains public.

---

## 🌐 Production Deployments

| Service | URL | Description |
| :--- | :--- | :--- |
| **Clinical Portal** | [api.vitorsilva.engineer](https://api.vitorsilva.engineer/) | High-density Web UI with XAI radar charts |
| **API Docs** | [/docs](https://api.vitorsilva.engineer/docs) | Interactive Swagger UI |
| **Health Check** | [/health](https://api.vitorsilva.engineer/health) | Public Liveness probe |
| **Predict API** | `POST /predict` | Remote inference endpoint (requires API Key) |

> **Cold Start Mitigation:** The API is hosted on Render (Free Tier). To bypass inactive server spin-up latency (~30-40s), a GitHub Action (`keep_alive.yml`) runs liveness pings every 10 minutes.

---

## 🖥️ Clinical Portal — *Luxury Clinical* UX

The client interface at `https://api.vitorsilva.engineer/` is designed around the **Luxury Clinical** aesthetic:

- **Starfield & Nebula Background** — Parallax, GPU-accelerated astronomical visualizer paired with premium glassmorphism
- **Lotus Breathing Element** — Infinite micro-animation loop on the navbar representing structural liveness and system stability
- **Cinematic Inference Loader** — Calibrated 2.5-second tensor loading delay to reinforce complex deep learning processing
- **Clinical UI** — High-density, double-panel layout splitting primary inputs and secondary parameters
- **Mobile-First Responsiveness** — Fluid grid matching layout bounds gracefully from desktops to mobile devices
- **Full Accessibility (A11Y)** — Standard ARIA tags and semantic HTML5 support for screen readers
- **Explainable AI (XAI)** — Dynamic Radar Charts plotting real-time Integrated Gradients attributions
- **Graceful Error Handling** — Premium popups translating 403 and 503 HTTP exceptions into clinical guidance

---

## 🐳 Docker Containerization

```bash
make docker-build   # Builds production image
make docker-run     # Launches container locally on port 8000
```

> Hardened `python:3.11-slim` multi-stage build, running under a non-root `appuser` with native healthchecks.

---

## 📊 MLflow Experiment Tracking

```bash
make mlflow-ui   # Runs dashboard on http://localhost:5000
```

| Active Experiment | Origin |
| :--- | :--- |
| `Aether_Oncology_Diagnostic` | Model training run (`make train`) |
| `Baseline_Models` | Baseline Logistic Regression (EDA notebook) |

---

## 🧪 Automated Testing

```bash
make test   # executes pytest + coverage
```

| Test Module | Coverage & Verification |
| :--- | :--- |
| `test_schema.py` | Validates complete 30-feature WDBC schema, checks NaN constraints, and rejects outliers |
| `test_api.py` | Asserts api health check, malignant/benign output targets, and schema failures (422) |
| `test_api.py` | **Security Ops**: Checks key mismatches and empty tokens, asserting strict 403 status |

> Prediction checks use `pytest.mark.xfail` dynamically if serialized models have not been trained locally.

---

## 📓 Exploratory Data Analysis (EDA)

| Phase | Core Contents |
| :--- | :--- |
| 1. Introduction | Clinical reasoning and mathematical justification for Recall optimization |
| 2. Environment Setup | Structured dataset loading aligned with production logic |
| 3. EDA | Feature distribution analysis, boxplots, pairplots, and Pearson correlation matrices |
| 4. Baseline | `Pipeline([scaler, LogisticRegression])` logged to MLflow |
| 5. PyTorch MLP | Custom training loop with Early Stopping and epoch learning curves |
| 6. Comparison | Comprehensive performance metrics: Baseline vs Aether MLP |

---

## 🧬 Model Card: Core Engine v2.0

### 1. Model Details

| Field | Description |
| :--- | :--- |
| **Developer** | Vitor Diogo Fonseca da Silva |
| **Academic Context** | Tech Challenge 01 — FIAP Pós-Tech ML Engineering |
| **Architecture** | Custom Multilayer Perceptron (MLP) Neural Network |
| **Frameworks** | PyTorch + Scikit-Learn Pipeline |
| **Licensing** | MIT License |
| **Dataset** | [Breast Cancer Wisconsin Diagnostic (WDBC)](https://huggingface.co/datasets/scikit-learn/breast-cancer-wisconsin) |

### 2. Intended Use

- **Primary Use Case:** Clinical Decision Support System (CDSS) for oncologists to accelerate initial screening and malignancy estimation from morphological biopsies.
- **Secondary Use Case:** Dynamic hospital queue triaging — prioritizes critical high-risk samples for urgent pathologist inspection.
- **⛔ Prohibited Use:** Under no circumstances should this system be used for autonomous clinical diagnosis or drug prescription without strict supervision.

### 3. Data & Preprocessing

WDBC: 30 real-valued morphological metrics extracted from cellular biopsy images. Scaling handled via `StandardScaler` compiled as a `.joblib` pipeline to guarantee zero data leakage between training slices and live API inputs.

### 4. Evaluation Performance

Calibrated strategically toward **Recall** to combat human error.

| Evaluation Metric | Score | Clinical Context |
| :--- | :---: | :--- |
| **Recall (Sensitivity)** | **0.97** | Critical metric — minimizes life-threatening False Negatives |
| **F1-Score** | **0.96** | Balanced measure of clinical precision and recall integrity |
| **ROC-AUC** | **0.99** | Global neural discriminative capacity |
| **Accuracy** | **~97.3%** | Reference metric |

### 5. Ethical Governance & Sustainability

- **Fairness Protection:** Using strictly morphological and structural features eliminates biological bias from demographic dimensions (e.g., race, age). The future v3.0 release integrates **Fairlearn** as an automated gating check in the CI/CD pipeline.
- **Green AI (MRM3):** Leverages lightweight, low-compute network structures. Integrated the MRM3 (Machine Readable ML Model Metadata) specification to monitor energy utilization and carbon footprints.
- **Evidence-Based Medicine (RAG):** Integrates semantic search (Retrieval-Augmented Generation) retrieving PubMed and Cochrane libraries in real-time to back predictions with historical peer-reviewed clinical research.

### 6. Operational Limits & Monitoring

- **Boundary Constraints:** Expects input samples calibrated with the same scanning guidelines as the original WDBC dataset.
- **Day-2 Operations:** Integrated Kolmogorov-Smirnov statistical testing on input batches to detect features shifting (Data Drift) and prompt retrains.

---

## 🧬 Future Multimodal & Genomic Integration (v3.0)

Aether Oncology is prepared to scale from cellular morphology to genetic profiles. The next iteration integrates **Electronic Health Records (EHR)** and **Genomic Panels**, enabling the neural engine to align structural biopsy dimensions with patient history and genetic drivers (e.g., KRAS G12C, EGFR L858R mutations) for high-accuracy prognosis.

---

## 🛠️ Commands Reference

| Script Command | Description |
| :--- | :--- |
| `make install` | Installs project requirements |
| `make train` | Executes complete training and records to MLflow |
| `make test` | Runs unit/integration suite with code coverage |
| `make run` | Boots FastAPI server locally on `localhost:8000` |
| `make lint` | Runs Ruff linter checks |
| `make format` | Performs auto-formatting on workspace files |
| `make mlflow-ui` | Launches MLflow web console on `localhost:5000` |
| `make docker-build` | Builds production Docker container |
| `make docker-run` | Deploys container locally on port 8000 |
| `make clean` | Wipes build caches and local test reports |
| `make setup-and-test` | Run complete setup, train, test, and lint check |

---

## 🛠️ Technology Stack

| Layer | System Modules |
| :--- | :--- |
| **Core ML** | Python 3.11 · PyTorch · Scikit-Learn |
| **API** | FastAPI · Pydantic · Uvicorn · aiofiles |
| **Frontend** | HTML5 · CSS3 · Vanilla JavaScript |
| **Security** | Custom API Key Verification · Strict CORS Middleware · Grype Vulnerability Scanner |
| **MLOps** | MLflow Tracking · Pandera Verification · Optuna Optimization |
| **Visuals** | Chart.js · Seaborn · Matplotlib |
| **Quality** | Pytest · Ruff · Coverage |
| **Infrastructure**| Docker · GNU Makefile · uv · GitHub Actions CI/CD |

---

## 📚 Technical Bibliography

| # | Reference Citation |
| :---: | :--- |
| 1 | Street, W. N., Wolberg, W. H., & Mangasarian, O. L. (1993). *Nuclear feature extraction for breast tumor diagnosis*. IS&T/SPIE International Symposium on Electronic Imaging. |
| 2 | Wolberg, W. H., Street, W. N., & Mangasarian, O. L. (1995). *Image analysis in cancer diagnosis*. UW-Madison CS Technical Report #1280. |
| 3 | UCI ML Repository. *Breast Cancer Wisconsin (Diagnostic) Data Set*. [Official Link](https://archive.ics.uci.edu/ml/datasets/Breast+Cancer+Wisconsin+(Diagnostic)). |
| 4 | Sundararajan, M., Taly, A., & Yan, Q. (2017). *Axiomatic attribution for deep networks*. ICML 2017. (Integrated Gradients) |

---

<p align="center">
  <strong>Developed with ❤️ by Vitor Diogo Fonseca da Silva</strong><br/>
  Computer Science · Pós-Tech FIAP — Machine Learning Engineering · 2026
</p>
