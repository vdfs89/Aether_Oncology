---
language:
- pt
- en
license: mit
tags:
- tabular-classification
- pytorch
- scikit-learn
- medical
- oncology
- health
datasets:
- custom/oral-cancer-top-30-countries
pipeline_tag: tabular-classification
model-index:
- name: Classificador de Tumor Aether Oncology v3.0
  results:
  - task:
      type: tabular-classification
      name: Classificação Tabular
    dataset:
      name: Oral Cancer Top 30 Countries
      type: custom/oral-cancer-top-30-countries
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

<p align="center">
  🌐 <a href="./README.md">English</a> | <strong>Português</strong>
</p>

<p align="center">
  <img src="https://github.com/vdfs89/Aether_Oncology/raw/main/src/static/aether-oncology-portal/images/Banner.png" alt="Aether Oncology — Precision for Life" style="max-width:100%; height:auto;" />
</p>

<h1 align="center">🪷 Aether Oncology</h1>

<h3 align="center"><em>Um Sistema Operacional de IA Clínica para Inteligência Oncológica Auditável</em></h3>

<p align="center">
  <strong>Orquestração multi-agente · Governança criptográfica · Médico no loop · Inferência resistente a alucinações</strong>
</p>

<br/>

<!-- ── Stack ── -->
<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-0.11x-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PyTorch-MLP-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" alt="PyTorch" />
</p>

<!-- ── Provedores de IA ── -->
<p align="center">
  <img src="https://img.shields.io/badge/Groq-LLaMA_3.3_70B-F55036?style=flat-square&logo=groq&logoColor=white" alt="Groq" />
  <img src="https://img.shields.io/badge/Gemini-2.0_Flash-8E75B2?style=flat-square&logo=googlegemini&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/OpenAI-Juiz_(gpt--4o--mini)-412991?style=flat-square&logo=openai&logoColor=white" alt="OpenAI Judge" />
</p>

<!-- ── Governança ── -->
<p align="center">
  <img src="https://img.shields.io/badge/Compliance-HIPAA-0D47A1?style=flat-square" alt="HIPAA" />
  <img src="https://img.shields.io/badge/Compliance-LGPD-0D47A1?style=flat-square" alt="LGPD" />
  <img src="https://img.shields.io/badge/FDA_SaMD-Readiness-1565C0?style=flat-square" alt="FDA SaMD" />
  <img src="https://img.shields.io/badge/EU_AI_Act-Alto_Risco_(Anexo_III)-FF6F00?style=flat-square" alt="AI Act" />
  <img src="https://img.shields.io/badge/AI_Safety-Juiz_+_Consenso-7C4DFF?style=flat-square" alt="AI Safety" />
</p>

<!-- ── Qualidade ── -->
<p align="center">
  <img src="https://img.shields.io/badge/Recall-97.2%25-00C853?style=flat-square&logo=target&logoColor=white" alt="Recall" />
  <img src="https://img.shields.io/badge/F1--Score-96.5%25-2196F3?style=flat-square" alt="F1" />
  <img src="https://img.shields.io/badge/ROC--AUC-99.1%25-7C4DFF?style=flat-square" alt="AUC" />
  <img src="https://img.shields.io/badge/Cobertura-~91%25-green?style=flat-square" alt="Coverage" />
  <img src="https://img.shields.io/badge/Licença-MIT-yellow?style=flat-square" alt="License" />
</p>

<p align="center">
  <a href="https://api.vitorsilva.engineer/"><img src="https://img.shields.io/badge/🔬_Portal_Clínico-Demo_ao_Vivo-0052FF?style=flat-square" alt="Live Demo" /></a>
  <a href="https://api.vitorsilva.engineer/docs"><img src="https://img.shields.io/badge/📋_Docs_da_API-OpenAPI-05998B?style=flat-square&logo=fastapi&logoColor=white" alt="API Docs" /></a>
</p>

<br/>

| ![Diagnóstico Benigno](https://github.com/vdfs89/Aether_Oncology/raw/main/docs/screenshots/aether_oncology_portal_benigno.png) | ![Diagnóstico Maligno](https://github.com/vdfs89/Aether_Oncology/raw/main/docs/screenshots/aether_oncology_portal_maligno.png) | ![Gráfico Radar XAI](https://github.com/vdfs89/Aether_Oncology/raw/main/docs/screenshots/clinical_portal_xai_radar.png) |
| :---: | :---: | :---: |
| *Baixo Risco — 98,00% de Confiança* | *Alto Risco — 92,76% de Confiança* | *Explicabilidade (XAI) via Gráfico Radar* |

---

> [!IMPORTANT]
> **Aether Oncology é uma plataforma de *apoio à decisão clínica* e *pesquisa* — não é um dispositivo de diagnóstico.**
> O modelo quantifica o risco; o **médico decide**. Veja o [Aviso Clínico](#-aviso-clínico).

---

## 📑 Sumário

1. [Visão Geral](#-visão-geral)
2. [Matriz de Maturidade](#-matriz-de-maturidade)
3. [Principais Funcionalidades](#-principais-funcionalidades)
4. [Arquitetura do Sistema](#-arquitetura-do-sistema)
5. [Motor de Execução Multi-Agente](#-motor-de-execução-multi-agente)
6. [Motor de Segurança Clínica](#-motor-de-segurança-clínica)
7. [Governança Médica](#-governança-médica)
8. [Compliance: HIPAA · LGPD · FDA SaMD](#-compliance-hipaa--lgpd--fda-samd)
9. [Plataforma de Machine Learning](#-plataforma-de-machine-learning)
10. [Governança de Dados](#-governança-de-dados)
11. [Protocolo de Streaming SSE](#-protocolo-de-streaming-sse)
12. [Referência da API](#-referência-da-api)
13. [Estrutura do Projeto](#-estrutura-do-projeto)
14. [Instalação](#-instalação)
15. [Variáveis de Ambiente](#-variáveis-de-ambiente)
16. [Executando o Sistema](#-executando-o-sistema)
17. [Testes](#-testes)
18. [Modelo de Segurança](#-modelo-de-segurança)
19. [Aviso Clínico](#-aviso-clínico)
20. [Roadmap](#-roadmap)
21. [Contribuindo](#-contribuindo)
22. [Licença](#-licença)

---

## 🌌 Visão Geral

Em 2017, o **IBM Watson for Oncology** foi retirado de hospitais após produzir recomendações que oncologistas consideraram inseguras. O diagnóstico do fracasso foi inequívoco: uma caixa-preta sem explicabilidade, dados de treino opacos e **zero supervisão humana no loop de decisão**.

**Aether Oncology é a resposta arquitetural a esse fracasso.**

Não é "mais um chatbot médico". É um **Sistema Operacional de IA Clínica** construído sobre três princípios inegociáveis:

- **🩺 Médico no loop, por design.** A IA propõe; um clínico aprova, modifica ou faz override — e cada decisão é registrada.
- **🔍 Auditável, não opaco.** Cada inferência emite eventos estruturados e rastreáveis (correlação por `X-Request-ID`), e cada predição é gravada em uma **trilha de auditoria imutável e criptografada**.
- **🛡️ Segurança como camada de primeira classe.** Um `ClinicalJudge` dedicado (guarda de alucinação → motor de consenso → política de escalonamento) fica entre o modelo e o usuário, com semântica explícita de `HARD_STOP`.

A plataforma abrange duas superfícies complementares:

| Superfície | O que é | Maturidade em produção |
| :--- | :--- | :---: |
| **Núcleo Diagnóstico de ML** (`/predict`) | Uma MLP em PyTorch de nível hospitalar para **estratificação de risco de câncer oral**, governada por um pipeline completo de MLOps (contratos Pandera, calibração, fairness, auditorias de vazamento e drift, lineage, model cards). | ✅ **Produção** |
| **Copiloto Clínico de IA** (`/api/v1/clinical/chat`) | Um **runtime de raciocínio clínico multi-agente com streaming SSE** — planner → DAG de execução → roteador de provedores → juiz de segurança → aprovação/override médico → auditoria event-sourced. | 🧪 **Experimental** |

> Aether foi **projetado para Recall acima de tudo.** Em oncologia, um falso negativo não é um erro estatístico — é uma janela de intervenção precoce perdida. O modelo é ajustado para maximizar a sensibilidade (≈97% de recall) e aceita conscientemente mais falsos positivos como um trade-off clinicamente justificado.

---

## 🧭 Matriz de Maturidade

> [!NOTE]
> Aether é uma plataforma ambiciosa em desenvolvimento ativo. Para manter a honestidade, cada capacidade abaixo é rotulada por **maturidade**, derivada diretamente do código-fonte — não de marketing.
>
> **✅ Atual** = ligado e exercitado · **🧪 Experimental** = implementado mas não totalmente integrado/validado · **🟡 Mock** = stub para demo/dev · **🗓️ Planejado** = no roadmap.

| Capacidade | Maturidade | Evidência |
| :--- | :---: | :--- |
| Classificação de risco de câncer oral (MLP + confidence tiering) | ✅ Atual | `src/main.py` · `src/services/predictor.py` |
| Trilha de auditoria imutável e criptografada (Fernet) | ✅ Atual | `src/services/audit.py` |
| Governança MLOps: schemas Pandera, calibração, auditorias de leakage/fairness, OOD, lineage, model cards | ✅ Atual | `src/train.py` · `src/ml/pipelines/**` |
| Detecção de drift de dados (Teste KS) | ✅ Atual | `src/ml_platform/drift.py` · `src/services/audit.py` |
| Roteador multi-provedor de LLM (Groq → Gemini) + circuit breaker | ✅ Atual | `src/providers/router.py` · `circuit_breaker.py` |
| Runtime de streaming SSE para chat clínico | ✅ Atual (transporte) | `src/orchestration/clinical_runtime.py` · `src/streaming/protocol.py` |
| Runtime multi-agente no frontend (planner, máquina de estados, override engine, event bus) | ✅ Atual | `frontend/src/features/ai/orchestration/**` |
| IndexedDB criptografado (AES-GCM-256 / PBKDF2) + scrubber de PHI (LGPD) | ✅ Atual | `frontend/.../persistence/crypto.ts` · `telemetry/scrubbers/phi.ts` |
| Juiz de Segurança Clínica (alucinação → consenso → escalonamento) | 🧪 Experimental | `src/safety/**` — roda no `/chat`, **não** no `/predict` |
| Workflow de aprovação + override + risk-diff médico | 🧪 Experimental | `frontend/.../runtime/approvalManager.ts` · `overrideEngine.ts` |
| Ferramentas clínicas (biomarker / therapy-match / guidelines-RAG) | 🟡 Mock | `frontend/src/features/ai/tools/registry.ts` (dados fixos) |
| Provedor de LLM no frontend (`NEXT_PUBLIC_LLM_PROVIDER`) | 🟡 Mock (padrão) | `frontend/src/features/ai/api/factory.ts` — padrão `mock` |
| OpenAI como provedor de **inferência** | 🟡 Apenas juiz | usado só dentro do juiz de segurança, não para inferência de chat |
| Integração genômica (KRAS/EGFR), simulação de Tumor Board, FHIR/PACS | 🗓️ Planejado | veja o [Roadmap](#-roadmap) |

---

## ✨ Principais Funcionalidades

### 🧠 Runtime Clínico
- **Planner clínico determinístico** — detecção de intenção sem LLM (palavras-chave ponderadas + 47 símbolos de genes oncológicos), seleção de ferramentas a partir de um registro de capacidades e construção de um **DAG de execução** topológico.
- **Máquina de estados rígida** — 10 estados com transições validadas (`IDLE → HYDRATING → PLANNING → RETRIEVING → EXECUTING → STREAMING → WAITING_APPROVAL → COMPLETED | FAILED | INTERRUPTED`).
- **Motor de execução de ferramentas** — estágios sequenciais com paralelismo intra-estágio, timeouts por ferramenta, retries com backoff exponencial e cancelamento via `AbortSignal`.

### 🛡️ Segurança & Governança
- **Pipeline do ClinicalJudge** — `HallucinationGuard` → `ConsensusEngine` → `EscalationPolicy`, emitindo um `ClinicalJudgement` estruturado (risco de alucinação, força da evidência, contradições, citações ausentes).
- **Escalonamento em três níveis** — `NONE` / `WARNING` / `HARD_STOP` (um `HARD_STOP` bloqueia a resposta e interrompe o stream).
- **Safety loop por confidence tiering** no `/predict` — `Alto ≥ 0,30`, `Médio ≥ 0,15`, `Baixo < 0,15` de margem do threshold 0,5; `Baixo` levanta um `warning` de revisão obrigatória.

### 🔬 Plataforma de ML
- **Contratos de dados Pandera** para treino **e** inferência (schemas distintos).
- **Calibração de probabilidade** — Platt vs. Isotônica auto-selecionada por Brier score, com ECE/MCE e curvas de confiabilidade.
- **Auditorias de vazamento, fairness, OOD e drift** integradas ao pipeline de treino.
- **Lineage SHA-256** + **model cards** estilo FDA + tracking via **MLflow**.

### 🔐 Segurança & Compliance
- **Logs de auditoria criptografados com Fernet**, com envelopes criptográficos versionados.
- **Criptografia AES-GCM-256 client-side** dos dados de conversa no IndexedDB (PBKDF2-SHA256, 100k iterações).
- **Scrubber de PHI (LGPD)** com regexes de formatos brasileiros (CPF, CNS/SUS, CRM, CEP, telefone BR) — suíte de 42 casos de teste.

### 📡 Arquitetura de Streaming
- **Server-Sent Events (SSE)** com um **protocolo de 13 eventos validado por Zod**, fortemente tipado e com forward-compatibility.

### 📜 Replay & Auditabilidade
- **Event bus clínico event-sourced** — todas as transições de estado, aprovações, overrides e mudanças de risco são emitidas com `BaseEventMetadata` (`traceId`, `sessionId`, `patientId`, `sequence`) para replay e auditoria.

### 👨‍⚕️ Fluxo do Médico
- **Modal de aprovação**, **editor de override do DAG**, **risk-diff antes/depois** e **governança de timeout** (15 min padrão, 5 min para `CRITICAL`).

---

## 🏗️ Arquitetura do Sistema

### Arquitetura de Alto Nível

```mermaid
flowchart TB
    subgraph FE["Frontend - Next.js 15 / TypeScript"]
        UI["UI do Copiloto Clínico"]
        PLAN["Planner Clínico<br/>intencao to ferramentas to DAG"]
        SM["Máquina de Estados<br/>10 estados"]
        BUS["Event Bus Clínico<br/>event-sourced"]
        APPR["Motor de Aprovação / Override"]
        IDB[("IndexedDB Criptografado<br/>AES-GCM-256")]
        PHI["Scrubber de PHI LGPD"]
    end

    subgraph GW["Transporte"]
        SSE["Gateway SSE<br/>validado por Zod - 13 eventos"]
    end

    subgraph BE["Backend - FastAPI / Python 3.12"]
        RT["ClinicalInferenceRuntime"]
        ROUTER["Roteador de Modelos Clínicos<br/>+ Circuit Breaker"]
        JUDGE["Juiz de Segurança Clínica"]
        PRED["PredictorService<br/>predict - MLP"]
        AUDIT[("Trilha de Auditoria Criptografada<br/>Fernet - JSONL")]
        RAG["Pesquisa / RAG<br/>PubMed - Cochrane - S2"]
    end

    subgraph PROV["Provedores de LLM"]
        GROQ["Groq - LLaMA 3.3 70B<br/>~200ms"]
        GEM["Gemini 2.0 Flash<br/>raciocinio - multimodal"]
        OAI["OpenAI - gpt-4o-mini<br/>apenas juiz"]
    end

    UI --> PLAN --> SM --> APPR
    PHI -.scrub.-> SSE
    APPR --> SSE
    SM --> BUS
    BUS --> IDB
    SSE <-->|text/event-stream| RT
    RT --> ROUTER
    ROUTER --> GROQ
    ROUTER -.fallback.-> GEM
    RT --> JUDGE
    JUDGE --> OAI
    RT --> AUDIT
    RT --> RAG
    UI --> PRED
    PRED --> AUDIT
```

### Chat Clínico — Sequência do Runtime (SSE)

```mermaid
sequenceDiagram
    autonumber
    participant C as Cliente useStreaming
    participant G as Gateway SSE
    participant R as ClinicalInferenceRuntime
    participant RT as Roteador CircuitBreaker
    participant P as Provedor Groq/Gemini
    participant J as ClinicalJudge

    C->>G: POST /api/v1/clinical/chat
    G->>R: stream_clinical_response()
    R-->>C: event routing_decision provedor justificativa custo
    R->>RT: route ClinicalTaskProfile
    RT->>P: stream_inference()
    R-->>C: event status generating_internally
    P-->>R: tokens em buffer
    R-->>C: event inference_envelope latencia tokens custo
    R->>J: evaluate prompt resposta
    R-->>C: event judgement_started
    J-->>R: ClinicalJudgement risco escalation_level
    alt escalation_level == HARD_STOP
        R-->>C: event error resposta bloqueada
    else NONE or WARNING
        R-->>C: event judgement_completed
        R-->>C: event token em chunks
        R-->>C: event complete
    end
```

### Pipeline de Segurança Clínica

```mermaid
flowchart LR
    IN["prompt_usuario + resposta_ia"] --> HG["HallucinationGuard<br/>check_claims()"]
    HG --> CE["ConsensusEngine<br/>4 portoes - TODOS devem passar"]
    CE -->|"confianca >= 0.50"| EP["EscalationPolicy"]
    CE -->|"contradicoes <= 1"| EP
    CE -->|"evidencia / citacoes"| EP
    EP -->|"alucinacao ALTA - evidencia BAIXA - contradicao"| HS["HARD_STOP<br/>approved=false<br/>requires_physician_review"]
    EP -->|"alucinacao MEDIA - citacao ausente"| W["WARNING<br/>revisao medica"]
    EP -->|limpo| OK["NONE - aprovado"]
```

### Fluxo de Aprovação & Override Médico

```mermaid
stateDiagram-v2
    [*] --> EXECUTING
    EXECUTING --> WAITING_APPROVAL: requiresApproval ferramenta HIGH ou CRITICAL
    WAITING_APPROVAL --> APPROVED: medico aprova
    WAITING_APPROVAL --> REJECTED: medico rejeita
    WAITING_APPROVAL --> MODIFIED: override remover forcar reordenar ferramentas
    WAITING_APPROVAL --> ESCALATED: timeout 15m ou 5m CRITICAL
    MODIFIED --> RiskDiff: computeRiskDiff antes depois
    RiskDiff --> STREAMING: retoma com ResolvedExecutionPlan
    APPROVED --> STREAMING
    REJECTED --> FAILED
    STREAMING --> COMPLETED
    COMPLETED --> [*]
```

---

## 🧩 Motor de Execução Multi-Agente

O runtime do frontend (`frontend/src/features/ai/orchestration/`) é um **pipeline de planejamento determinístico e sem LLM** seguido de um **motor de execução com portão de aprovação**.

| Camada | Módulo | Responsabilidade |
| :--- | :--- | :--- |
| **1 · Detecção de Intenção** | `planner/intentDetector.ts` | Match ponderado de palavras-chave + regex + símbolos de genes → `ClinicalIntent` (sem chamada de LLM). |
| **2 · Seleção de Ferramentas** | `planner/toolCapabilities.ts` | Registro de metadados (nível de risco, exigência de aprovação, dependências, latência, custo). |
| **3 · Grafo de Execução** | `planner/planner.ts` | Ordenação topológica das dependências → DAG `ExecutionPlan` (à prova de ciclos). |
| **4 · Escalonamento de Risco** | `planner/planner.ts` | `getMaxRisk()` sobre as ferramentas selecionadas → flag `requiresApproval`. |
| **Runtime** | `runtime/stateMachine.ts` | Máquina de 10 estados com transições validadas. |
| **Motor de Ferramentas** | `tools/runtime.ts` | Execução paralela dentro do estágio, timeouts, retries, abort. |

**Enumerações (fonte da verdade):**

```ts
ClinicalIntent  = biomarker_analysis | therapy_matching | prognosis | trial_search
                | evidence_review | imaging_analysis | risk_assessment | general_inquiry | unknown
ClinicalRiskLevel = LOW | MODERATE | HIGH | CRITICAL
ClinicalRuntimeState = IDLE | HYDRATING | PLANNING | RETRIEVING | EXECUTING
                     | STREAMING | WAITING_APPROVAL | INTERRUPTED | FAILED | COMPLETED
```

**Roteamento no backend** (`src/providers/router.py`): um `ClinicalModelRouter` seleciona um provedor a partir de um `ClinicalTaskProfile` (intenção, nível de risco, necessidades de latência/raciocínio/multimodal). Cadeia padrão: **Groq (≈200 ms)** primário → **Gemini 2.0 Flash** fallback, cada um envolvido pelo `clinical_circuit_breaker` (abre após **3** falhas, recuperação em **60 s**, depois sondagem `HALF-OPEN`).

> 🟡 **Nota honesta:** as três ferramentas registradas (`biomarker-analysis`, `therapy-matching`, `clinical-guidelines-rag`) atualmente retornam **dados clínicos mock**. A orquestração, o DAG e a governança ao redor delas são reais; os *backends* das ferramentas são trabalho da Fase 3.

---

## 🛡️ Motor de Segurança Clínica

A camada de segurança (`src/safety/`) envolve cada resposta de **chat clínico**. É a herdeira conceitual da lição do Watson: *nenhuma saída do modelo chega a um clínico sem um veredito.*

```
ClinicalJudge.evaluate(prompt, resposta)
        │
        ├── HallucinationGuard.check_claims()   → delega ao JudgeProvider (OpenAI gpt-4o-mini)
        ├── ConsensusEngine.evaluate_consensus()  → 4 portões, TODOS devem passar
        └── EscalationPolicy.evaluate()           → NONE | WARNING | HARD_STOP
```

**`ClinicalJudgement`** (`src/safety/types.py`):

| Campo | Tipo | Significado |
| :--- | :--- | :--- |
| `approved` | `bool` | Se a resposta pode ser entregue |
| `confidence` | `float [0–1]` | Confiança do juiz |
| `hallucination_risk` | `LOW · MEDIUM · HIGH` | Probabilidade de afirmações fabricadas |
| `evidence_strength` | `LOW · MODERATE · HIGH` | Qualidade da evidência citada |
| `contradictions` | `List[str]` | Contradições clínicas detectadas |
| `missing_citations` | `List[str]` | Afirmações sem citação |
| `requires_physician_review` | `bool` | Flag de escalonamento obrigatório |
| `escalation_level` | `NONE · WARNING · HARD_STOP` | Decisão final do portão |

**Portões de consenso** (`consensus_engine.py`): piso de confiança **0,50**, máximo de **1** contradição, escrutínio de citação quando a evidência é `LOW`.

**Regras de escalonamento** (`escalation_policy.py`):
- **`HARD_STOP`** → alucinação `HIGH` **OU** evidência `LOW` **OU** qualquer contradição → resposta **bloqueada**, `approved=false`.
- **`WARNING`** → alucinação `MEDIUM` **OU** citações ausentes → resposta entregue, mas sinalizada para revisão.

> 🧪 **Experimental & escopo:** o juiz roda no `POST /api/v1/clinical/chat`. O endpoint diagnóstico `/predict` usa o **safety loop de confidence tiering** mais simples e totalmente em produção (não o juiz LLM). A guarda de alucinação atualmente delega ao juiz OpenAI; o cruzamento especializado de PMID/diretrizes está planejado.

---

## 👨‍⚕️ Governança Médica

A governança é event-sourced de ponta a ponta (`frontend/src/features/ai/orchestration/runtime/`).

- **`WAITING_APPROVAL`** — quando o plano contém uma ferramenta com `requiresApproval`, a execução é suspensa e um evento `ClinicalApprovalRequested` é emitido.
- **`ClinicalApprovalManager`** — cria um `PendingApproval` (nanoid), persiste no backend store de aprovação e agenda um timeout: **`DEFAULT_TIMEOUT_MS = 15 min`**, **`CRITICAL_TIMEOUT_MS = 5 min`**, com um threshold de aviso de **80%**.
- **Motor de Override** (`overrideEngine.ts`) — uma transformação *funcional pura*: o médico pode **remover**, **forçar** ou **reordenar** ferramentas. O plano original **nunca é mutado**; um novo `ResolvedExecutionPlan` é retornado com trilha de auditoria completa.
- **`RiskDiffViewer`** — renderiza o `RiskProfile` antes/depois (`hallucinationRisk`, `evidenceStrength 0–100`, `consensusScore VERIFIED/PARTIAL/FAILED`, `fdaCompliance PASS/WARNING/FAIL`).
- **Auditoria imutável** — cada decisão emite `ClinicalApprovalResolved` (`APPROVED · REJECTED · ESCALATED · MODIFIED`), `ExecutionPlanOverridden` e `RiskProfileChanged` ao event bus, persistidos no IndexedDB criptografado.

> 🧪 A identidade do médico (`physicianSession.ts`) atualmente usa um perfil demo/fallback; produção exige integração com SSO/SAML hospitalar. A auto-rejeição por timeout de aprovação está parcialmente ligada.

---

## 🔐 Compliance: HIPAA · LGPD · FDA SaMD

> [!WARNING]
> Estes itens descrevem **controles de engenharia e prontidão**, não certificações. Aether está *alinhado e pronto* para HIPAA/LGPD/FDA-SaMD; nenhum Business Associate Agreement formal ou aprovação regulatória foi obtido.

### HIPAA (confidencialidade de PHI)
- **Logs de auditoria criptografados** — `src/services/audit.py` envolve cada predição em um envelope JSON criptografado com Fernet (`key_version`, `algorithm`, `encrypted`, `payload`).
- **Auth fail-closed** — em produção (`AETHER_ENV != dev`), endpoints protegidos retornam **503** quando `API_KEY` não está definida (sem acesso aberto) e a app nunca injeta chaves padrão/efêmeras. `AUDIT_ENCRYPTION_KEY` ausente desabilita a escrita de auditoria (fail-safe) e é logado como **crítico**, em vez de usar uma chave descartável.
- **Armazenamento client-side criptografado** — dados de conversa são criptografados com AES-GCM-256 no IndexedDB antes da persistência.
- **Ferramenta de migração** — `src/scripts/migrate_logs.py` migra logs legados em texto plano para envelopes criptografados.

### LGPD (proteção de dados brasileira)
- **Scrubber de PHI** (`telemetry/scrubbers/phi.ts`) redige identificadores brasileiros antes de qualquer telemetria: **CPF, CNS/SUS, CRM, CEP, telefone BR, e-mail, data de nascimento** — recursivo sobre objetos/arrays, com suíte de 42 casos.
- **Portão de PHI fail-closed** — `scrubPHI()` roda *antes* da inferência; uma falha interrompe a execução e emite `InferenceFailed`.

### Prontidão FDA SaMD / ANVISA
- **Model cards** (`src/ml/pipelines/model_card_generator.py`, `models/model_card.md`) documentam uso pretendido (CDSS, triagem de câncer oral), limitações clínicas (exclusão pediátrica, contraindicação para imunocomprometidos, variância geográfica), calibração e fairness.
- **Lineage determinístico** — `src/ml/pipelines/lineage.py` registra checksums SHA-256 do dataset, schemas, regras clínicas, registro de features e lógica de pré-processamento + commit git (`models/data_lineage.json`).
- **Snapshots imutáveis** — o treino persiste `raw.parquet` / `validated.parquet` indexados pelo hash do dataset.
- **Replay event-sourced** — cada evento clínico carrega um `sequence` dentro de um `traceId` para reconstrução determinística.

---

## 🔬 Plataforma de Machine Learning

O núcleo diagnóstico é governado por um **pipeline de MLOps de nível hospitalar** (`src/train.py` orquestrando `src/ml/pipelines/**`).

| Estágio | Módulo | O que faz |
| :--- | :--- | :--- |
| **Validação** | `validation/{training,inference}_schema.py`, `clinical_rules.py` | Schemas Pandera + regras de coerência clínica com severidade `OK/WARNING/HIGH/CRITICAL` (exclusão pediátrica <18, limites de sobrevida, inconsistência estágio/sobrevida). |
| **Eng. de Features** | `preprocessing/preprocessing.py` | `ClinicalFeatureExtractor` deriva `risk_index` (tabaco+álcool+HPV), `age_bucket`, `high_incidence_country`; depois `StandardScaler` + `OneHotEncoder`. |
| **Auditoria de Vazamento** | `audit/leakage.py` | Bloqueia features posteriores (`Diagnosis_Stage`); sinaliza Pearson \|r\|>0,95, MI>0,95, importância por permutação>0,45. |
| **OOD** | `preprocessing/ood.py` | Isolation Forest (`contamination=0.01`) sinaliza combinações demográficas raras. |
| **Calibração** | `calibration/calibration_engine.py` | Platt vs. Isotônica auto-selecionada por Brier; ECE/MCE em 10 bins; curva de confiabilidade. |
| **Fairness** | `audit/fairness.py` | Disparidade FNR/FPR/recall por Equalized-Odds (threshold de 15%) entre Gênero / faixa-etária / País. |
| **Drift** | `drift/drift_rules.py`, `ml_platform/drift.py` | Teste KS (p<0,05), PSI ≥0,25, divergência JS ≥0,20; flag global quando >33% das features sofrem drift. |
| **Lineage & Cards** | `lineage.py`, `model_card_generator.py` | Lineage SHA-256 + model card estilo FDA. |
| **Tracking** | `train.py` | Logging MLflow + registro do modelo (`AetherOncologyOralCancerHighRisk`). |

**Modelo** — `src/models/mlp.py`: uma MLP configurável `Input → [128, 64, 32] → 1 logit` com BatchNorm, ReLU, Dropout(0.3), treinada com `BCEWithLogitsLoss(pos_weight)` e early stopping. Busca de hiperparâmetros via **Optuna (TPE)** em `src/optimize.py`.

**Dataset** — *Oral Cancer Top 30 Countries* (Licença MIT); alvo binário `high_risk = Diagnosis_Stage ∈ {Moderate, Late}`.

> 🧐 **Nota de integridade:** o `models/fairness_audit.json` versionado reporta paridade quase perfeita entre todos os subgrupos, o que é incomum para um holdout real e provavelmente reflete um conjunto de avaliação sintético/regenerado. Trate a *infraestrutura* de fairness como nível de produção e os *números reportados* como provisórios, pendentes de validação em dados clínicos reais.

---

## 🗂️ Governança de Dados

- **Dois schemas, por intenção** — treino (`strict`, enums completos) vs. inferência (mais frouxo, inclui variantes `Unknown`) previnem skew treino/produção.
- **Motor de severidade** — `ClinicalValidationResult` rotula cada registro `OK / WARNING / HIGH / CRITICAL`; `HIGH/CRITICAL` bloqueia a inferência (ex.: idade pediátrica, contradição estágio/sobrevida).
- **Vazamento temporal & proxy** — features posteriores são bloqueadas; thresholds de correlação/MI/permutação levantam `ValueError` durante o treino.
- **Detecção OOD** — Isolation Forest protege contra combinações demográficas não vistas no treino.
- **Monitoramento de calibração** — ECE/MCE + curvas de confiabilidade persistidas em `models/calibration/`.
- **Governança de drift** — divergência KS / PSI / JS com gatilho global de >33% alimentando o workflow de Treino Contínuo.

---

## 📡 Protocolo de Streaming SSE

O chat clínico transmite via **Server-Sent Events** (`text/event-stream`). Cada evento é um objeto JSON carregando `BaseEventMetadata` (`sessionId`, `patientId`, `traceId`, `retrievalId` / `sequence` opcionais) e é validado contra uma **união Zod de 13 tipos de evento** no cliente (`transport/protocol/protocol.ts`).

| Evento | Emitido por | Destaques do payload |
| :--- | :--- | :--- |
| `routing_decision` | backend | `provider`, `model`, `rationale`, `estimated_latency_ms`, `estimated_cost`, `fallback_chain`, `was_fallback` |
| `status` | backend | fase da inferência (`thinking`, `retrieving`, `generating_internally`, `judging`, `streaming`, …) |
| `inference_envelope` | backend | `prompt_tokens`, `completion_tokens`, `latency_ms`, `cost_estimate` |
| `judgement_started` | backend | avaliação de segurança inicia |
| `judgement_completed` | backend | registro `ClinicalJudgement` completo |
| `hallucination_detected` | backend | afirmações sinalizadas |
| `escalation_triggered` | backend | `WARNING` / `HARD_STOP` |
| `token` | backend | chunk de texto transmitido |
| `citation` | backend | metadados de evidência / fonte |
| `attachment` | backend | metadados de gráfico / artefato |
| `trace` | backend | âncora de trace |
| `error` | backend | falha de stream / bloqueio por `HARD_STOP` |
| `complete` | backend | stream finalizado |

**Exemplo de stream:**

```text
data: {"type":"routing_decision","provider":"groq","model":"llama-3.3-70b-versatile","rationale":"live_streaming → baixa latência"}

data: {"type":"status","status":"generating_internally"}

data: {"type":"inference_envelope","latency_ms":345,"prompt_tokens":512,"completion_tokens":188}

data: {"type":"judgement_completed","hallucination_risk":"LOW","evidence_strength":"HIGH","escalation_level":"NONE"}

data: {"type":"token","chunk":"Dado o status de BRCA1, "}

data: {"type":"complete"}
```

**Replay determinístico** — o gateway do cliente faz retry com backoff exponencial (3 tentativas: 500 ms · 1 s · 2 s), suporta cancelamento por `AbortSignal`, reconhece o marcador `[DONE]` e encaminha eventos desconhecidos-mas-tipados para forward-compatibility. Como cada evento carrega um `sequence` dentro de seu `traceId`, uma sessão pode ser reproduzida evento a evento a partir do event bus.

> 🧪 Vários eventos de telemetria do backend (`judgement_*`, `routing_decision`, `inference_envelope`, `hallucination_detected`, `escalation_triggered`) são definidos e emitidos, mas nem todos são consumidos pelos hooks atuais do frontend.

---

## 🌐 Referência da API

URL base (prod): `https://api.vitorsilva.engineer` · Docs interativas: `/docs`. Rotas **✅** exigem o header `access_token`; **🌐** são abertas. Auth é **fail-closed** (503 se `API_KEY` ausente em produção).

> **Nota Tech Challenge:** `/predict` está **aberto (🌐, sem key)** para avaliação acadêmica — segue rate-limited e auditado (fail-closed). As rotas de **governança** permanecem protegidas. Em produção toda rota seria key-gated e, depois, **OAuth2/OIDC** por usuário.

| Método | Rota | Auth | Descrição |
| :--- | :--- | :---: | :--- |
| `POST` | `/predict` | 🌐 | Predição de risco de câncer oral (`OralCancerRequest` → `PredictionResponse`). Pública (avaliação), rate-limit 10/min, auditada fail-closed. |
| `POST` | `/api/v1/clinical/chat` | — | Stream **SSE** do copiloto clínico. |
| `GET` | `/api/v1/clinical/approvals` | — | Lista aprovações médicas pendentes. |
| `GET` | `/api/v1/clinical/approvals/{id}` | — | Busca uma aprovação. |
| `POST` | `/api/v1/clinical/approvals` | — | Cria uma solicitação de aprovação. |
| `DELETE` | `/api/v1/clinical/approvals/{id}` | — | Resolve / deleta uma aprovação. |
| `POST` | `/feedback` | ✅ | Envia ground truth de uma predição (loop de drift/fairness). |
| `GET` | `/analytics` | ✅ | Métricas de drift (p-values do teste KS). |
| `GET` | `/audit` | ✅ | Visão descriptografada da trilha de auditoria. |
| `GET` | `/monitor/drift` | ✅ | Relatório de drift por teste KS. |
| `GET` | `/monitor/fairness` | ✅ | Auditoria de fairness vs. feedback de ground-truth. |
| `GET` | `/monitor/sustainability` | ✅ | Relatório de carbono Green-AI. |
| `GET` | `/health`, `/health/live`, `/health/ready`, `/health/inference` | — | Liveness / readiness / status do modelo. |
| `GET` | `/version`, `/heartbeat` | — | SHA do build & heartbeat de ops. |

**`OralCancerRequest`** (8 campos): `age`, `survival_rate`, `tobacco_use`, `alcohol_use`, `country`, `gender`, `socioeconomic_status`, `treatment_type`.

---

## 📁 Estrutura do Projeto

```text
Aether Oncology/
├── src/                              # ⚙️ Backend FastAPI (Python 3.12)
│   ├── main.py                       # Wiring do app, lifespan, /predict, monitoramento, middleware SRE
│   ├── api/
│   │   ├── routes/clinical_chat.py   # Endpoints SSE de chat + aprovação
│   │   └── schemas.py                # Contratos Pydantic (OralCancerRequest, PredictionResponse)
│   ├── orchestration/
│   │   └── clinical_runtime.py       # ClinicalInferenceRuntime (roteamento→stream→juiz→escalonamento)
│   ├── providers/                    # 🤖 Plugins de provedores de LLM
│   │   ├── base.py  router.py  circuit_breaker.py
│   │   ├── groq_provider.py  gemini_provider.py
│   │   └── openai_provider.py  judge_provider.py
│   ├── safety/                       # 🛡️ Motor de segurança clínica
│   │   ├── clinical_judge.py  consensus_engine.py
│   │   ├── hallucination_guard.py  escalation_policy.py  types.py
│   ├── streaming/protocol.py         # 📡 Modelos de evento SSE + format_sse()
│   ├── ml/pipelines/                 # 🔬 Governança de ML
│   │   ├── validation/  calibration/  audit/  drift/  preprocessing/
│   │   ├── lineage.py  model_card_generator.py
│   ├── ml_platform/                  # Orchestrator, drift, fairness, green_ai, treino
│   ├── models/mlp.py                 # MLP PyTorch
│   ├── services/                     # audit · predictor · research(RAG) · approval_store · inference_client
│   ├── train.py  optimize.py         # Treino + HPO Optuna
│   └── core/logging.py               # Logging JSON estruturado + contexto de request
│
├── frontend/                         # 🖥️ Next.js 15 / React 19 / TypeScript
│   └── src/features/ai/
│       ├── orchestration/
│       │   ├── planner/              # intentDetector · toolCapabilities · planner
│       │   └── runtime/              # stateMachine · eventBus · overrideEngine
│       │                             #   approvalManager · physicianSession · executionContext
│       ├── transport/                # aiGateway · protocol(Zod) · sse(stream-reader)
│       ├── tools/                    # registry · runtime (executor de DAG)  ⟶ 🟡 ferramentas mock
│       ├── services/persistence/     # crypto(AES-GCM) · db(IndexedDB)
│       ├── telemetry/scrubbers/phi.ts# 🔐 Scrubber de PHI (LGPD) (+ testes)
│       └── components/               # approval/ override/ safety/ intelligence/ rag/ chat/
│
├── models/                           # Artefatos treinados + saídas de governança
│   ├── aether_mlp_v2.pth  preprocessor.joblib  calibrator.joblib  ood_detector.joblib
│   ├── model_card.md  data_lineage.json  fairness_audit.json
│   └── calibration/                  # ECE/MCE, Brier, reliability_curve.png
│
├── infrastructure/                   # ☸️ Kubernetes + Terraform (AWS EKS/Aurora)
├── .github/workflows/                # 🔁 unified-mlops · ml-ct · keep_alive
├── tests/                            # pytest: api · model · schema · audit · research
├── docs/                             # MODEL_CARD · INFRASTRUCTURE · screenshots
├── Dockerfile  Makefile  pyproject.toml  requirements.txt
└── README.md
```

---

## ⚙️ Instalação

### Pré-requisitos
- **Python 3.12+**, **Node.js 22+**, `git`.

### Backend

```bash
# 1. Clonar
git clone https://github.com/vdfs89/Aether_Oncology.git
cd Aether_Oncology

# 2. Ambiente virtual
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\Activate.ps1

# 3. Dependências
pip install -r requirements.txt

# 4. Configurar ambiente (veja a tabela abaixo)
cp .env.example .env               # depois adicione as chaves obrigatórias
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # ou crie .env.local manualmente
```

---

## 🔑 Variáveis de Ambiente

> [!IMPORTANT]
> O backend **valida a configuração no startup** e loga **crítico** quando uma variável obrigatória (`API_KEY`, `AUDIT_ENCRYPTION_KEY`) está ausente em produção. Em vez de crash-loop num PaaS, ele **falha fechado na camada de request** (rotas protegidas → 503) e **falha seguro** na auditoria (escrita desabilitada) — nunca usa defaults inseguros (`src/main.py` lifespan + `get_api_key`).

### Backend

| Variável | Obrigatória | Padrão | Propósito |
| :--- | :---: | :--- | :--- |
| `API_KEY` | ✅ (prod) | — | Header `access_token` das rotas protegidas. **Sem default**: ausente em produção → rotas protegidas retornam 503 (fail-closed). `/predict` é público. |
| `OPENAI_API_KEY` | ✅ | — | Alimenta o **juiz** de segurança (`gpt-4o-mini`). |
| `GROQ_API_KEY` | ✅ | — | Provedor de LLM primário de baixa latência (LLaMA 3.3 70B). |
| `GEMINI_API_KEY` | ✅ | — | Provedor de fallback de raciocínio/multimodal (Gemini 2.0 Flash). |
| `AUDIT_ENCRYPTION_KEY` | ✅ | — | Chave simétrica **Fernet** para a trilha de auditoria criptografada (validada no boot). |
| `OPENAI_JUDGE_MODEL` | ⬜ | `gpt-4o-mini` | Sobrescreve o modelo do juiz. |
| `MLFLOW_TRACKING_URI` | ⬜ | `./mlruns` | Store de tracking de experimentos MLflow. |
| `ENTREZ_EMAIL` | ⬜ | placeholder | Identificação NCBI/PubMed para o RAG. |
| `HF_TOKEN` | ⬜ | — | Fallback opcional de inferência remota no Hugging Face. |

Gerar uma chave Fernet:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Frontend

| Variável | Padrão | Propósito |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | URL base do backend para chamadas SSE & de predição. |
| `NEXT_PUBLIC_LLM_PROVIDER` | `mock` | Seleção de provedor no frontend: `mock` · `groq` · `gemini`. |

---

## ▶️ Executando o Sistema

```bash
# Backend (FastAPI + Uvicorn)
uvicorn src.main:app --reload --port 8000
#  → API em http://localhost:8000 · docs em /docs

# Frontend (Next.js)
cd frontend && npm run dev
#  → Portal em http://localhost:3000

# Treinar / retreinar o modelo diagnóstico (escreve em models/ + MLflow)
python -m src.train

# Otimização de hiperparâmetros (Optuna)
python -m src.optimize
```

> ℹ️ Antes do modelo ser treinado, as rotas de predição retornam `503` e os testes correspondentes são marcados como `xfail` — a API mesmo assim inicia.

---

## 🧪 Testes

```bash
# Backend — suíte completa (~91% de cobertura)
pytest                              # ou: pytest -v --cov=src

# Suítes específicas
pytest tests/test_api.py            # integração de endpoint + auth + validação de schema
pytest tests/test_model.py          # forward da MLP, gradientes, limites do sigmoid
pytest tests/test_schema.py         # contratos de dados Pandera
pytest tests/test_audit.py          # criptografia Fernet + status de drift do teste KS
pytest tests/test_research.py       # comportamento de RAG / circuit-breaker

# Frontend
cd frontend
npm run lint                        # ESLint
npx tsc --noEmit                    # checagem de tipos TypeScript
npx tsx src/features/ai/telemetry/scrubbers/__tests__/phi.test.ts   # scrubber de PHI (42 casos)
```

| Suíte | Cobre |
| :--- | :--- |
| **Scrubber de PHI** | Redação de CPF, CNS/SUS, CRM, CEP, telefone BR, e-mail, data de nascimento (42 casos) |
| **Segurança** | Testes unitários do `overrideEngine`, execução do DAG do tool-runtime |
| **Replay/auditoria** | Round-trip de JSONL criptografado + status de drift (`insufficient`, `collecting`, `stable`, `alert`) |

---

## 🔐 Modelo de Segurança

| Camada | Primitiva | Onde |
| :--- | :--- | :--- |
| **Auditoria em repouso** | Criptografia simétrica **Fernet** (AES-128-CBC + HMAC-SHA256) com envelopes versionados | `src/services/audit.py` |
| **Armazenamento no cliente** | **AES-GCM-256** com IV aleatório de 12 bytes por registro | `frontend/.../persistence/crypto.ts` |
| **Derivação de chave** | **PBKDF2-SHA256**, 100.000 iterações | `crypto.ts` |
| **Integridade de lineage** | Checksums **SHA-256** de dataset/schemas/pré-processamento | `src/ml/pipelines/lineage.py` |
| **Transporte / API** | API-key (`access_token`), CORS estrito, rate limiting SlowAPI, correlação `X-Request-ID` | `src/main.py` |
| **PHI** | Redação por regex (LGPD) **antes** de qualquer log/telemetria | `telemetry/scrubbers/phi.ts` |
| **Container** | Usuário não-root, `readOnlyRootFilesystem`, `allowPrivilegeEscalation=false` | `Dockerfile`, manifests K8s |

> [!NOTE]
> Backlog de hardening (intencionalmente exposto): o salt do PBKDF2 do IndexedDB é uma constante fixa (aceitável para tokens de sessão de alta entropia, mas documentado), existe um token de sessão demo para dev, e o `.jsonl` de auditoria ainda não tem limite de retenção. Veja o [Roadmap](#-roadmap).

---

## ⚕️ Aviso Clínico

> [!CAUTION]
> **Aether Oncology NÃO é um dispositivo de diagnóstico e não deve ser usado para tomar decisões clínicas autônomas.**
>
> - É um **Sistema de Apoio à Decisão Clínica (CDSS)** apenas para **triagem de risco** e **assistência à pesquisa**.
> - **A supervisão médica é obrigatória.** O modelo quantifica o risco; um clínico licenciado interpreta, valida e decide.
> - **Não** recebeu aprovação do FDA, registro na ANVISA, marcação CE ou qualquer aprovação regulatória.
> - O modelo **não é validado** para pacientes pediátricos (<18), indivíduos imunocomprometidos ou populações fora de sua distribuição de treino (Top-30 países com maior incidência de câncer oral).
> - Saídas podem conter erros ou alucinações; o motor de segurança **reduz**, mas não **elimina**, esse risco.

---

## 🛤️ Roadmap

### Curto prazo — Hardening & Observabilidade
- [ ] Migrar a trilha de auditoria de JSONL → **PostgreSQL/Supabase** (o Aurora já está provisionado no Terraform).
- [ ] Tracing distribuído com **OpenTelemetry** (substituir o `X-Request-ID` manual).
- [ ] Consumir os eventos `judgement_*` / `escalation_triggered` do backend no Safety HUD do frontend.
- [ ] **SSO/SAML** hospitalar para identidade médica real; aplicar auto-rejeição por timeout de aprovação.
- [ ] Política de retenção + limite de tamanho do log de auditoria.

### Médio prazo — Profundidade Clínica
- [ ] Substituir as **ferramentas clínicas mock** por backends reais (biomarcador, therapy-match, diretrizes).
- [ ] **RAG sobre diretrizes NCCN** com um vector store real (`VectorDBService` atualmente é stub).
- [ ] Auditoria de viés automatizada com **Fairlearn** no CI.
- [ ] **Raciocínio temporal** sobre trajetórias longitudinais de biomarcadores.

### Longo prazo — Visão de Plataforma
- [ ] **Simulação de Tumor Board** (deliberação multi-agente).
- [ ] **Integração genômica** (KRAS, EGFR, HER2) — correlação multimodal.
- [ ] Integração **FHIR** em tempo real + **PACS**.
- [ ] **Aprendizado federado** + **privacidade diferencial** para treino entre instituições.

---

## 🤝 Contribuindo

Contribuições são bem-vindas — este é um projeto open-source de engenharia de IA clínica.

1. Faça **fork** e crie um branch de feature: `git checkout -b feat/sua-feature`.
2. Mantenha o contrato de maturidade honesto — novas capacidades devem ser rotuladas `Atual / Experimental / Mock / Planejado`.
3. Rode os portões antes de abrir um PR:
   ```bash
   ruff check . && ruff format --check .
   pytest
   cd frontend && npm run lint && npx tsc --noEmit
   ```
4. Para mudanças relevantes a aspectos clínicos/de segurança, inclua testes e atualize o **model card** / docs de **segurança** pertinentes.
5. Abra um PR contra `main` com uma descrição clara e o impacto de maturidade.

Por favor, siga as convenções de módulos existentes (`src/` para o backend, `frontend/src/features/ai/` para o runtime) e nunca enfraqueça os controles de PHI/auditoria/segurança sem discussão explícita.

---

## 📄 Licença

Distribuído sob a **Licença MIT**. Veja [`LICENSE`](./LICENSE) para detalhes.

---

<p align="center">
  <em>Aether Oncology — Medicina é Arte, Ciência é a Ferramenta.</em><br/>
  <strong>Precision for Life.</strong> 🪷
</p>
