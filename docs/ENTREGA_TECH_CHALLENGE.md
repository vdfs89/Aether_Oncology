# Aether Oncology — Documento de Entrega (Tech Challenge)

> **Clinical AI Operating System** para triagem de risco de câncer oral — IA
> preditiva calibrada, auditável e governada por um pipeline completo de MLOps,
> segurança clínica e conformidade HIPAA/LGPD.

| | |
| :--- | :--- |
| **Projeto** | Aether Oncology |
| **Versão** | 3.1.0 |
| **Repositório** | https://github.com/vdfs89/Aether_Oncology |
| **Aplicação (Frontend)** | https://aetheroncology.vercel.app |
| **Deploy (API)** | https://api.vitorsilva.engineer |
| **Grupo / RMs** | Vitor Diogo Fonseca da Silva — RM375157 |
| **Data de entrega** | 30/06/2026 |

> ### Nota de Segurança (Tech Challenge)
> `/predict` está **aberto** (sem API Key) para facilitar a avaliação — a
> inferência é **rate-limited** e **auditada** (audit trail fail-closed). As
> rotas de **governança** (`/audit`, `/compliance`, `/monitor`, `/feedback`)
> permanecem **protegidas por API Key** (`get_api_key`, já fail-closed). Em
> produção, todas as rotas seriam protegidas e, futuramente, por **OAuth2/OIDC**
> por usuário individual.

---

## 1. Sumário Executivo

A Aether Oncology é um **protótipo acadêmico** de **Apoio à Decisão Clínica (CDSS)**
que classifica perfis de risco em **Estágio Inicial vs. Avançado** de câncer oral.
O *design* prioriza **Recall** (em oncologia o falso negativo é o erro caro), mas o
benchmark reprodutível (`docs/benchmark.md`, CV 5-fold) mostra que o modelo **não
supera a taxa-base** (ROC-AUC ≈ 0,50): o dataset sintético não tem sinal aprendível.
O valor da entrega está na **engenharia**, não no desempenho preditivo.

O diferencial não é apenas o modelo, mas a **engenharia ao redor dele**: um
sistema operacional clínico com governança de dados, segurança clínica
(human-in-the-loop), trilha de auditoria *tamper-evident* e conformidade
regulatória de ponta a ponta.

**Não é diagnóstico** — é apoio à decisão com supervisão médica obrigatória.

---

## 2. Problema & Objetivo

- **Problema:** o câncer oral tem alta letalidade quando detectado tarde; a
  triagem de risco em larga escala é cara e heterogênea entre países.
- **Objetivo:** prever risco a partir de fatores demográficos/clínicos
  (tabaco, álcool, HPV, idade, status socioeconômico) com **alta sensibilidade**
  e **probabilidades calibradas**, sob governança auditável.
- **Fora de escopo:** diagnóstico autônomo, substituição de biópsia/histologia,
  prescrição terapêutica.

---

## 3. Modelo de Machine Learning

| Item | Valor |
| :--- | :--- |
| Tarefa | Classificação binária — Early vs. Moderate/Late |
| Arquitetura | MLP (PyTorch), `hidden_dims=[128, 64, 32]` |
| Dataset | *Oral Cancer Top 30 Countries* (licença MIT) |
| Registros | 24.044 (multinacional, balanceado por subgrupo) |
| Países | 30 (maior incidência global) |
| **Recall @0.5 (CV 5-fold)** | **≈ 0.45** — abaixo da taxa-base; meta de ~95% **não atingida** (ver `benchmark.md`) |
| **ROC-AUC (CV 5-fold)** | **≈ 0.50** — sem poder discriminativo (dataset sintético sem sinal) |
| Calibração | Isotônica (Brier 0.210); métricas ECE ≈ 0 vêm de avaliação degenerada — não confiáveis |
| Fairness | Infraestrutura Equalized Odds funcional; números versionados (disparidade 0,00%) são **provisórios** (avaliação degenerada) |
| Classe regulatória | FDA SaMD Class II (decision support) |

Detalhe completo: [docs/MODEL_CARD.md](MODEL_CARD.md) e o card auto-gerado em
`models/model_card.md`.

---

## 4. Pipeline de MLOps

Pipeline reprodutível, versionado e auditável:

1. **Ingestão** — validação de schema com **Pandera** + snapshot versionado
   (SHA-256 de lineage).
2. **Pré-processamento** — `ColumnTransformer` (scaling + OHE) via joblib.
3. **Treino** — MLP com busca de hiperparâmetros via **Optuna**.
4. **Calibração** — isotônica (ECE ≈ 0).
5. **Fairness & Drift** — Equalized Odds por subgrupo; **KS-test + PSI** para
   drift de dados.
6. **Registro** — versão + lineage rastreados no **MLflow**; *model card*
   gerado automaticamente a cada treino.

---

## 5. Segurança Clínica (Human-in-the-Loop)

Toda resposta do copiloto clínico passa por uma cadeia de segurança:

- **HallucinationGuard** → checagem de claims.
- **ConsensusEngine** → 4 portões (confiança ≥ 0.50, contradições ≤ 1,
  evidência/citações) — todos devem passar.
- **EscalationPolicy** → `NONE` (aprovado) · `WARNING` (revisão médica) ·
  `HARD_STOP` (bloqueado).
- **ClinicalJudge** — *fail-SAFE*: sem chave do juiz, a resposta é entregue como
  **NÃO VERIFICADA** com revisão médica obrigatória (nunca *fail-open*).
- **Aprovação/Override médico** — ferramentas de alto risco param em
  `WAITING_APPROVAL`; o médico aprova/rejeita/modifica (override engine com
  `computeRiskDiff`).

---

## 6. Conformidade HIPAA / LGPD — Trilha de Auditoria

O coração da governança. Trilha de auditoria **cifrada, append-only e
*tamper-evident***, com retenção automatizada.

| Capacidade | Implementação |
| :--- | :--- |
| **Cifragem em repouso** | Fernet (AES-128-CBC/HMAC) por entrada; IndexedDB do FE com AES-GCM-256 (PBKDF2) |
| **PHI Scrubber (LGPD)** | Detecção/máscara de e-mail, telefone, SSN, CPF, CNS/SUS, CRM, CEP, DOB (regex configurável) |
| **Assinatura / imutabilidade** | **Hash-chain**: `entry_hash = SHA256(prev_hash ‖ seq ‖ payload)` — edição, reordenação ou deleção quebra a verificação |
| **Rotação / archival** | Rotação com *chain-of-custody* (segment header assina o head anterior), gzip, hook de cold storage |
| **Backend** | **MongoDB Atlas** primário + **fallback JSONL** (nunca perde auditoria); `seq` global e monotônico atravessa os dois stores |
| **Retenção** | Cron in-process (asyncio): arquiva docs > 90 dias para coleção fria (`audit_trail_archive`) e expira da ativa — **head nunca arquivado** (âncora preservada) |
| **Relatórios automáticos** | Agregações (evento/ação/status/PHI/atores) + **veredito de integridade**; JSON + Markdown; endpoint `GET /compliance/report` e CLI |
| **Alerting tempo-real** | **Slack** (fire-and-forget): cadeia quebrada, juiz fail-open, anomalia de volume, erros de decrypt recorrentes |
| **Anonimização** | `user_id` hasheado (SHA-256); correlação por `X-Request-ID` |

Verificação independente (sem decifrar PHI):
```bash
python -m src.scripts.verify_audit_chain --trail logs   # cadeia de custódia completa
python -m src.scripts.compliance_report --days 30        # relatório de compliance
```

Documentação: [docs/AUDIT_PHI_IMPLEMENTATION.md](AUDIT_PHI_IMPLEMENTATION.md).

---

## 7. Frontend — Runtime Multi-Agente

Next.js 16 / React 19 / Tailwind v4. Pipeline de planejamento **determinístico
(sem LLM)** seguido de execução *approval-gated*:

- **Clinical Planner** (intent → tools → DAG).
- **Runtime State Machine** (10 estados) + **Clinical Event Bus** (event-sourced,
  replay/auditoria).
- **PHI Scrubber** (fail-closed) antes de qualquer envio.
- **IndexedDB cifrado** (AES-GCM-256) para sessões.
- **Streaming SSE** com 13 eventos Zod-validados (routing, judgement, tokens…).
- **Dashboard "Precision for Life"** em `/dashboard` (métricas reais do modelo).

---

## 8. Stack Tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Backend** | Python 3.12, FastAPI, PyTorch, scikit-learn, Pandera, Optuna, MLflow, PyMongo |
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind v4 |
| **Dados/Infra** | MongoDB Atlas, Fernet, Web Crypto |
| **LLM** | Groq (LLaMA 3.3 70B), Gemini 2.0 Flash, OpenAI (juiz) — router + circuit breaker |
| **DevOps** | GitHub Actions (lint Ruff + testes), Render (deploy), Docker |
| **Alerting** | Slack Webhook |

---

## 9. Como Rodar

**Backend**
```bash
pip install -e .
export AUDIT_ENCRYPTION_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
# opcionais: MONGODB_URI (senão usa JSONL), SLACK_WEBHOOK_URL, chaves de LLM
uvicorn src.main:app --reload
```

**Frontend**
```bash
cd frontend && npm install && npm run dev   # http://localhost:3000  (dashboard em /dashboard)
```

**Testes**
```bash
python -m pytest -q          # backend
cd frontend && npx tsc --noEmit
```

---

## 10. Qualidade & CI/CD

- **Testes:** 157 passed / 2 xfailed (backend); `tsc` limpo (frontend).
- **Lint/format:** Ruff (`check` + `format --check`) — gate no CI.
- **CI:** GitHub Actions — *Unified MLOps Pipeline* (lint + test → build → train →
  canary → promote).
- **Deploy:** Render (auto-deploy no push à `main`), healthcheck `/health`,
  boot resiliente (degrada em vez de crashar em PaaS).

---

## 11. Resultados

- Modelo calibrado e *fairness-audited*, otimizado para recall clínico.
- Governança de auditoria de nível regulatório: **tamper-evident**, cifrada,
  com retenção e alerting automatizados — verificável sem expor PHI.
- Segurança clínica *fail-safe* com human-in-the-loop.
- Plataforma completa do dado ao deploy, com CI verde e cobertura de testes.

---

## 12. Roadmap & Limitações

**Entregue (compliance):** assinatura/imutabilidade · rotação/archival · backend
MongoDB · relatórios automáticos · cron de archival · alerting Slack.

**Próximos passos (opcionais):**
- [ ] Separação multi-tenant da trilha de auditoria (chave por tenant).
- [ ] Integração com SIEM (Splunk, ELK).
- [ ] Decrypt multi-chave (suporte a rotação de `AUDIT_ENCRYPTION_KEY`).

**Limitações conhecidas:** modelo é apoio à decisão (não diagnóstico); validado
para os 30 países de maior incidência; não validado em população pediátrica /
imunocomprometida.

---

## 13. Links

- **Repositório:** https://github.com/vdfs89/Aether_Oncology
- **README (EN):** [README.md](../README.md) · **PT:** [README.pt-br.md](../README.pt-br.md)
- **Model Card:** [docs/MODEL_CARD.md](MODEL_CARD.md)
- **Auditoria/HIPAA:** [docs/AUDIT_PHI_IMPLEMENTATION.md](AUDIT_PHI_IMPLEMENTATION.md)
- **Aplicação (Frontend):** https://aetheroncology.vercel.app
- **API (Backend):** https://api.vitorsilva.engineer
- **Vídeo demo:** A ser adicionado até 30/06/2026

---

> _Aether Oncology — Precision for Life. Ciência, tecnologia e design unidos pela vida._
