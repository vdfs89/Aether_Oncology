# Relatório de Auditoria de Dados e Sinal Preditivo — Aether Oncology

**Data:** 2026-07-01  
**Fase:** Investigação Diagnóstica de Performance de ML  
**Dataset Auditado:** `data/raw/oral_cancer_top30.csv` (160.292 registros, 11 colunas)  

---

## 🌌 1. Resumo Executivo (Executive Summary)

Este relatório formaliza a investigação estatística e metodológica realizada no dataset de predição de câncer oral do **Aether Oncology**. O objetivo principal foi diagnosticar por que o modelo Multilayer Perceptron (MLP) e os baselines clássicos obtêm consistentemente uma performance de **ROC-AUC ≈ 0,50** (equivalente ao acaso/moeda ao ar), investigando se o problema reside na falta de sinal nos dados, na definição do target ou na modelagem.

**Conclusão Central:** O dataset é de origem sintética e foi gerado de forma que **todas as variáveis preditivas (fatores de risco e dados demográficos) são estatisticamente independentes do estágio do diagnóstico (target)**. Não há qualquer sinal preditivo ou causal nos dados. Logo, o limite de performance do modelo é imposto pela ausência absoluta de informação (entropia máxima), e não por problemas de arquitetura, parâmetros ou tuning de hiperparâmetros.

---

## 📊 2. Auditoria do Dataset (Tarefa 1)

O dataset bruto contém **160.292 linhas** e **11 colunas**, sem valores nulos (missing values) ou duplicatas.

### 2.1 Análise de Tipos e Cardinalidade
*   **ID**: Identificador sequencial único (`int64`, cardinalidade = 160.292).
*   **Country**: País do registro (`object`, 30 países únicos).
*   **Gender**: Gênero (`object`, 2 categorias).
*   **Age**: Idade (`int64`, intervalo [20, 89], média ~46,5 anos).
*   **Tobacco_Use**: Uso de tabaco (`int64`, binário 0/1, prevalência de ~60,1%).
*   **Alcohol_Use**: Uso de álcool (`int64`, binário 0/1, prevalência de ~50,0%).
*   **Socioeconomic_Status**: Status socioeconômico (`object`, 3 categorias).
*   **Diagnosis_Stage**: Estágio do câncer oral (`object`, 3 categorias: Moderate, Early, Late).
*   **Treatment_Type**: Tipo de tratamento (`object`, 5 categorias).
*   **Survival_Rate**: Sobrevida (`float64`, intervalo [0,30, 0,90], média ~0,60).
*   **HPV_Related**: Relação com HPV (`int64`, binário 0/1, prevalência de ~29,8%).

### 2.2 Estatísticas Descritivas (Colunas Numéricas)
| Métrica | Age | Survival_Rate | Tobacco_Use | Alcohol_Use | HPV_Related |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Média** | 46,56 | 0,60 | 0,60 | 0,50 | 0,30 |
| **Desvio Padrão** | 20,59 | 0,17 | 0,49 | 0,50 | 0,46 |
| **Mínimo** | 20,00 | 0,30 | 0,00 | 0,00 | 0,00 |
| **Mediana (50%)** | 39,00 | 0,60 | 1,00 | 0,00 | 0,00 |
| **Máximo** | 89,00 | 0,90 | 1,00 | 1,00 | 1,00 |

### 2.3 Distribuição do Estágio Clínico (`Diagnosis_Stage`)
*   **Moderate**: 63.939 registros (39,89%)
*   **Early**: 48.287 registros (30,12%)
*   **Late**: 48.066 registros (29,99%)
*   *A distribuição entre as classes é aproximadamente uniforme (40/30/30).*

---

## 🎯 3. Auditoria do Target (Tarefa 2)

O target padrão do projeto, `high_risk`, é definido como a presença de estágio Moderado ou Avançado (`Diagnosis_Stage ∈ {Moderate, Late}`). Investigamos o balanceamento e poder discriminativo de três targets alternativos:

1.  **`high_risk` (Moderate/Late)**: Class 1 (69,88%), Class 0 (30,12%).
2.  **`target_late` (Late apenas)**: Class 1 (29,99%), Class 0 (70,01%).
3.  **`target_early` (Early apenas)**: Class 1 (30,12%), Class 0 (69,88%).

Embora a distribuição das classes de todos os três seja razoável para modelagem supervisionada clássica (sem desbalanceamentos extremos que justifiquem colapso), as métricas de benchmark demonstram que as features não possuem poder discriminativo para nenhum deles.

---

## 🏁 4. Benchmark de Modelos (Tarefa 3)

Realizou-se um benchmark síncrono sob validação cruzada estratificada em 5 partições (`Stratified 5-Fold CV`) sobre uma amostra representativa de 20.000 registros:

### 4.1 Target: `high_risk` (Moderate/Late)
*   **Dummy Classifier**: ROC-AUC = 0,4991 ± 0,0080 · F1 = 0,6968
*   **Logistic Regression**: ROC-AUC = 0,5111 ± 0,0083 · F1 = 0,8207
*   **Random Forest**: ROC-AUC = 0,4947 ± 0,0082 · F1 = 0,7763
*   **Gradient Boosting**: ROC-AUC = 0,5025 ± 0,0057 · F1 = 0,8203

### 4.2 Target: `target_late` (Late apenas)
*   **Dummy Classifier**: ROC-AUC = 0,4959 ± 0,0080
*   **Logistic Regression**: ROC-AUC = 0,5062 ± 0,0064
*   **Random Forest**: ROC-AUC = 0,4943 ± 0,0052
*   **Gradient Boosting**: ROC-AUC = 0,5035 ± 0,0048

### 4.3 Target: `target_early` (Early apenas)
*   **Dummy Classifier**: ROC-AUC = 0,4991 ± 0,0080
*   **Logistic Regression**: ROC-AUC = 0,5111 ± 0,0083
*   **Random Forest**: ROC-AUC = 0,4947 ± 0,0082
*   **Gradient Boosting**: ROC-AUC = 0,5024 ± 0,0058

### ⚠️ Conclusão do Benchmark
Nenhum classificador linear ou baseado em árvores supera o limiar de acerto aleatório. A Regressão Logística e o Gradient Boosting no target padrão reportam um F1-Score aparentemente alto (~0,82) apenas porque colapsam no classificador trivial: predizem a classe majoritária (1) para absolutamente todas as amostras, obtendo recall 1,00 "de graça" (visto que 70% das amostras pertencem à classe 1).

---

## 🔍 5. Análise de Sinal e Correlação (Tarefa 4)

Mediu-se a associação estatística das features com o target binário:

1.  **Informação Mútua (Mutual Information):** Todas as colunas reportam valores extremamente baixos (< 0,008 nats), sinalizando independência total.
2.  **Importância por Permutação (Permutation Importance):** Quando avaliado em conjuntos de validação independentes, a perturbação de qualquer atributo (incluindo idade e sobrevida) gera impacto nulo ou ligeiramente negativo na performance do classificador, indicando que nenhuma feature possui informação generalizável.
3.  **Importância do Random Forest (Impurity-based):** A sobrevida (`Survival_Rate`) e a idade (`Age`) aparecem artificialmente no topo das atribuições do Random Forest porque variáveis contínuas com alta cardinalidade oferecem mais pontos de corte e criam overfitting local em dados sintéticos aleatórios, sem correlação real fora do conjunto de treino.

---

## 🧪 6. Experimentos de Ablação (Tarefa 5)

Os experimentos de ablação confirmam que a exclusão ou isolamento de grupos específicos de atributos não altera o comportamento do modelo:
*   A remoção de `Survival_Rate` mantém o ROC-AUC médio da Regressão Logística em **0,5115** e do Random Forest em **0,4953**.
*   Modelos treinados apenas com atributos comportamentais (`Tobacco_Use` + `Alcohol_Use`) ou apenas com demográficos (`Age`, `Country`, `Gender`, `Socioeconomic_Status`) retornam ROC-AUC estatisticamente idêntico a **0,50**.

---

## 🚿 7. Verificação de Vazamento e Causalidade (Tarefa 6)

Realizou-se a auditoria manual de causalidade clínica e lógica temporal:

*   **Vazamento de Tratamento (`Treatment_Type`):** Em um cenário de saúde real, o tipo de tratamento (cirurgia, radioterapia, paliativo) é consequência direta do estágio de diagnóstico. A tabela de contingência cruzada revela que as cinco categorias de tratamento distribuem-se exatamente nas mesmas proporções para os três estágios clínicos (Ex: ~30% Early, ~40% Moderate, ~30% Late para quimioterapia, paliativo e cirurgia). Isso confirma que as colunas foram sintetizadas de forma independente, destruindo a causalidade clínica esperada no mundo real.
*   **Vazamento de Sobrevida (`Survival_Rate`):** A taxa de sobrevida deveria se comportar como uma variável pós-diagnóstico associada ao estágio (estágios avançados têm menor sobrevida). No entanto, o coeficiente de correlação linear de Pearson de `Survival_Rate` com `stage_num` (estágio mapeado de 0 a 2) é de **0,0030** (praticamente zero).
*   **Conclusão sobre Causalidade:** As features de vazamento clássicas (`Treatment_Type`, `Survival_Rate`) foram geradas sem correlação com o target, de forma que retirá-las ou mantê-las não altera as métricas da modelagem.

---

## 💡 8. Decisão Técnica Recomendada e Plano de Ações (Tarefa 7 & 8)

### 8.1 Nível A (Ajustes sem novos dados)
Recomenda-se **manter a arquitetura MLP** e a estrutura do pipeline de MLOps intactas, **recusando qualquer tuning artificial** ou redefinição de target/features. A performance de 0,50 reflete a integridade estatística e metodológica do projeto frente a um dataset sintético desprovido de sinal. O modelo deve continuar a ser posicionado estritamente como um **benchmark de engenharia de software clínica** e MLOps.

### 8.2 Nível B (Nova engenharia de atributos)
Criar interações (como `risk_index` que já está implementado) ou novos agrupamentos não surtirá efeito preditivo real, pois nenhuma das variáveis de origem possui sinal. Qualquer elevação local de métricas sob este dataset é espúria (overfitting).

### 8.3 Nível C (Melhorias que exigem novos dados)
Para evoluir o Aether Oncology em direção a um classificador clínico com poder preditivo real, é obrigatório substituir o dataset sintético atual por dados clínicos reais e rotulados que contenham:
1.  **Sintomatologia clínica detalhada** (presença de lesões leucoplásicas/eritroplásicas, sangramento inexplicável, dor local, disfagia).
2.  **Dados de biópsia e histopatologia** (grau de diferenciação celular, margens cirúrgicas).
3.  **Biomarcadores moleculares e genômicos** (expressão de p16/HPV, mutações TP53).
4.  **Linhas de tempo clínico consistentes**, onde o diagnóstico precede a escolha terapêutica e a taxa de sobrevida decorre diretamente do estágio e tratamento aplicados.

---

## 🔮 9. Conclusão Honesta

> **“O dataset atual não sustenta um modelo clínico discriminativo.”**
