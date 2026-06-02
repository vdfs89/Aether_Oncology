# ML Canvas — Aether Oncology

> **Etapa 1 — Tech Challenge.** Protótipo acadêmico; **não é dispositivo médico**.
> O cenário clínico abaixo é a **persona/cenário do exercício**, não uma afirmação de uso real.

---

## 1. Stakeholders
- **Sujeito da predição:** indivíduo cujo risco seria estimado.
- **Usuário (persona):** profissional de triagem que consultaria a estratificação de risco.
- **Time de ML / engenharia:** mantenedor do pipeline e da API.
- **Avaliação acadêmica:** banca do Tech Challenge (FIAP).

## 2. Proposta de Valor (Value Proposition)
- **Problema:** câncer oral é frequentemente detectado tarde, o que piora o prognóstico.
- **Para quem:** cenário hipotético de triagem precoce baseada em fatores de risco.
- **Por que ML:** estimar uma probabilidade de risco a partir de variáveis tabulares simples.

## 3. Tarefa de Predição (Prediction Task)
- **Tipo:** classificação binária (alto risco × baixo risco).
- **Entrada:** um registro tabular por indivíduo.
- **Saída:** probabilidade de risco + classe + nível de confiança.

## 4. Fontes de Dados (Data Sources)
- Dataset público **Oral Cancer Top 30 Countries** (~160k registros) — autor *Ankush Panday*, [Kaggle](https://www.kaggle.com/datasets/ankushpanday1/oral-cancer-prediction-dataset-top-30-countries). **Licença MIT** (confirmada nos metadados do Kaggle).
- **Caveat:** dataset **sintético**, sem validade clínica.

## 5. Features
- **Pré-diagnóstico (usadas):** `age`, `gender`, `country`, `socioeconomic_status`, `tobacco_use`, `alcohol_use`.
- **Excluídas por vazamento:** `treatment_type`, `survival_rate` (consequências do diagnóstico).

## 6. Métrica de Negócio + SLOs
- **Métrica de negócio:** custo assimétrico do erro — em triagem, **FN ≫ FP** (deixar de sinalizar um caso é o erro caro). O alvo de negócio é minimizar falsos negativos a um custo aceitável de falsos positivos.
- **SLOs do protótipo:** latência p95 `< 500 ms` em `/predict`; disponibilidade do serviço (*health probes*); rejeição de entrada inválida via schema (`HTTP 422`).

## 7. Métrica Técnica + Avaliação Offline (Offline Evaluation)
- **Principal:** Recall, PR-AUC. **Secundárias:** ROC-AUC, F1.
- **Protocolo:** validação cruzada estratificada **k=5** (inclusive no MLP); comparação contra baselines (`DummyClassifier`, Regressão Logística, árvore); teste de permutação/pareado para significância.

## 8. Decisões / Uso da Predição (Decisions)
- *(Persona)* a estratificação apoiaria a priorização de avaliação clínica — **nunca substituiria diagnóstico**. O médico decide; o modelo apenas ordena risco.

## 9. Servir Predições (Making Predictions)
- **Real-time / online:** API FastAPI síncrona, uma predição por requisição (ver [DEPLOY_ARCHITECTURE.md](./DEPLOY_ARCHITECTURE.md)).

## 10. Coleta de Dados e Re-treino (Building Models)
- Em protótipo, **não há coleta em produção**. Re-treino seria condicionado a um dataset **real rotulado** — retreinar sobre dado sintético não agrega (ver caveat).

## 11. Monitoramento (Live Monitoring)
- Operacional (latência, taxa de erro), drift de entrada (PSI/KS), drift de predição. Qualidade clínica limitada pela **ausência de ground truth real** (ver [MONITORING_PLAYBOOK.md](./MONITORING_PLAYBOOK.md)).

---

> [!CAUTION]
> **Caveat — resultado realizado (null result).**
> O [benchmark](./benchmark.md) e o diagnóstico estatístico provaram que o dataset sintético
> **não tem sinal aprendível**: ROC-AUC ≈ 0.50, recall ≈ 0.45, χ² com `p > 0.05` e informação
> mútua `< 5e-4` em **todas** as features (n = 160k). O alvo foi gerado de forma **independente**
> das variáveis.
>
> Portanto, este Canvas descreve o **design pretendido** do exercício; o modelo treinado **não
> tem capacidade preditiva real**. A entrega demonstra o **pipeline e a engenharia de ML**, com
> reporte honesto da limitação do dado — **não métricas infladas**. Ver [FINDINGS.md](./FINDINGS.md).
