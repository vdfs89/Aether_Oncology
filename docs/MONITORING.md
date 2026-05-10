# Plano de Monitoramento — Aether Oncology Tumor Classifier v2.0

> **Contexto:** Em diagnósticos médicos, o monitoramento pós-deploy não é uma funcionalidade opcional — é um requisito de segurança. Um modelo que degradou silenciosamente pode gerar Falsos Negativos (pacientes malignos classificados como benignos), com consequências fatais.

---

## 1. O Que Monitorar e Por Quê

| Sinal | Ferramenta | Limiar de Alerta | Risco se Ignorado |
|---|---|---|---|
| **Data Drift** | Evidently AI / MLflow | ≥ 3 features com drift | Novo equipamento muda distribuição de `texture_mean` sem erro explícito |
| **Recall (Sensibilidade)** | Retorno de Exames | < 0.92 → alerta; < 0.90 → suspender | Falso Negativo com resultado fatal |
| **F1-Score** | MLflow | Queda > 5% vs. baseline | Modelo super-estimando casos malignos (excesso de alarmes) |
| **Latência de Inferência** | FastAPI Middleware | p95 > 200 ms | Diagnósticos em tempo real bloqueados |
| **Desvio de Predição** | Grafana | < 5% maligno em 1h | Colapso de predição ou falha na ingestão |
| **Taxa "Baixa Confiança"** | MLflow / logs API | > 20% das requisições | Pacientes fora da distribuição de treino (OOD) |
| **Taxa de Erro 422** | FastAPI logs | > 5% das requisições | Necessidade de treinar usuários da API |

---

## 2. Data Drift — Protocolo Detalhado

### O Problema
O modelo foi treinado com dados de equipamentos específicos. Se o hospital trocar o scanner de lâminas, a distribuição de features como `radius_mean`, `texture_mean` e `area_se` pode mudar significativamente — sem que nenhum erro de software ocorra.

### Detecção
```python
# Exemplo com Evidently AI
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset

report = Report(metrics=[DataDriftPreset()])
report.run(reference_data=df_treino, current_data=df_producao_ultima_semana)
report.save_html("docs/drift_report.html")
```

### Limiar de Alerta
- **Amarelo**: drift detectado em ≥ 3 features → revisão manual do pipeline
- **Vermelho**: drift detectado em ≥ 6 features → suspender predições automáticas e retreinar

---

## 3. Monitoramento de Latência — FastAPI Middleware

Adicionar ao `src/main.py` após o primeiro `make train` e validação clínica:

```python
import time
from fastapi import Request

@app.middleware("http")
async def add_latency_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Inference-Time-Ms"] = f"{duration_ms:.2f}"
    # Alerta se latência > 200ms
    if duration_ms > 200:
        logger.warning("Latência elevada: %.2f ms em %s", duration_ms, request.url.path)
    return response
```

**SLA definido:** p95 < 200 ms, p99 < 500 ms.

---

## 4. Dashboard Grafana — Métricas de Predição

### Métricas a exportar via `/metrics` (Prometheus):

| Métrica | Tipo | Descrição |
|---|---|---|
| `aether_predictions_total` | Counter | Total de predições por label (Malignant/Benign) |
| `aether_low_confidence_total` | Counter | Total de predições com `confidence == "Low"` |
| `aether_inference_duration_seconds` | Histogram | Latência da inferência |
| `aether_malignant_ratio` | Gauge | Proporção de predições malignas (últimas 24h) |

### Alerta Crítico
```yaml
# Regra Grafana/Prometheus
alert: PredictionCollapse
expr: aether_malignant_ratio < 0.05
for: 1h
labels:
  severity: critical
annotations:
  summary: "Modelo classificando < 5% como Maligno — possível falha na ingestão"
```

---

## 5. Monitoramento de Recall — Ciclo Fechado

O Recall confirmado é calculado retrospectivamente quando laudos finais chegam:

```
Predição API  →  Revisão Médica  →  Biópsia Confirmatória  →  Feedback Loop
```

### Frequência de Reavaliação

| Período | Ação |
|---|---|
| Semanal | Calcular Recall/Precision nos casos com confirmação |
| Mensal | Comparar com baseline de treino (Recall ≥ 0.95) |
| Trimestral | Avaliar necessidade de retreino com dados novos |

### Limiar de Retreino
Se o **Recall confirmado cair abaixo de 0.92** em qualquer janela mensal → abrir issue de retreino prioritário.

---

## 6. Playbook de Incidentes

Procedimentos de resposta escalonados por severidade:

| Severidade | Gatilho | Ação Imediata |
|---|---|---|
| 🔴 **CRÍTICO** | Recall < 0.90 | Interromper predições automáticas; todas as lâminas para revisão manual tripla |
| 🟠 **ALTO** | Recall < 0.92 ou Drift ≥ 6 features | Suspender novas predições; acionar Patologista Responsável |
| 🟡 **MÉDIO** | Drift ≥ 3 features ou Taxa "Low" > 20% | Iniciar coleta de novas amostras rotuladas para retreino na próxima sprint |
| 🟢 **BAIXO** | F1 queda > 5% vs. baseline | Agendar revisão do pipeline na próxima janela de manutenção |

---

## 7. Responsabilidades

| Papel | Responsabilidade |
|---|---|
| Engenheiro de ML | Monitorar drift e métricas técnicas semanalmente |
| Patologista Responsável | Reportar discrepâncias entre predição e laudo final |
| Gestor Clínico | Acionar protocolo de suspensão se Recall < 0.90 |
|---|---|

---

## 8. Monitoramento de Disponibilidade (Uptime)

Devido ao uso de instâncias "Free" no Render, o sistema pode entrar em modo de suspensão após períodos de inatividade.

### cold Start (Erro 503)
- **Causa**: Instância em modo de hibernação.
- **Sintoma**: Resposta HTTP 503 (Service Unavailable) na primeira requisição após inatividade.
- **Mitigação**: 
    1. GitHub Action `keep_alive.yml` configurado para pingar `/health` a cada 10 minutos.
    2. No `portal.js`, implementado tratamento para 503 com mensagem de orientação ao usuário clínico.

---

## 9. Referências

- [Evidently AI Documentation](https://docs.evidentlyai.com/)
- [MLflow Model Monitoring](https://mlflow.org/docs/latest/model-registry.html)
- [FastAPI + Prometheus](https://github.com/trallnag/prometheus-fastapi-instrumentator)
- Model Card: [`docs/MODEL_CARD.md`](MODEL_CARD.md)
- Dockerfile: [`Dockerfile`](../Dockerfile)
