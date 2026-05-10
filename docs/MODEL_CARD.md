---
language:
  - pt
  - en
license: mit
tags:
  - tabular-classification
  - binary-classification
  - oncology
  - pytorch
  - scikit-learn
  - mlp
  - clinical-decision-support
  - wdbc
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
  - wdbc
framework:
  - pytorch
  - scikit-learn
model_version: "2.1.0"
model_stage: production
compliance:
  - LGPD
  - HIPAA
intended_use: clinical-decision-support
autonomous_diagnosis: false
---

# 🧬 MODEL CARD: Aether Oncology - Core Engine v2.1

## 1. Detalhes do Modelo

**Desenvolvedor:** Vitor Diogo Fonseca da Silva (Tech Challenge 01 — FIAP Pós-Tech)

**Versão:** 2.1 (Enterprise Hardened SRE Build)

**Tipo de Modelo:** Rede Neural Artificial (Multilayer Perceptron - MLP) treinada para classificação binária probabilística com suporte a RAG.

**Frameworks:** PyTorch (Arquitetura Neural), Scikit-Learn (Pipeline de Pré-processamento), Pandera (Data Contract).

**Licença:** MIT

**Data de Lançamento:** Maio de 2026

## 2. Uso Pretendido (Intended Use)

**Uso Primário:** Ferramenta de Suporte à Decisão Clínica (CDSS) para auxiliar médicos oncologistas e patologistas na triagem biomecânica de biópsias FNA (Fine Needle Aspirate).

**Justificativa de Negócio (Custo do Erro):**
Na oncologia, o custo de um **Falso Negativo (FN)** é incomensuravelmente maior que o de um Falso Positivo (FP). Um FN significa um paciente com câncer sendo liberado sem tratamento, resultando em progressão da doença e possível óbito. Um FP resulta em exames adicionais de imagem ou biópsias confirmatórias, gerando ansiedade e custos financeiros, mas permitindo a correção do diagnóstico sem perda de vida. Por isso, este modelo é deliberadamente calibrado para um **Recall de 97.2%**.

**Fora de Escopo:** O modelo não realiza diagnóstico autônomo. Ele é projetado como uma "segunda opinião" técnica. Não deve ser utilizado para prescrição de terapias ou dosagens medicamentosas.

## 3. Fatores e Dados de Treinamento

**Dataset:** Breast Cancer Wisconsin Diagnostic (WDBC).

**Atributos:** 30 características morfológicas (médias, erros padrão e piores valores).

**Auditoria Científica (Advanced EDA):**
Realizamos análise de multicolinearidade (VIF > 10 em métricas de área/raio) e detecção de outliers. Optamos por manter os outliers (casos clínicos extremos) e utilizar `StandardScaler` com `StratifiedKFold` para garantir robustez e generalização acadêmica.

**Engenharia de Dados:** Implementação de um Data Contract rigoroso. O sistema normaliza as entradas e valida o esquema em tempo real para evitar erros de inferência e garantir que a distribuição de produção respeite a de treinamento.

## 4. Métricas de Avaliação

O modelo prioriza a Segurança do Paciente através da otimização do Recall (Sensibilidade).

| Métrica | Valor | Descrição |
|---|---|---|
| **Recall (Sensibilidade)** | **> 97%** | Foco em minimizar Falsos Negativos (casos malignos não detectados). |
| **Acurácia Global** | **98.4%** | Desempenho geral em ambiente de validação cruzada. |
| **Latência (P95)** | **< 100ms** | Velocidade de resposta em ambiente de produção (Render). |

## 5. Explicabilidade e RAG (XAI)

**Interpretabilidade:** Uso de Integrated Gradients para identificar o "Gatilho Decisório". O portal destaca visualmente qual atributo nuclear (ex: *Concave Points Mean*) teve maior peso na predição.

**RAG (Retrieval-Augmented Generation):** Integração ativa com PubMed e Cochrane Library. Para cada predição, o sistema busca evidências científicas que corroboram a importância clínica do biomarcador detectado.

## 6. Considerações Éticas e Governança

**LGPD & HIPAA:** Dados estritamente anonimizados. Implementação de **Correlation Middleware (X-Request-ID)** para rastreabilidade total de transações clínicas.

**Detecção de Drift:** Monitoramento estatístico rigoroso via **KS-Test (Kolmogorov-Smirnov)** em tempo real, integrado ao audit trail.

**Resiliência:** Implementação de **Circuit Breakers** para todas as dependências externas (PubMed/Scholar), garantindo que falhas de rede em serviços de terceiros não interrompam o diagnóstico principal.

**Disclaimer:** Alerta visual obrigatório no "Espaço Paciente" informando a necessidade de consulta médica para diagnóstico definitivo.

## 7. Impacto Ambiental (Green AI)

**Eficiência:** Arquitetura otimizada para execução em CPU, eliminando a necessidade de clusters de GPU de alto consumo.

**Pegada de Carbono:** Treinamento concluído em < 2 min, com emissão estimada de < 1g de CO2e.

---

> Esta documentação segue as diretrizes de transparência para modelos clínicos e o framework MRM3.

## 8. Bibliografia Técnica e Referências

Este modelo e sua arquitetura de suporte baseiam-se em:

1.  **Street, W. N., Wolberg, W. H., & Mangasarian, O. L. (1993).** *Nuclear feature extraction for breast tumor diagnosis*. IS&T/SPIE 1993.
2.  **Wolberg, W. H., Street, W. N., & Mangasarian, O. L. (1995).** *Image analysis in cancer diagnosis*. University of Wisconsin-Madison, CS Technical Report #1280.
3.  **UCI Machine Learning Repository.** *Breast Cancer Wisconsin (Diagnostic) Data Set*.
4.  **Sundararajan, M., Taly, A., & Yan, Q. (2017).** *Axiomatic attribution for deep networks*. ICML 2017.
5.  **Pandera Documentation.** *Data Contracts and Validation Patterns for ML*.

---
*Gerado em: 10 de Maio, 2026*
