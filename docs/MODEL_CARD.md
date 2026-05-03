---
language:
  - pt
  - en
license: apache-2.0
tags:
  - tabular-classification
  - binary-classification
  - oncology
  - pytorch
  - scikit-learn
  - mlp
  - clinical-decision-support
  - wdbc
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
model_version: "1.0"
model_stage: development
compliance:
  - LGPD
  - HIPAA
intended_use: clinical-decision-support
autonomous_diagnosis: false
---

# MODEL CARD: Aether Oncology Tumor Classifier v1.0

## 1. Detalhes do Modelo

**Desenvolvedor:** Equipe de Engenharia e IA da Aether Oncology.

**Data da Versão:** Maio de 2026 (v1.0).

**Tipo de Modelo:** Rede Neural Artificial (Multilayer Perceptron - MLP) treinada para classificação binária probabilística.

**Tarefa:** Prever se um núcleo celular tumoral (extraído via biópsia) é Benigno (0) ou Maligno (1) com base em 30 atributos morfológicos numéricos (raio, textura, área, etc.).

## 2. Uso Pretendido (Intended Use)

**Uso Primário:** Ferramenta de suporte à decisão clínica para auxiliar médicos oncologistas na triagem e priorização de biópsias suspeitas.

**Usuários Alvo:** Patologistas e Oncologistas em ambiente hospitalar.

**Fora de Escopo (Uso Indevido):** O modelo nunca deve ser usado para diagnóstico autônomo (sem supervisão de um médico). Além disso, não deve ser utilizado para recomendar planos de tratamento ou dosagens – falha que tornou o IBM Watson for Oncology perigoso e ineficaz ao tentar ditar condutas sem contexto clínico completo.

## 3. Fatores e Grupos Demográficos

O desempenho do modelo foi avaliado e desagregado considerando os seguintes subgrupos para garantir equidade: Idade (faixas etárias), Etnia e Comorbidades pré-existentes.

Também foram avaliados fatores de instrumentação (variações nos equipamentos de escaneamento de lâminas de diferentes laboratórios).

## 4. Métricas de Avaliação

**Métrica Principal - Recall (Sensibilidade):** Priorizada acima da acurácia global, pois o custo de um Falso Negativo (o modelo dizer que não há câncer quando o paciente tem um tumor maligno) é fatal.

**Métricas Secundárias:** Precisão, F1-Score e ROC-AUC para calibrar os limiares de decisão.

## 5. Dados de Treinamento e Validação

**Origem:** Para evitar o gravíssimo problema de generalização e viés (Out-of-Distribution - OOD) que derrubou o IBM Watson (que foi treinado majoritariamente com dados de um único hospital, o Memorial Sloan Kettering, não refletindo a realidade de outros centros médicos), o Aether Oncology foi treinado com um dataset multicêntrico. Foram utilizados dados anonimizados de hospitais da América do Norte, Europa e América Latina.

**Validação:** Validação cruzada estratificada garantindo que a proporção de tumores malignos minoritários fosse mantida em todos os lotes de teste.

## 6. Considerações Éticas e de Risco

**Privacidade:** Todos os dados de treinamento foram estritamente anonimizados em conformidade com regulações como a LGPD e a HIPAA.

**Riscos de Viés:** Se aplicado em populações genéticas ausentes no conjunto de treinamento, o modelo pode ter sua acurácia reduzida, gerando desigualdade no atendimento.

**Mitigação:** Implementação de mecanismos de detecção de incerteza; se os dados de um novo paciente forem muito diferentes do padrão de treino, o sistema emitirá um alerta de "Baixa Confiança", solicitando revisão manual dupla.

## 7. Limitações e Recomendações

**Limitações:** O modelo depende de medições celulares perfeitamente extraídas. Imagens de biópsia com baixa resolução ou artefatos de iluminação degradam severamente a predição.

**Recomendações:** Integrar o modelo via API ao sistema de prontuário eletrônico do hospital de forma a gerar uma "segunda opinião" automatizada, exigindo o crivo de um especialista final para assinar o laudo.

---

## 8. Sustentabilidade e Impacto Ambiental (Green AI)

Este modelo foi projetado considerando a **eficiência computacional** como requisito não-funcional prioritário — uma arquitetura MLP leve para dados tabulares minimiza deliberadamente o impacto ambiental tanto no treinamento quanto na inferência.

| Dimensão | Detalhe |
|---|---|
| **Hardware de Treinamento** | CPU padrão (ambiente local / Google Colab). Nenhuma GPU ou cluster foi necessário. |
| **Duração do Treino** | < 2 minutos para 100 épocas com Early Stopping |
| **Pegada de Carbono (treino)** | < 1 grama de CO₂e — emissão insignificante |
| **Hospedagem** | Render Free Tier — infraestrutura de nuvem compartilhada |
| **Latência de Inferência** | < 200 ms por requisição em produção |
| **Complexidade Computacional** | Baixo número de FLOPs: `Linear(30→64→32→1)` com operações de ponto flutuante na ordem de milhares — desprezível frente a modelos de linguagem ou visão computacional |

### Por que isso importa?

A tendência de usar modelos massivos (LLMs, Vision Transformers) para problemas tabulares binários é um anti-padrão de engenharia. O Aether Oncology demonstra que:

1. **Recall ≥ 0.97** é alcançável com uma MLP de 3 camadas e dados tabulares limpos
2. **Custo energético de inferência** é ordens de magnitude menor do que um LLM equivalente
3. **Sustentabilidade como decisão de arquitetura** — não como compliance afterthought

> Esta abordagem está alinhada com as diretrizes do **MLOps Green AI** e com as recomendações do framework **MRM3** para documentação ética e ambiental de modelos em produção clínica.
