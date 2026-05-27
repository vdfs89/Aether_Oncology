# Changelog

All notable changes to Aether Oncology are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [v3.0.0] - 2026-06-XX

### Changed
- Dataset migrado de WDBC (569 registros) para Oral Cancer Top 30 Countries (160.292 registros, MIT License)
- Novo target binário `high_risk` com justificativa clínica documentada no Model Card
- Pipeline de pré-processamento: `ColumnTransformer` (StandardScaler + OHE) em `src/features/preprocessor.py`
- Mini-batch training (`batch_size=512`) para suportar escala de 160k amostras com DataLoader
- Novo MLflow experiment: `Aether_Oncology_OralCancer_HighRisk`
- API v3.0: endpoint `POST /predict` migrado para `OralCancerRequest` (8 campos clínicos)

### Added
- `data/raw/oral_cancer_top30.csv` — 160.292 registros, MIT License
- `notebooks/eda_oral_cancer.ipynb` — EDA completo com Calibration Plot (Reliability Diagram) e Fairness Analysis por subgrupo (Gender, Socioeconomic_Status, Tobacco_Use)
- `src/features/preprocessor.py` — Factory de `ColumnTransformer` reutilizável (StandardScaler + OHE binário + OHE categórico)
- `src/features/__init__.py` — Novo package `features`
- `src/api/schemas.py` — Pydantic v3: `OralCancerRequest` + `PredictionResponse` com Safety Loop (`warning` para `confidence='Low'`)
- `src/api/__init__.py` — Novo package `api`
- `tests/test_model.py` — Testes unitários do MLP PyTorch (forward, output shape, gradient flow)
- `CHANGELOG.md` (este arquivo)

### Fixed
- Schema Pandera migrado de WDBC para Oral Cancer (15+ testes em `tests/test_schema.py`)
- README atualizado: exemplo `confidence: "Low"` + `warning` ativo, link `PROJECT_STATUS.md`, aviso de rotação de API Key
- Sintaxe inválida `import pandas as pd as _pd` corrigida em `src/main.py`
- `pos_weight` adicionado ao `BCEWithLogitsLoss` para lidar com desbalanceamento de classes

---

## [v2.2.0] - 2026-05-15

### Added
- SRE Hardening: X-Request-ID propagation e lifespan determinístico
- DevSecOps: Grype container scanner integrado ao pipeline CI/CD
- Documentação de conformidade EU AI Act (Annex III) com evidências
- Green AI Monitor: tracking de energia/carbono por inferência

---

## [v2.1.0] - 2026-04-XX

### Added
- Multimodal readiness: campos opcionais `GenomicMarkers` e `EHREntry`
- Clinical Feedback Loop: endpoint `POST /feedback`
- Fairness monitor: função `audit_recall_parity` para monitoramento de disparidade

---

## [v2.0.0] - 2026-03-XX

### Added
- Integrated Gradients (XAI) com visualização radar chart
- Platt Scaling para calibração de probabilidades
- KS-Test para detecção de data drift
- Integração RAG com PubMed e Cochrane

---

## [v1.0.0] - 2026-02-XX

### Added
- MVP com MLP PyTorch para classificação no dataset WDBC (569 registros)
- API FastAPI com endpoint `POST /predict`
- Autenticação via API Key
- Pipeline CI/CD básico com GitHub Actions
