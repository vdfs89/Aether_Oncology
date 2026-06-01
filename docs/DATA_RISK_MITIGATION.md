# Mitigação de Riscos de Dados
## Aether Oncology — Estratégia Defensiva contra as 2 maiores causas de falha em projetos de dados

> **Documento:** Política de Mitigação de Riscos de Dados
> **Versão:** 1.0 · 2026-06-01
> **Escopo:** Aether Oncology v3.1 — pipeline de ML clínico
> **Alinhamento:** GDPR, LGPD, HIPAA, FDA SaMD, ISO 27001

---

## 🎯 Contexto

Dados da indústria (Gartner, Anaconda State of DS 2024, IBM Global AI Adoption) mostram que **as duas maiores causas de falha em projetos orientados a dados são**:

1. **Baixa qualidade dos dados** (≈ 40-50% dos projetos)
2. **Problemas de acesso a dados** (≈ 30-40% dos projetos)

Este documento descreve **explicitamente** como a Aether Oncology mitiga esses riscos, com mecanismos técnicos e contratuais.

---

## 🛡️ RISCO 1: Baixa Qualidade dos Dados

### Vetores de risco
- ❌ Dados faltantes
- ❌ Outliers / incoerências clínicas
- ❌ Duplicatas
- ❌ Inconsistências entre tabelas / colunas
- ❌ Drift (mudança de distribuição ao longo do tempo)
- ❌ Viés de seleção / amostragem
- ❌ Dados sintéticos sem validação clínica
- ❌ Labels ruidosos / incorretos
- ❌ Vazamento de dados (data leakage)

### Mitigações Implementadas

#### 1.1 Validação de Schema Rígida (Pandera)

**Implementação:** `src/ml/pipelines/validation/training_schema.py`

```python
training_raw_schema = DataFrameSchema({
    "ID": Column(int, Check.between(1, 10_000_000)),
    "Age": Column(int, Check.between(0, 120)),
    "Tobacco_Use": Column(int, Check.isin([0, 1])),
    # ... outras colunas
})
```

- **Treino:** schema estrito — qualquer violação bloqueia o pipeline.
- **Inferência:** schema flexível (aceita `Unknown` em enums) para não bloquear produção.
- **Local:** `src/ml/pipelines/validation/inference_schema.py`

#### 1.2 Clinical Rules Engine

**Implementação:** `src/ml/pipelines/validation/clinical_rules.py`

- Cada registro recebe `severity: OK | WARNING | HIGH | CRITICAL` baseado em regras:
  - Idade < 18 (exclusão pediátrica) → **CRITICAL** → bloqueia inferência.
  - Estágio vs. sobrevivência inconsistente (ex: `Early` com survival < 0.1) → **HIGH** → bloqueia.
  - Limites de sobrevivência fora do range clínico plausível (0.0 a 1.0) → **HIGH** → bloqueia.
  - País + estágio + idade incompatíveis com o burden local → **WARNING** → permite com flag.

#### 1.3 Out-of-Distribution Detection (Isolation Forest)

**Implementação:** `src/ml/pipelines/preprocessing/ood.py`

- Treinado no conjunto de treino (`contamination=0.01`).
- Predições para inputs fora da distribuição → flag `ood_detected=true` no response.
- Bloqueia inferência em combinações demográficas nunca vistas em produção.

#### 1.4 Auditoria de Data Leakage

**Implementação:** `src/ml/pipelines/audit/leakage.py`

- Bloqueia **features posteriores** (ex: `Diagnosis_Stage`, `Treatment_Type` no treino).
- Detecta correlação espúria: Pearson \|r\| > 0.95, Mutual Information > 0.95, permutation importance > 0.45.
- Bloqueia treino se leakage detectado — `ValueError` raised.

#### 1.5 Probabilidade Calibrada (Platt vs. Isotonic)

**Implementação:** `src/ml/pipelines/calibration/calibration_engine.py`

- Auto-seleção por Brier score.
- ECE/MCE reportados — alinhamento entre probabilidade predita e frequência observada.
- Reliability curve plotada em `models/calibration/reliability_curve.png`.

#### 1.6 Fairness Audit (Equalized Odds)

**Implementação:** `src/ml/pipelines/audit/fairness.py`

- Avalia disparidade de Recall e FPR por subgrupo (gênero, idade, país).
- Gap máximo aceitável: **15%**. Se excedido, alerta em `models/fairness_audit.json`.

#### 1.7 Drift Monitoring Contínuo

**Implementação:** `src/ml/pipelines/drift/` + `src/ml_platform/drift.py`

- **KS-test** (Kolmogorov-Smirnov) — p < 0.05 indica drift significativo.
- **PSI** (Population Stability Index) — ≥ 0.25 alerta.
- **JS-divergence** — ≥ 0.20 alerta.
- **Global flag** — se > 33% das features em drift, dispara retreino.

#### 1.8 Snapshot Imutável + Lineage

**Implementação:** `src/ml/pipelines/lineage.py` + `data/snapshots/<hash>/`

- SHA-256 do dataset raw + Parquet imutável.
- Validação SHA-256 em todo load — detecta corrupção silenciosa.
- Git commit registrado — reprodutibilidade total.

#### 1.9 Remoção de Duplicatas

- `df_validated = df_raw.drop_duplicates()` aplicado no pipeline de treino.
- Relatório do número de duplicatas removidas logado.

#### 1.10 Honestidade sobre Dados Sintéticos

- `models/model_card.md` **declara explicitamente** que os dados são sintéticos/populacionais.
- Recomenda validação em **coorte clínica real** antes de uso clínico.
- Não esconde limitações — **fail-fast culture**.

---

## 🛡️ RISCO 2: Problemas de Acesso a Dados

### Vetores de risco
- ❌ PHI leak durante desenvolvimento (LGPD, HIPAA violation).
- ❌ Credenciais vazadas em repositório.
- ❌ Logs de produção contendo dados sensíveis.
- ❌ Acesso não-autorizado a dados por terceiros.
- ❌ Vazamento via backups inseguros.
- ❌ Falta de auditoria de quem acessou o quê.
- ❌ Vendor lock-in de provedores de dados.

### Mitigações Implementadas

#### 2.1 Criptografia em Repouso (At Rest)

| Camada | Primitive | Implementação |
| :--- | :--- | :--- |
| **Audit logs** | Fernet (AES-128-CBC + HMAC-SHA256) | `src/services/audit.py` |
| **IndexedDB (frontend)** | AES-GCM-256 + PBKDF2-SHA256 (100k iter) | `frontend/.../persistence/crypto.ts` |
| **Lineage** | SHA-256 checksums | `models/data_lineage.json` |
| **Versioned envelopes** | key_version, algorithm, encrypted, payload | `audit.py` envelopes |

#### 2.2 Criptografia em Trânsito (At Flight)

- **TLS 1.3** obrigatório em produção (Render, Vercel).
- **HTTPS-only** CORS.
- **CSP** (Content Security Policy) com `connect-src` restrito a domínios autorizados.
- **X-Request-ID** correlation header.

#### 2.3 PHI Scrubber (LGPD)

**Implementação:** `frontend/.../telemetry/scrubbers/phi.ts`

- Regex brasileiras: **CPF, CNS/SUS, CRM, CEP, BR phone, email, DOB**.
- 42 casos de teste (100% coverage).
- **Fail-closed**: se scrubbing falhar, **aborta inferência**.
- Roda **antes** de qualquer telemetria/log.

#### 2.4 Autenticação Fail-Closed

**Implementação:** `src/main.py:get_api_key()`

- Em produção (`AETHER_ENV != dev`), se `API_KEY` ausente → **503** (nunca acesso anônimo).
- Backend **nunca** usa default/ephemeral keys em produção.
- `AUDIT_ENCRYPTION_KEY` ausente → audit writes desabilitados (fail-safe) + log CRITICAL.

#### 2.5 Audit Trail Imutável

- Cada prediction loga: timestamp, request_id, user_id, features (PHI-scrubbed), prediction.
- Logs criptografados Fernet.
- Imutável — append-only.
- Rotação: `audit_rotation.py` move segmentos antigos para cold storage.
- Compliance report: `GET /audit` (protegido por API key).

#### 2.6 Separação de Credenciais

- **Nenhuma** credencial em repositório.
- `.env.example` documenta variáveis; `.env` no `.gitignore`.
- Backend lê de env vars: `os.getenv("API_KEY")`, `os.getenv("GROQ_API_KEY")`, etc.
- **Auditoria via API** mostra que `.env` está em `.gitignore`.

#### 2.7 CORS Rígido

```python
allow_origins=[
    "https://aetheroncology.vercel.app",      # Production Frontend
    "https://aether-oncology.vercel.app",      # legacy alias
    "http://localhost:3000",                  # dev frontend
    "http://localhost:5173",                  # dev portal
]
```

- Apenas domínios whitelisted.
- Sem `allow_origins=["*"]` em produção.

#### 2.8 Rate Limiting (SlowAPI)

- `/predict`: 10 req/min (evita abuso).
- `/health`: 60 req/min.
- SlowAPI middleware global.

#### 2.9 Versionamento e Rollback

- **MLflow tracking** registra todas as versões de modelo.
- Lineage permite reverter para qualquer versão anterior.
- Version skew detection (`X-Aether-Release`) previne incompatibilidade cliente/servidor.

#### 2.10 Licença Aberta (MIT)

- Dados do Top 30 países: licença MIT.
- Sem vendor lock-in — pode-se trocar de plataforma sem reescrever.
- Arquitetura aberta (FastAPI, Next.js, PyTorch).

#### 2.11 Documentação de Compliance

- **HIPAA / LGPD / FDA SaMD** declarados no `model_card.md` e `README.md`.
- **Fairness report** por subgrupo publicado em `models/fairness_audit.json`.
- **Compliance report** endpoint: `GET /compliance/report`.

---

## 📊 Resumo Executivo da Mitigação

| Categoria | Mitigações Ativas | Cobertura |
| :--- | :---: | :---: |
| **Validação de schema** | 2 (Pandera treino + inferência) | 100% |
| **Regras clínicas** | 4+ (idade, sobrevivência, geo, etc.) | 100% |
| **Detecção de OOD** | 1 (Isolation Forest) | 100% |
| **Auditoria de leakage** | 1 (3 métricas) | 100% |
| **Calibração** | 1 (Platt vs. Isotonic) | 100% |
| **Fairness audit** | 1 (Equalized Odds) | 100% |
| **Drift monitoring** | 3 (KS, PSI, JS) | 100% |
| **Lineage + snapshot** | 1 (SHA-256 + Parquet) | 100% |
| **Criptografia em repouso** | 3 (Fernet + AES-GCM + SHA-256) | 100% |
| **Criptografia em trânsito** | 2 (TLS + CORS) | 100% |
| **PHI scrubber** | 1 (42 casos de teste) | 100% |
| **Auth fail-closed** | 2 (API key + audit key) | 100% |
| **Audit trail** | 1 (Fernet-encrypted, append-only) | 100% |
| **Rate limiting** | 1 (SlowAPI) | 100% |
| **Versioning** | 2 (MLflow + lineage) | 100% |
| **Licença aberta** | 1 (MIT) | 100% |

---

## 🧪 Testes de Aceitação

| Cenário | Validação |
| :--- | :--- |
| **Dataset com coluna faltando** | `pytest tests/test_schema.py` — pandera raise ValueError |
| **Patient < 18 anos** | `pytest tests/test_api.py` — 422 Unprocessable Entity |
| **Stage + Survival inconsistente** | `pytest tests/test_api.py` — Clinical Rules bloqueia |
| **PHI no input** | `pytest tests/phi.test.ts` — scrubber redacta |
| **Credenciais vazadas em commit** | GitHub Secret Scanning — alerta no PR |
| **Acesso anônimo em prod** | Manual: `AETHER_ENV=production` sem `API_KEY` → 503 |
| **Drift detectado** | `pytest tests/test_audit.py` — KS-test p<0.05 → status='alert' |
| **Fairness gap > 15%** | `pytest tests/test_audit.py` — disparidade reportada |

---

## 📈 Monitoramento Contínuo

| Sinal de Alerta | Threshold | Ação |
| :--- | :---: | :--- |
| **Drift global** | > 33% features | Auto-retreino + notificação |
| **Fairness gap** | > 15% | Bloquear release + auditoria |
| **Recall drop** | < 0.90 | Bloquear release + investigação |
| **Audit failures** | > 1% | Alerta SRE + revisão |
| **Latência p99** | > 200ms (predict) | Alerta SRE |

---

## 🔄 Revisão Periódica

- **Trimestral:** revisar effectiveness das mitigações.
- **Pós-incidente:** atualizar após qualquer vazamento/ataque.
- **Pré-release:** validar todas as mitigações antes de cada deploy.
- **Auditoria externa:** anual (BAA/HIPAA, ANVISA/RDC 36/2015).

---

## 📞 Contato de Segurança

- **Tech Lead:** Vitor Diogo Fonseca da Silva — `github.com/vdfs89`
- **Reporte de vulnerabilidades:** abrir issue no GitHub com label `security`.
- **Disclosure policy:** 90 dias responsáveis.

---

> **Confidencialidade:** Este documento contém estratégia defensiva. Acesso restrito.
> **Próxima revisão:** Trimestral ou após incidente.
