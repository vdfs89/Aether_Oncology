---
language:
  - pt
  - en
license: mit
tags:
  - tabular-classification
  - binary-classification
  - oncology
  - oral-cancer
  - pytorch
  - scikit-learn
  - mlp
  - clinical-decision-support
  - rag
  - xai
task_categories:
  - tabular-classification
task_ids:
  - binary-classification
metrics:
  - recall
  - f1
  - roc_auc
  - precision
pipeline_tag: tabular-classification
datasets:
  - custom/oral-cancer-top-30-countries
framework:
  - pytorch
  - scikit-learn
model_version: "3.1.0"
model_stage: production
compliance:
  - LGPD
  - HIPAA
  - EU-AI-Act
intended_use: clinical-decision-support
autonomous_diagnosis: false
---

# 🧬 MODEL CARD: Aether Oncology — Oral Cancer High-Risk Classifier v3.1.0

> **Resumo:** modelo de triagem de risco de câncer oral (estágio Inicial vs. Avançado), parte do *Clinical AI Operating System* Aether Oncology. Otimizado para **Recall** e governado por um pipeline completo de MLOps (Pandera, calibração, fairness, lineage, drift). **Não é diagnóstico** — apoio à decisão clínica com supervisão médica obrigatória.

---

## 1. Detalhes do Modelo

| Campo | Valor |
| :--- | :--- |
| **Desenvolvedor** | Vitor Diogo Fonseca da Silva (Tech Challenge 01 — FIAP Pós-Tech) |
| **Versão** | `3.1.0` |
| **Tipo** | Rede Neural (Multilayer Perceptron) para classificação binária probabilística calibrada |
| **Arquitetura** | `Input → [128, 64, 32] → 1 logit` · BatchNorm · ReLU · Dropout(0.3) |
| **Treino** | `BCEWithLogitsLoss(pos_weight)` · early stopping (patience=10) · HPO via Optuna (TPE) |
| **Frameworks** | PyTorch · scikit-learn · Pandera (data contract) |
| **Registro MLflow** | `AetherOncologyOralCancerHighRisk` |
| **Artefatos** | `models/aether_mlp_v2.pth` · `preprocessor.joblib` · `calibrator.joblib` · `ood_detector.joblib` |
| **Licença** | MIT |

> ℹ️ A fonte da verdade *gerada automaticamente* (hashes de lineage, métricas de calibração, tabela de fairness por subgrupo) vive em [`models/model_card.md`](../models/model_card.md), produzida pelo `src/ml/pipelines/model_card_generator.py` a cada treino. Este documento é a versão curada e contextualizada.

---

## 2. Uso Pretendido (Intended Use)

- **Público-alvo:** oncologistas e cirurgiões de cabeça e pescoço.
- **Uso primário:** Sistema de Apoio à Decisão Clínica (CDSS) para **triagem de risco de câncer oral**, classificando perfis de risco demográfico/clínico em **Estágio Inicial (Early)** vs. **Estágio Avançado (Moderate/Late)**.
- **Justificativa de negócio (custo do erro):** em oncologia, o custo de um **Falso Negativo** é incomensuravelmente maior que o de um Falso Positivo. Por isso o modelo é deliberadamente calibrado para **Recall ≈ 97%**, aceitando conscientemente mais falsos positivos.
- **Fora de escopo:** não realiza diagnóstico autônomo, não substitui biópsia/histologia e não prescreve terapias ou dosagens.

---

## 3. Dados de Treinamento & Features

| Campo | Valor |
| :--- | :--- |
| **Dataset** | *Oral Cancer Top 30 Countries* (Licença MIT) |
| **Alvo** | `high_risk = Diagnosis_Stage ∈ {Moderate, Late}` (binário) |
| **Features brutas (8)** | `Age`, `Survival_Rate`, `Tobacco_Use`, `Alcohol_Use`, `Country`, `Gender`, `Socioeconomic_Status`, `Treatment_Type` |
| **Features derivadas** | `risk_index` (tabaco+álcool+HPV), `age_bucket`, `high_incidence_country` |
| **Pré-processamento** | `ClinicalFeatureExtractor` → `StandardScaler` (numéricas) + `OneHotEncoder` (categóricas) |
| **Split** | Temporal/sequencial por `ID` — 70% treino / 15% val / 15% teste |
| **Fontes clínicas das features** | WHO · NCCN · SEER · IARC (ver `feature_registry.json`) |

**Governança de dados aplicada no treino (`src/train.py`):**
- **Contratos Pandera** distintos para treino e inferência.
- **Regras de coerência clínica** com severidade `OK/WARNING/HIGH/CRITICAL` (exclusão pediátrica <18, limites de sobrevida, inconsistência estágio/sobrevida).
- **Auditoria de vazamento** — bloqueio de features posteriores (`Diagnosis_Stage`); thresholds Pearson \|r\|>0,95, MI>0,95, importância por permutação>0,45.
- **Detecção OOD** — Isolation Forest (`contamination=0.01`).
- **Snapshots imutáveis** (`raw.parquet` / `validated.parquet`) indexados por hash SHA-256 do dataset.

---

## 4. Calibração

O modelo seleciona automaticamente o melhor método de calibração (Platt vs. Isotônica) por Brier score.

| Métrica | Valor | Método |
| :--- | :--- | :--- |
| **Método selecionado** | `ISOTONIC` | — |
| **Brier Score** | `0.210` | menor é melhor |
| **Expected Calibration Error (ECE)** | `≈ 3.84e-08` | 10 bins |
| **Maximum Calibration Error (MCE)** | `≈ 4.94e-08` | 10 bins |

Curva de confiabilidade persistida em [`models/calibration/reliability_curve.png`](../models/calibration/reliability_curve.png).

---

## 5. Auditoria de Fairness (Equalized Odds)

A auditoria (`src/ml/pipelines/audit/fairness.py`) computa Recall / FPR / FNR / Brier por subgrupo de **Gênero**, **faixa etária** e **País** (30 países), com threshold de disparidade de **15%**. O relatório completo está em [`models/fairness_audit.json`](../models/fairness_audit.json) e na tabela por subgrupo em [`models/model_card.md`](../models/model_card.md).

> [!WARNING]
> **Nota de integridade (transparência obrigatória).** O relatório de fairness versionado reporta **Recall 100% e FPR 100%** em *todos* os subgrupos simultaneamente. Essas duas métricas não podem ambas ser 100% em um holdout clínico real — o resultado é matematicamente consistente apenas com um limiar de decisão degenerado (o modelo prediz "positivo" para todos) ou com um conjunto de avaliação sintético/regenerado.
>
> **Interpretação honesta:** a *infraestrutura* de auditoria de fairness é de nível de produção e funcional; os *números reportados* são **provisórios** e não devem ser citados como evidência de equidade clínica até validação sobre dados clínicos reais e rotulados. Veja o roadmap (auditoria automatizada com Fairlearn).

---

## 6. Explicabilidade (XAI) & RAG

- **Interpretabilidade:** atribuição de features via **Integrated Gradients** (`src/services/predictor.py`) sobre o modelo local; o portal exibe o "gatilho decisório" em um gráfico radar. *Status: implementado; atribuição em produção ainda não totalmente validada.*
- **RAG (Retrieval-Augmented Generation):** busca de evidência científica em **PubMed (Entrez)**, **Cochrane** e **Semantic Scholar** (`src/services/research.py`), com circuit breaker por provedor, deduplicação por URL e cache em disco (24h). *Vector store semântico (`VectorDBService`) atualmente é stub — fallback para busca ao vivo.*

---

## 7. Limitações & Contraindicações

> [!CAUTION]
> - **Não diagnóstico:** apenas apoio à triagem; não substitui biópsia ou histologia.
> - **Exclusão pediátrica:** não validado para menores de 18 anos.
> - **Imunocomprometidos:** não validado para populações imunocomprometidas ou pós-transplante.
> - **Variância geográfica:** validado principalmente nos 30 países de maior incidência; usar com cautela fora deles.
> - **Distribuição:** entradas fora da distribuição de treino podem ser sinalizadas pelo detector OOD, mas não bloqueadas.

---

## 8. Governança, Compliance & Ambiente

| Pilar | Implementação |
| :--- | :--- |
| **HIPAA / LGPD** | Trilha de auditoria criptografada com Fernet (AES-128-CBC + HMAC); IndexedDB criptografado com Web Crypto PBKDF2 + AES-GCM-256; scrubber de PHI (LGPD). |
| **FDA SaMD** | Categoria **Classe II** (apoio à decisão); model cards + lineage SHA-256 + replay event-sourced. |
| **EU AI Act** | Mapeado como **Alto Risco (Anexo III)** com supervisão humana integrada. |
| **Rastreabilidade** | Middleware de correlação `X-Request-ID` ligando request → audit trail → logs. |
| **Drift** | Monitoramento KS-Test / PSI / JS divergence; gatilho global quando >33% das features sofrem drift. |
| **Resiliência** | Circuit breakers em dependências externas (PubMed/Scholar/HF) e na cadeia de provedores LLM (Groq → Gemini). |
| **Green AI** | Arquitetura otimizada para CPU; rastreamento de energia/CO₂ por inferência (`green_ai.py`). |

---

## 9. Referências Técnicas

1. **GLOBOCAN / IARC.** *Global Cancer Observatory — Lip & Oral Cavity Cancer.*
2. **NCCN.** *Clinical Practice Guidelines in Oncology — Head and Neck Cancers.*
3. **Sundararajan, M., Taly, A., & Yan, Q. (2017).** *Axiomatic Attribution for Deep Networks (Integrated Gradients).* ICML 2017.
4. **Guo, C. et al. (2017).** *On Calibration of Modern Neural Networks.* ICML 2017.
5. **Hardt, M., Price, E., & Srebro, N. (2016).** *Equality of Opportunity in Supervised Learning (Equalized Odds).* NeurIPS 2016.
6. **Pandera Documentation.** *Data Contracts and Validation Patterns for ML.*

---

> Esta documentação segue as diretrizes de transparência para modelos clínicos e o framework MRM3.
> Para a versão gerada automaticamente (hashes, métricas e tabelas por subgrupo), consulte [`models/model_card.md`](../models/model_card.md).

*Aether Oncology — Medicina é Arte, Ciência é a Ferramenta.*
