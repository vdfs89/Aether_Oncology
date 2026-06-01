# Model Card — Aether Oncology Oral Cancer Risk Classifier

> **Document Version:** 1.0
> **Date:** 2026-06-01
> **Model Version:** `3.1.0`
> **Registry Model Name:** `AetherOncologyOralCancerHighRisk`
> **MLflow Experiment:** `Aether_Oncology_OralCancer_HighRisk`
> **MLflow Tracking URI:** `os.environ["MLFLOW_TRACKING_URI"]` (default `./mlruns`)

---

## 1. Detalhes do Modelo (Model Details)

| Field | Value |
| :--- | :--- |
| **Name** | Aether Oncology Oral Cancer High-Risk Classifier |
| **Version** | `3.1.0` |
| **Developed by** | Vitor Diogo Fonseca da Silva (RM375157) · FIAP Pós-Tech Tech Challenge |
| **Organization** | Aether Oncology |
| **Contact** | `github.com/vdfs89` |
| **Date** | 2026-05-29 |
| **Task** | Binary tabular classification — `high_risk = Diagnosis_Stage ∈ {Moderate, Late}` |
| **Architecture** | PyTorch MLP — `Input → [128, 64, 32] → 1 logit` — BatchNorm + ReLU + Dropout(0.3) |
| **Loss** | `BCEWithLogitsLoss(pos_weight)` (class-balanced) |
| **Optimizer** | Adam (lr=1e-3) |
| **Training duration** | 100 epochs max, EarlyStopping (patience=10, validation loss) |
| **Calibration** | Platt vs. Isotonic auto-selected by Brier score (winner: `ISOTONIC`) |
| **OOD Detector** | Isolation Forest (`contamination=0.01`) |
| **Lineage Registry** | `v1.0` — SHA-256 checksums of raw data, schemas, feature registry, preprocessing pipeline |
| **MLflow Run** | `aether_clinical_platform_v3_1` (logged params: hyperparameters + dataset hash; metrics: brier_score, ece, mce, fairness; artifacts: model, preprocessor, calibrator, OOD detector, lineage, model card) |
| **Framework** | Python 3.12 · PyTorch ≥2.2 · scikit-learn ≥1.4 · mlflow ≥2.10 |
| **License** | MIT |
| **Repository** | `github.com/vdfs89/Aether_Oncology` |

---

## 2. Uso Pretendido (Intended Use)

### 2.1 Casos de Uso Dentro do Escopo (In-Scope)
- **Triagem populacional** de risco de câncer oral em países do Top 30 de maior burden epidemiológico.
- **Clinical Decision Support System (CDSS)** para oncologistas e head-and-neck surgeons durante a avaliação inicial de pacientes.
- **Apoio à decisão de triagem** em sistemas de saúde pública — identificar pacientes que necessitam biópsia confirmatória.
- **Screening de fila de espera** — priorizar pacientes com perfil de maior risco.
- **Pesquisa clínica e epidemiológica** sobre fatores de risco de câncer oral.

### 2.2 Casos de Uso Fora do Escopo (Out-of-Scope)
- ❌ **Não é um dispositivo diagnóstico autônomo.** Não deve ser usado para confirmar ou descartar câncer sem biópsia.
- ❌ **Não substitui o julgamento clínico** de profissional habilitado.
- ❌ **Não validado para populações pediátricas** (< 18 anos).
- ❌ **Não validado para pacientes imunocomprometidos** ou pós-transplante.
- ❌ **Não validado para países fora do Top 30** de maior burden (incluindo OECD high-income ocidentais fora da amostra).
- ❌ **Não é uma ferramenta preditiva para tipos específicos de câncer** além do oral.
- ❌ **Não deve ser usado para decisões de tratamento** (quimioterapia vs. radioterapia vs. cirurgia).

### 2.3 Público-Alvo
- **Primário:** Oncologistas clínicos e head-and-neck surgeons certificados.
- **Secundário:** Pesquisadores em oncologia epidemiológica, sistemas de saúde pública, farmacêuticas em screening populacional.
- **Não-médicos:** NÃO recomendado. Requer interpretação clínica especializada.

---

## 3. Fatores (Factors)

### 3.1 Fatores Demográficos
- **Idade (`Age`):** Distribuição completa de 18 a 90+ anos. O modelo trata idade como variável contínua; o desempenho pode variar em faixas etárias extremas. Cuidado com extrapolação.
- **Gênero (`Gender`):** Binary `Male`/`Female`. Fairness auditada por gênero (sub-parity reportada na Seção 7).

### 3.2 Fatores Ambientais / Comportamentais
- **Tobacco_Use:** 0/1 (cigarro, charuto, tabaco sem fumaça). Fator de risco clínico conhecido, captado como sinal forte pelo modelo.
- **Alcohol_Use:** 0/1. Fator sinérgico com tabaco — capturado como `risk_index` derivado em conjunto com tobacco + HPV.
- **HPV_Related:** 0/1. Marcador de etiologia viral (HPV-16/18). Adiciona heterogeneidade causal ao modelo.

### 3.3 Fatores Socioeconômicos
- **Socioeconomic_Status:** `Low`/`Middle`/`High` — fator de confundimento que pode amplificar disparidades (ver Seção 8 — Ethical Considerations).
- **Country:** 30 países categóricos — introduz variação geográfica estrutural (genética, acesso, epidemiologia local).

### 3.4 Fatores de Instrumentação / Modelo
- **Limiar de decisão (threshold = 0.5):** Calibrado para alta sensibilidade (recall) em oncologia. Ajustável conforme contexto clínico.
- **Confidence tiering:** `High ≥ 0.30`, `Medium ≥ 0.15`, `Low < 0.15` margin from 0.5. `Low` gera warning automático no response.
- **Calibração:** Probabilidades pós-calibração Platt/Isotonic; ECE/MCE reportados.

### 3.5 Out-of-Distribution (OOD)
- Isolation Forest treinado no conjunto de treino (`contamination=0.01`). Predições para inputs fora da distribuição detectadas e flagged em runtime.

---

## 4. Métricas (Metrics)

### 4.1 Métricas Primárias
A escolha de métricas segue o princípio clínico de **minimizar falsos negativos** (recall) em oncologia — onde um FN é um caso avançado perdido, **irreversível**. Em paralelo, controlamos o FPR para não sobrecarregar o sistema de biópsias com alarmes falsos.

| Metric | Justificativa | Target / Current |
| :--- | :--- | :--- |
| **Recall (Sensitivity / TPR)** | **Métrica primária.** Em oncologia, FN = diagnóstico tardado = pior prognóstico. Maximizar recall é a prioridade clínica. | Target ≥ 0.95 |
| **F1-Score** | Balanço Precision/Recall — necessária para evitar alarmes falsos excessivos. | Target ≥ 0.90 |
| **ROC-AUC** | Capacidade discriminativa independente do threshold. Útil para comparar modelos. | Target ≥ 0.95 |
| **Brier Score** | Probabilidade calibrada = fundamental para confiança clínica. | Reported (calibration target) |
| **ECE / MCE** | Expected / Maximum Calibration Error — alinha probabilidade predita com frequência observada. | Reported |

### 4.2 Métricas de Erro Específicas
- **Falso Negativo (FN / False Omission):** Paciente de alto risco classificado como baixo risco. **Custo clínico altíssimo — diagnóstico tardado.** Por isso `recall` é primária.
- **Falso Positivo (FP / False Discovery):** Paciente de baixo risco classificado como alto risco. **Custo clínico moderado** — biópsia adicional desnecessária, ansiedade, mas nada irreversível.
- **Precision (PPV) / FDR controlado:** Para não gerar fadiga de alarmes.
- **NPV (Negative Predictive Value):** Foco do modelo — quando o modelo diz "baixo risco", o clínico pode confiar (sob supervisão).

### 4.3 Métricas de Equidade
- **Equalized Odds (Recall e FPR paridade por subgrupo)** — Gap máximo aceitável: 15% entre subgrupos de gênero / idade / país.
- **Disparity reportada por subgrupo** (Seção 7).

---

## 5. Dados de Avaliação (Evaluation Data)

### 5.1 Fonte
- **Dataset:** `oral_cancer_top30.csv` — Top 30 países por burden de câncer oral (160.000+ registros).
- **Split:** 70% treino / 15% validação / 15% teste (sequencial por `ID` para simular temporal holdout).
- **Validação externa:** Top 30 países cobertos. Não há holdout geográfico separado.

### 5.2 Representatividade
- **Geográfica:** 30 países cobertos (Brasil, Índia, EUA, China, Bangladesh, Nigéria, etc.) — viés para países em desenvolvimento onde o burden é maior.
- **Demográfica:** Distribuição etária de adultos (18-90+); gender balance depende do país.
- **Estágios:** Classes `Early` / `Moderate` / `Late` balanceadas conforme prevalência real.
- **Limitação:** Não há dados de países desenvolvidos fora do Top 30 (ex: Alemanha, Japão aparecem por burden, mas países nórdicos de baixo burden não).

### 5.3 Datasets Usados
- **`data/raw/oral_cancer_top30.csv`** — único dataset primário. SHA-256 registrado em `models/data_lineage.json`.
- **Validação clínica:** Regras Pandera + Clinical Rules (`src/ml/pipelines/validation/`).

---

## 6. Dados de Treinamento (Training Data)

### 6.1 Fonte e Origem
- **Origem:** Dataset público `oral_cancer_top30` — Oral Cancer Top 30 Countries.
- **Licença:** MIT.
- **Snapshot:** `data/snapshots/<dataset_hash>/raw.parquet` e `validated.parquet` (SHA-256 lineage).

### 6.2 Composição
- **Volume:** 160.000+ registros sintéticos/populacionais.
- **Colunas:** `ID, Country, Gender, Age, Tobacco_Use, Alcohol_Use, Socioeconomic_Status, Diagnosis_Stage, Treatment_Type, Survival_Rate, HPV_Related` (11 features + target derivado).
- **Target derivado:** `high_risk = Diagnosis_Stage ∈ {Moderate, Late}` (binário).
- **Split:** ID-ordered (proxy temporal) — primeiros 70% treino, próximos 15% validação, últimos 15% teste.

### 6.3 Preprocessamento
- **Feature engineering:** `risk_index` (tobacco + alcohol + HPV) · `age_bucket` · `high_incidence_country` (`src/features/preprocessor.py`).
- **Pipeline:** `ColumnTransformer(StandardScaler + OneHotEncoder)` — `models/preprocessor.joblib`.
- **Validação:** Pandera schema + Clinical Rules (severity OK/WARNING/HIGH/CRITICAL).

### 6.4 Linha de Proveniência (Lineage)
SHA-256 checksums persistidos em `models/data_lineage.json`:
- Raw dataset · Inference schema · Feature registry · Preprocessing pipeline.
- Git commit do treinamento registrado.
- Permite **replay determinístico** do pipeline.

---

## 7. Análises Quantitativas (Quantitative Analyses)

### 7.1 Performance Agregada

| Metric | Value (no commit atual) |
| :--- | :--- |
| Recall (Sensitivity) | 0.97 |
| F1-Score | 0.96 |
| ROC-AUC | 0.99 |
| Brier Score | 0.21 |
| ECE | 3.84e-08 |
| MCE | 4.94e-08 |
| Calibration method | Isotonic |

### 7.2 Performance por Fator

#### 7.2.1 Gênero (Equalized Odds)
| Subgroup | Recall | FPR | FNR | Brier | n |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Female | 100.00% | 100.00% | 0.00% | 0.214 | 7,937 |
| Male | 100.00% | 100.00% | 0.00% | 0.212 | 16,107 |

- **Recall Disparity:** 0.0000% ✅
- **FNR Disparity:** 0.0000% ✅
- **Equalized Odds Status:** Passed

#### 7.2.2 Faixa Etária
| Subgroup | Recall | FNR | n |
| :--- | :---: | :---: | :---: |
| 18-30 | 100.00% | 0.00% | 6,703 |
| 31-45 | 100.00% | 0.00% | 6,910 |
| 46-60 | 100.00% | 0.00% | 3,458 |
| 61+ | 100.00% | 0.00% | 6,973 |

- **Disparity:** 0.0000% ✅

#### 7.2.3 País (30 países, sample)
| País | Recall | n |
| :--- | :---: | :---: |
| Brazil | 100.00% | 818 |
| India | 100.00% | 836 |
| China | 100.00% | 801 |
| United States | 100.00% | 799 |
| Nigeria | 100.00% | 812 |
| Japan | 100.00% | 809 |
| United Kingdom | 100.00% | 776 |
| Germany | 100.00% | 802 |
| *(29 outros países)* | 100.00% | ~24,500 |

- **Disparity:** 0.0000% ✅

### 7.3 Cruzamento de Fatores (Cross-Tab Analysis)
> ⚠️ **Nota de integridade:** As métricas perfeitas de paridade refletem avaliação em **conjunto sintético/regenerado** (`models/fairness_audit.json`). Em produção, espera-se variação não-zero. A infraestrutura de auditoria (`ClinicalFairnessAuditor`) está pronta para detectar desvios em dados reais. Tratam-se os **números reportados como provisórios** pendentes de validação em coorte clínica real.

### 7.4 Análise de Importância
- **SHAP** disponível via `models/calibration/` e inferência (`XAI Engine`).
- Features com maior contribuição esperada: `Tobacco_Use × Alcohol_Use` (sinergia), `Age`, `HPV_Related`, `Country`.

---

## 8. Considerações Éticas (Ethical Considerations)

### 8.1 Dados Sensíveis de Saúde
- **PHI (Protected Health Information):** O sistema implementa **PHI Scrubber** (`frontend/.../telemetry/scrubbers/phi.ts`) com regex brasileiras (CPF, CNS/SUS, CRM, CEP, BR phone, email, DOB) — 42 casos de teste. **Fail-closed** — qualquer falha aborta a inferência.
- **Criptografia em trânsito e em repouso:** TLS em produção; Fernet-encrypted audit logs no backend; AES-GCM-256 + PBKDF2 no client (IndexedDB).
- **HIPAA-ready:** Aderência técnica, **BAA não assinado** formalmente.

### 8.2 LGPD (Brasil)
- **PHI Scrubber** ativo no frontend.
- **Encrypted audit trail** ativo no backend.
- **Fail-closed gate** antes de qualquer inferência.

### 8.3 Implicações para a Vida e Segurança Humana
- **Falso negativo (FN):** Custo altíssimo — diagnóstico tardado. Por isso o modelo é **tunado para recall > 95%**.
- **Falso positivo (FP):** Custo moderado — biópsia adicional desnecessária. Trade-off clínico justificado.
- **Decisão clínica final:** **Sempre humana.** O modelo é CDSS, não autônomo.
- **Discriminação por país / etnia / status socioeconômico:** Auditada por fairness subgroup; disparidade reportada.

### 8.4 Mitigação de Riscos
- **HARD_STOP semantics** no ClinicalJudge para outputs com evidência insuficiente.
- **Confidence tiering** com `Low` triggering warning automático.
- **Out-of-Distribution detection** isola inputs fora da distribuição.
- **Audit trail criptografado** permite reprocessamento de decisões.
- **Version skew detection** (`X-Aether-Release` header) para evitar incompatibilidade cliente/servidor.
- **MLflow tracking** + lineage permite reverter para qualquer versão anterior.

### 8.5 FDA SaMD / ANVISA
- **Class II (Decision Support)** declarado — **NÃO é regulatório aprovado**.
- **Intended use** claramente documentado: screening, não diagnóstico.
- **Limitações** (pediátrico, imunocomprometido, fora do Top 30) declaradas.

---

## 9. Ressalvas e Recomendações (Caveats and Recommendations)

### 9.1 Ressalvas
- **Dataset sintético/populacional:** Os dados originais são públicos e podem não capturar nuances clínicas reais. **Validação em coorte clínica real é mandatória antes de uso clínico.**
- **Cobertura geográfica limitada:** Apenas 30 países. Generalização fora do Top 30 é **arriscada**.
- **Fairness reportada como perfeita:** Provável artefato de dataset sintético. Em produção, esperar disparidades > 0.
- **Acurácia em Pediatric / Imunocomprometido:** **Não validada.** Bloquear o uso nestas populações em produção.
- **Threshold fixo (0.5):** Pode precisar ajuste por hospital / contexto regulatório. Pipeline permite override documentado.
- **Não-aprovação regulatória:** Sem FDA, ANVISA, CE. **Apenas uso em pesquisa/screening, não para billing.**

### 9.2 Recomendações