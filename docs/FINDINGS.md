# O que encontramos e como tratamos

> Registro honesto do processo de engenharia do Aether Oncology — o que a investigação
> revelou sobre o modelo e o dataset, e que decisões tomamos em resposta. Documento vivo,
> alinhado ao [Model Card](./MODEL_CARD.md), ao [Benchmark](./benchmark.md), à
> [Arquitetura de Deploy](./DEPLOY_ARCHITECTURE.md) e ao [Playbook de Monitoramento](./MONITORING_PLAYBOOK.md).

---

## 1. O achado central: o modelo não prediz

Um benchmark reprodutível ([`src/benchmark.py`](../src/benchmark.py), `StratifiedKFold` k=5
aplicado a **todos** os modelos, inclusive o MLP) comparou o MLP do projeto contra
`DummyClassifier`, Regressão Logística e RandomForest:

- **ROC-AUC ≈ 0,50** para todos os modelos, com e sem features de vazamento — moeda ao ar.
- **PR-AUC ≈ 0,70 = a prevalência** (piso *no-skill*), não desempenho.
- O MLP **não supera** a taxa-base (teste t pareado `p = 0,79`; Wilcoxon `p = 1`).
- Remover o vazamento (`treatment_type`, `survival_rate`) quase não muda as métricas
  (Δ PR-AUC ≈ −0,002): **não há nem sinal para inflar**.

Um diagnóstico por feature ([`scripts/diagnose_features.py`](../scripts/diagnose_features.py))
confirmou a causa-raiz: **todo fator de risco TIER 1** (idade, gênero, país, tabaco, álcool,
nível socioeconômico, HPV) é **estatisticamente independente do alvo** — χ² com `p > 0,05`
em todos e *mutual information* `< 5e-4`, **mesmo com n = 160.292** (poder estatístico enorme).
O alvo do dataset sintético foi gerado de forma aproximadamente independente das features.

**Leitura honesta:** não é "difícil de aprender" — é **ruído**. Métricas próximas de 1,0
relatadas anteriormente só eram atingíveis pela regra degenerada "prever positivo para todos".

## 2. Como tratamos (integridade antes de marketing)

- **Sincronizamos todos os números** (README EN+PT, Model Card curado e auto-gerado,
  páginas `/platform` e `/model-card`, landing) com a realidade do benchmark: ROC-AUC ≈ 0,50,
  Recall@0,5 ≈ 0,45. Nenhuma métrica inflada (0,97/0,99) sobrou em lugar nenhum.
- **Removemos alegações fabricadas** da landing: certificações (ANVISA, SOC 2, ISO 27001),
  "120+ hospitais", "12K+ pacientes", "Series A", SLA/latência sem medição, e **citações
  científicas inventadas** (estudo Nature "0,98 de correlação com 3.200 pacientes", NEJM/PubMed).
- **Enquadramos o resultado como achado de engenharia**, não como fracasso escondido: o
  pipeline rigoroso *provou* que o dataset é ruído — e reportamos isso.

## 3. O que é, de fato, robusto (o entregável real)

A acurácia não é o produto; a **engenharia** é. Em torno de um modelo que não prediz,
construímos e **verificamos contra o código** uma camada de MLOps/infra de nível de produção:

- API FastAPI síncrona com validação Pydantic, *health probes* (`/health/live|ready|inference`),
  rate limiting (SlowAPI), headers de correlação/latência/version-skew
  (`X-Request-ID`, `X-Inference-Time-Ms`, `X-Aether-Release`, `X-Skew-Warning`).
- Trilha de auditoria **cifrada (Fernet, AES-128-CBC + HMAC) e encadeada por hash**
  (chain-of-custody), com política **fail-closed** (sem auditoria → HTTP 500).
- Pipeline reprodutível (seeds fixas), contratos Pandera, calibração, auditoria de fairness,
  detector OOD (Isolation Forest), lineage SHA-256, e CI (lint + testes + Docker + scan).

## 4. Nota de método: verificar, não assumir

A documentação de deploy/monitoramento foi auditada **afirmação por afirmação** contra o
código. Um "canário" deliberado falhou de forma instrutiva: presumimos que o header de
latência *não* existia (uma auditoria anterior o listara como pendente) — mas o grep mostrou
`X-Inference-Time-Ms` vivo em [`src/main.py:557`](../src/main.py#L557), adicionado depois.
Da mesma forma, ao reescrever o rótulo "HIPAA-like" do log de auditoria, confirmamos o
hash-chain em [`src/services/audit.py`](../src/services/audit.py) **antes** de descrevê-lo —
para não trocar uma alegação sem lastro por outra. Toda capacidade documentada existe no código.

---

*Aether Oncology — protótipo acadêmico (FIAP Tech Challenge). A engenharia é o entregável;
o dataset sintético não sustenta nenhuma alegação preditiva ou clínica.*
