# Estratégia de Negócio & Pipeline CRISP-DM
## Aether Oncology — Oral Cancer Risk Classifier v3.1

> **Documento:** Relatório Executivo — alinhamento técnico ↔ negócio
> **Frame:** CRISP-DM (Cross-Industry Standard Process for Data Mining)
> **Dataset:** `oral_cancer_top30` — Top 30 países por burden, 160.000+ registros (MIT)
> **Versão:** 1.0 · 2026-06-01
> **Autor:** Vitor Diogo Fonseca da Silva · Aether Oncology

---

## 🎯 Executive Summary

A Aether Oncology entrega um **Clinical Decision Support System (CDSS)** para triagem de risco de câncer oral, com recall clínico ≥ 0.97, governança HIPAA/LGPD-ready, fairness auditada por subgrupo e rastreabilidade total (SHA-256 lineage + MLflow tracking + audit trail criptografado).

**Dor de negócio resolvida:**
- 54% dos projetos de Data Science falham por desalinhamento entre estratégia de negócio e execução técnica (fonte: literatura Gartner / Anaconda State of DS 2024).
- Aether Oncology endereça esse gap com **matriz de maturidade explícita** (✅ Current / 🧪 Experimental / 🟡 Mock / 🗓️ Planned) em todas as capacidades.
- Toda a pipeline é orientada a **decisão clínica auditável** — não a "métricas em Kaggle".

**Stakeholders:** oncologistas, head-and-neck surgeons, sistemas de saúde pública, pesquisadores em oncologia.

**Diferenciais competitivos:**
1. **Recall-first design** — FN custa vidas; o modelo é calibrado para detectar todos os casos de risco.
2. **Lineage criptográfico** — replay determinístico de qualquer decisão.
3. **Governance end-to-end** — ClinicalJudge + HARD_STOP semantics + physician approval.
4. **Compliance by design** — PHI scrubber fail-closed, audit trail Fernet, IndexedDB AES-GCM-256.

---

## 📊 Alinhamento CRISP-DM

### Fase 1 — Business Understanding
**Objetivo de negócio:** Reduzir o tempo médio de diagnóstico de câncer oral em países do Top 30 de burden, aumentando a taxa de detecção precoce.

**Perguntas de negócio:**
1. Quais perfis demográficos/comportamentais têm maior risco de diagnóstico tardio?
2. Como alocar recursos de triagem (biópsias, exames) de forma otimizada?
3. Quais países/regiões precisam de campanhas de prevenção intensificadas?
4. Como garantir que o sistema **não amplifique disparidades** socioeconômicas?

**Critérios de sucesso:**
- **Clínico:** Recall ≥ 0.95 (detectar ≥ 95% dos casos de risco).
- **Negócio:** Reduzir custo de triagem por paciente com triagem inteligente.
- **Ético:** Disparidade de recall entre subgrupos < 15% (Equalized Odds).
- **Regulatório:** Alinhamento HIPAA/LGPD/FDA-SaMD (sem certificação formal).

**Riscos de negócio endereçados:**
- **Risco clínico:** FN = diagnóstico tardado. Mitigação: recall-first, confidence tiering, warning em casos `Low`.
- **Risco regulatório:** PHI leak. Mitigação: scrubber fail-closed, audit trail criptografado.
- **Risco de reputação:** Discriminação por país/gênero. Mitigação: fairness audit + report público.
- **Risco de negócio:** Vendor lock-in. Mitigação: arquitetura aberta, dados em formato público (MIT).

### Fase 2 — Data Understanding

**Fonte:** `data/raw/oral_cancer_top30.csv` (11 colunas, 160k+ registros).

**Variáveis-chave:**
- **Demográficas:** `Age`, `Gender`, `Country`.
- **Comportamentais:** `Tobacco_Use`, `Alcohol_Use`, `HPV_Related`.
- **Socioeconômicas:** `Socioeconomic_Status`, `Country` (proxy de acesso a saúde).
- **Clínicas:** `Diagnosis_Stage`, `Treatment_Type`, `Survival_Rate`.

**EDA realizada:** `notebooks/eda_oral_cancer.ipynb` — análise univariada, bivariada, padrões de missing, distribuição de classes.

**Qualidade dos dados:**
- **Strengths:** volume grande (160k+), cobertura de 30 países, licença MIT.
- **Weaknesses:** dados sintéticos/populacionais, possível desbalanceamento, ausência de longitudinalidade real.
- **Mitigação:** Pandera schema validation + Clinical Rules (severity OK/WARNING/HIGH/CRITICAL) bloqueiam inferência em registros incoerentes.

### Fase 3 — Data Preparation

**Pipeline:** `src/features/preprocessor.py`
- **Feature engineering:** `risk_index` (tobacco + alcohol + HPV combinados), `age_bucket` (18-30, 31-45, 46-60, 61+), `high_incidence_country` (binário).
- **Encoding:** `ColumnTransformer(StandardScaler + OneHotEncoder)` — persistido em `models/preprocessor.joblib`.
- **Validação:** Pandera DataFrame schema (treino estrito, inferência flexível com `Unknown`).
- **Snapshot imutável:** SHA-256 do raw dataset + Parquet imutável em `data/snapshots/<hash>/`.
- **Split:** 70% treino / 15% validação / 15% teste — **ID-ordered (proxy temporal)** para evitar data leakage temporal.

### Fase 4 — Modeling

**Algoritmo:** PyTorch MLP — `Input → [128, 64, 32] → 1 logit` com BatchNorm + ReLU + Dropout(0.3).

**Hiperparâmetros (HPARAMS fixos em `src/train.py`):**
```python
{
  "seed": 42, "test_size": 0.15, "val_size": 0.15,
  "hidden_dims": [128, 64, 32], "dropout_rate": 0.3,
  "learning_rate": 1e-3, "max_epochs": 100, "patience": 10,
  "batch_size": 512
}
```

**HPO:** Optuna (TPE sampler) — `src/optimize.py`.

**Calibração:** Platt vs. Isotonic auto-selected por Brier score (winner: `ISOTONIC`).

**OOD Detection:** Isolation Forest (`contamination=0.01`).

**Leakage Audit:** Pearson |r| > 0.95, MI > 0.95, permutation importance > 0.45.

### Fase 5 — Evaluation

**Métricas globais:**
| Métrica | Valor |
| :--- | :---: |
| Recall (Sensitivity) | 0.97 |
| F1-Score | 0.96 |
| ROC-AUC | 0.99 |
| Brier Score | 0.21 |
| ECE | 3.84e-08 |
| MCE | 4.94e-08 |

**Fairness Audit (Equalized Odds):**
- Disparidade de Recall por gênero: 0.00% ✅
- Disparidade de FNR por idade: 0.00% ✅
- Disparidade por país (30 países): 0.00% ✅

**Nota de integridade:** as métricas perfeitas de paridade refletem avaliação em dataset sintético/regenerado. Em produção, esperar variação não-zero. A infraestrutura de auditoria está pronta.

**MLflow tracking:** experimento `Aether_Oncology_OralCancer_HighRisk` — todos os hiperparâmetros, métricas e artefatos versionados.

### Fase 6 — Deployment

**Arquitetura em produção:**
- **Frontend:** Next.js 15 + TypeScript — Vercel (`https://aetheroncology.vercel.app`).
- **Backend:** FastAPI + PyTorch — Render (`https://api.vitorsilva.engineer`).
- **Custom domain:** `portal.vitorsilva.engineer` (Vite portal interativo) via Name.com nameservers → CNAME para Render.
- **Custom domain:** `aetheroncology.vercel.app` para o frontend Next.js.

**Pipeline de inferência:**
1. **Client-side:** PHI scrubber (fail-closed) → validação de schema flexível.
2. **Transport:** SSE streaming com 13-event Zod-validated protocol.
3. **Backend:** preprocessing (joblib) → MLP (PyTorch) → calibrator (Isotonic) → OOD check → audit log.
4. **Audit:** Fernet-encrypted log append com SHA-256 chain.

**Observabilidade:**
- **MLflow:** todos os runs versionados.
- **Audit trail:** every prediction logged (encrypted).
- **SRE middleware:** X-Request-ID correlation, X-Aether-Release version skew detection.
- **Drift monitoring:** KS-test, PSI, JS-divergence (`/monitor/drift`).
- **Health endpoints:** `/health`, `/health/live`, `/health/ready`, `/health/inference`.

---

## 🎯 Alinhamento Estratégia ↔ Implementação

### Matriz de Maturidade (Honestidade Técnica)

| Capability | Status | Justificativa |
| :--- | :---: | :--- |
| `/predict` (MLP + safety loop) | ✅ Current | Em produção, rate-limited, audited fail-closed. |
| Audit trail criptografado | ✅ Current | Fernet + versioned envelopes. |
| MLOps governance (Pandera + calibração + fairness + drift) | ✅ Current | Pipeline completo. |
| Multi-provider LLM router + circuit breaker | ✅ Current | Groq + Gemini fallback. |
| Frontend multi-agent runtime | ✅ Current | Planner, state machine, override engine. |
| Clinical Safety Judge (LLM-based) | 🧪 Experimental | Não roda em `/predict` — apenas `/chat`. |
| Physician approval workflow | 🧪 Experimental | Identity usa demo profile; SSO/SAML pendente. |
| Clinical tools (biomarker, therapy-match) | 🟡 Mock | Hardcoded data; backends reais são Phase-3. |
| Genomic integration (KRAS/EGFR/HER2) | 🗓️ Planned | Roadmap. |

### Insights Extraídos do Dataset (160k+ registros)

1. **Top 5 países por burden:** Índia, China, EUA, Bangladesh, Brasil — alvo de campanhas de triagem intensiva.
2. **Sinergia tobacco+alcohol:** risco composto é o sinal mais forte do modelo. Campanhas de prevenção devem ser integradas (não isoladas).
3. **HPV-Related:** heterogeneidade causal — modelos separados podem ser úteis para HPV+ vs HPV-.
4. **Disparidade por status socioeconômico:** `Low` correlaciona com diagnóstico tardado. Triagem deve priorizar populações de baixa renda.
5. **Sobrevida média:** varia ~30-80% por país — necessidade de adaptação local de tratamento.

### Aplicabilidade Real de Negócio

**Cenários de uso imediatos:**
1. **Screening populacional em regiões endêmicas** — pré-triagem em campanhas de saúde pública.
2. **Triagem de fila de espera em hospitais** — priorizar biópsias em pacientes de alto risco.
3. **Pesquisa clínica** — identificar coortes de risco para estudos longitudinais.
4. **Educação médica** — usar SHAP values para treinar novos clínicos em fatores de risco.

**Cenários de uso futuro:**
- Integração com **EHRs** (FHIR/PACS) para scoring automático em tempo real.
- **Tumor board simulation** com múltiplos agentes deliberando.
- **Federated learning** entre hospitais sem expor dados de pacientes.

### KPIs de Negócio Pós-Deployment

| KPI | Baseline | Target 6 meses | Target 12 meses |
| :--- | :---: | :---: | :---: |
| Detecção precoce (estágio Early) | TBD | +10% | +25% |
| Tempo médio de biópsia | TBD | -15% | -30% |
| Disparidade socioeconômica | TBD | -5% | -10% |
| Recall clínico | 0.97 | ≥ 0.95 | ≥ 0.95 |
| Custo de triagem por caso detectado | TBD | -20% | -40% |

---

## 🛡️ Mitigação de Riscos do Projeto

| Risco | Probabilidade | Impacto | Mitigação Implementada |
| :--- | :---: | :---: | :--- |
| **Data quality** (sintético) | Alta | Alto | Pandera + Clinical Rules; transparência em `model_card.md`. |
| **Regulatory approval** | Alta | Alto | FDA SaMD Class II declarado; ANVISA-ready; **NÃO é regulatório aprovado**. |
| **PHI leak** | Média | Altíssimo | Scrubber fail-closed; audit trail Fernet; IndexedDB AES-GCM-256. |
| **Model drift** | Média | Alto | KS-test + PSI + JS-divergence; retreino agendado. |
| **Discriminação** | Média | Altíssimo | Equalized Odds audit; report público por subgrupo. |
| **Clinical misinterpretation** | Média | Altíssimo | CDSS (não autônomo); confidence tiering; warning em `Low`. |
| **Vendor lock-in** | Baixa | Médio | MIT license; dados públicos; arquitetura aberta. |
| **Cyber attack** | Baixa | Altíssimo | Fail-closed auth; API key em prod; rate limiting. |

---

## 🔄 Próximos Passos (CRISP-DM Phase 6 → Continuous Improvement)

### Curto Prazo (3 meses)
- [ ] Validar em coorte clínica real (hospital parceiro).
- [ ] Migrar audit log para **PostgreSQL/Supabase** (Aurora já provisionada).
- [ ] Adicionar **OpenTelemetry** distributed tracing.
- [ ] Implementar hospital **SSO/SAML** para identidade real do médico.

### Médio Prazo (6-12 meses)
- [ ] Substituir **mock clinical tools** por backends reais (biomarker, therapy-match, guidelines).
- [ ] **RAG sobre NCCN Guidelines** com vector store real.
- [ ] **Fairlearn** bias auditing em CI.
- [ ] **Temporal reasoning** sobre trajetórias longitudinais de biomarcadores.

### Longo Prazo (12+ meses)
- [ ] **Tumor-board simulation** multi-agente.
- [ ] **Genomic integration** (KRAS, EGFR, HER2) — correlação multimodal.
- [ ] **FHIR + PACS** integração em tempo real.
- [ ] **Federated learning** + **differential privacy** para cross-institution training.

---

## 📞 Stakeholders & Contato

| Papel | Nome | Contato |
| :--- | :--- | :--- |
| **Tech Lead / Autor** | Vitor Diogo Fonseca da Silva | `github.com/vdfs89` |
| **FIAP Orientação** | Pós-Tech FIAP | `fiap.com.br` |
| **Compliance Officer** | A definir (HIPAA/LGPD) | — |
| **Clinical Advisor** | A definir (oncologia) | — |
| **SRE** | A definir | — |

---

> **Confidencialidade:** Este documento contém informações estratégicas e técnicas. Distribuição restrita a stakeholders autorizados sob NDA.

> **Próxima revisão:** Trimestral ou após deploy em hospital parceiro.
