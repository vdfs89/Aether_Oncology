# Playbook de Monitoramento e Alertas (Aether Oncology)

> **Documentação Técnica — Etapa 4 (Deploy)**

A estratégia de Monitoramento da Aether Oncology visa assegurar que a API esteja responsiva, os dados de entrada preservem o padrão esperado e prever qualquer degradação do modelo. Como este é um cenário hipotético usando um banco de dados sintético, este playbook é um exercício técnico focado na **infraestrutura MLOps** implementada no projeto.

---

## 1. Escopo de Monitoramento

O monitoramento divide-se em 4 camadas essenciais, apoiadas pelos componentes da aplicação FastAPI.

### 1.1 Operacional (Infraestrutura)
- **O que medir:** Liveness (`/health/live`), Readiness (`/health/ready`), Uptime e a saúde dos providers LLM (`/health/inference`).
- **Latência:** Middleware distribuído monitorando métricas de tempo total de requisição (via cabeçalho `X-Inference-Time-Ms`).
- **Taxa de Erros:** Erros do tipo `HTTP 5xx` (falha na API) e `HTTP 429` (Rate Limiting Exceeded).

### 1.2 Entrada e Qualidade dos Dados
- **O que medir:** Conformidade com o esquema de inferência.
- **Ferramentas:** Validação nativa com `Pydantic` (`OralCancerRequest`), levantamento de erros `HTTP 422` (Unprocessable Entity).
- **Out-of-Distribution (OOD):** Embora `ClinicalOODDetector` (Isolation Forest) esteja disponível na fase de treino, os eventos de input fora da distribuição requerem monitoramento na entrada.

### 1.3 Predição e Data Drift
- **O que medir:** Mudanças no comportamento preditivo e de features da amostra em produção frente ao baseline de treino (geração do `data_lineage.json`).
- **Como medir:** As rotas `GET /analytics` e `GET /monitor/drift` analisam a trilha de auditoria armazenada para executar estatística comparativa (Teste KS / PSI / JS divergence).
- **Desvio global:** Gatilhos para quando mais de 33% das features sofrem drift.

### 1.4 Qualidade Clínica do Modelo
- **O que medir:** Equidade (*Fairness*) e Precisão preditiva ao longo do tempo.
- **Ferramentas:** Endpoint `/feedback` para receber resultados *ground truth* via interface médica e `/monitor/fairness` para confrontá-los.
- **Limitação Contextual:** Sem rotulagem clínica real, as métricas deste domínio tendem a ser inexpressivas (Baseline ROC ≈ 0.50).

---

## 2. Limiares de Alerta (Alerts & Thresholds)

Critérios de degradação e disparo de avisos, implementados nos relatórios do sistema:

| Categoria | Métrica | Limiar Crítico (Alert Trigger) | Severidade |
| :--- | :--- | :--- | :--- |
| **Operacional** | P95 Latency Inference | `> 500 ms` | Warning |
| **Operacional** | Error Rate (5xx) | `> 1%` das requisições em 5 min | Critical |
| **Dados** | Falha de Schema (422) | `> 5%` das requisições | Warning |
| **Data Drift** | Feature PSI (Qualquer) | `> 0.20` | Warning |
| **Data Drift** | KS-Test (P-value) | `< 0.05` | Warning |
| **Data Drift** | Global Drift | `> 33%` features com drift | High |

*(Notas de log como `HIGH LATENCY` já são ativamente geradas pela API FastAPI caso `duration_ms > 500`).*

---

## 3. Playbook de Resposta (Ações)

Como agir diante de um alerta.

### Alerta: Pico de Latência Operacional (> 500ms)
1. **Investigação:** Avaliar os logs (`HIGH LATENCY`) a fim de distinguir o tráfego. Checar a conectividade aos Providers (Groq, Gemini). O gargalo pode estar no componente de geração RAG e não no MLP do `/predict`.
2. **Ação:** Caso persista e haja sobrecarga, dimensionar as instâncias (*scale-up*) no Render.com. O *rate limiter* SlowAPI ajudará a mitigar contenções abusivas em curto prazo.

### Alerta: Erros Recorrentes de Validação (HTTP 422 - Schema)
1. **Investigação:** Verificar a versão do cabeçalho `X-Aether-Release` ou `X-Skew-Warning`. Pode haver um desalinhamento de contrato JSON (skews de versão entre o portal Next.js e a API Python).
2. **Ação:** Rejeitar no gateway as bad requests e alinhar de imediato o deploy do frontend à versão correta do schema `OralCancerRequest`.

### Alerta: Data Drift (PSI > 0.20 ou Alerta Global)
1. **Investigação:** Verificar via `/monitor/drift` qual feature principal sofreu o desvio drástico (ex.: `Survival_Rate`, idade). Extrair as amostras com o Endpoint `/audit` para analisar as tendências.
2. **Ação:** Uma intervenção técnica deve ser agendada. Embora a base seja sintética (o que anula o ganho de acurácia com retreino na prática), o processo formal manda re-verificar as etapas ETL de dados de treino e programar um retreinamento (*shadow mode*) caso surja um novo set rotulado confiável.

### Alerta: Anomalia no Volume de Auditoria (Falha de Envio de Logs)
1. **Investigação:** Um worker roda a cada hora (`AUDIT_VOLUME`) verificando anomalias. Se os eventos em disco estão vazios repentinamente, algo falhou.
2. **Ação:** Checar disponibilidade em disco e integridade da chave Fernet (`AUDIT_ENCRYPTION_KEY`). Um sistema *fail-closed* vai paralisar os laudos clínicos (HTTP 500) caso a auditoria falhe; é um incidente P1 (Prioridade 1).

---

## 4. Cadência de Revisão e Responsáveis

1. **Cadência Diária:** Engenheiro SRE / Operador verifica logs passivos no console Render à procura do aviso `HIGH LATENCY` ou falhas nos LLM providers.
2. **Cadência Semanal:** ML Engineer exporta `/monitor/drift` e reportes `/analytics` visando detectar anomalias contínuas nos dados inseridos via `/predict`.
3. **Responsável:** Papel concentrado no mantenedor do projeto (`vdfs89`), unificando Engenharia de Plataforma e ML Ops.
