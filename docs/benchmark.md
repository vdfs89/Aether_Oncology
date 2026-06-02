# Benchmark — Poder Preditivo do MLP vs. Baselines

> Gerado por [`src/benchmark.py`](../src/benchmark.py). Reprodutível (seed=42),
> validação `StratifiedKFold(k=5)` aplicada a **todos** os modelos (inclusive o MLP),
> sobre o dataset oficial `data/raw/oral_cancer_top30.csv` (prevalência de alto risco = 69.88%).

## Pergunta

O MLP tem **vantagem preditiva real** sobre baselines triviais, ou as métricas altas
são **artefato** do dataset sintético e do **vazamento** (`treatment_type`, `survival_rate`)?

## Métrica

Contexto de **rastreio**: o Falso Negativo (deixar passar um caso avançado) é o erro caro.
Métricas principais: **Recall** e **PR-AUC**. Secundárias: ROC-AUC, F1, Precision, Accuracy.
Custo modelado: FN = 10 × FP.

## Resultados — COM vazamento (pipeline oficial de produção)

| Modelo | recall | pr_auc | roc_auc | f1 | precision | accuracy |
| --- | --- | --- | --- | --- | --- | --- |
| Dummy (most_frequent) | 1.0000 ± 0.0000 | 0.6988 ± 0.0000 | 0.5000 ± 0.0000 | 0.8227 ± 0.0000 | 0.6988 ± 0.0000 | 0.6988 ± 0.0000 |
| Dummy (stratified) | 0.7000 ± 0.0024 | 0.6983 ± 0.0017 | 0.4988 ± 0.0039 | 0.6990 ± 0.0024 | 0.6981 ± 0.0024 | 0.5788 ± 0.0033 |
| LogisticRegression | 1.0000 ± 0.0000 | 0.7004 ± 0.0016 | 0.5021 ± 0.0020 | 0.8227 ± 0.0000 | 0.6988 ± 0.0000 | 0.6988 ± 0.0000 |
| RandomForest | 0.8857 ± 0.0042 | 0.6984 ± 0.0025 | 0.4995 ± 0.0029 | 0.7811 ± 0.0015 | 0.6986 ± 0.0005 | 0.6531 ± 0.0016 |
| MLP (PyTorch) | 0.4457 ± 0.0819 | 0.7006 ± 0.0018 | 0.5022 ± 0.0019 | 0.5408 ± 0.0560 | 0.7011 ± 0.0024 | 0.4797 ± 0.0314 |

**Teste estatístico** (MLP vs `LogisticRegression`, pr_auc):
diferença média = +0.0002, paired t p = 0.7901,
Wilcoxon p = 1 →
**dentro do ruído** a 0.05.

Custo FP/FN (out-of-fold):

| model | cost@0.5 | recall@0.5 | opt_threshold | cost@opt | recall@opt | FN@opt | FP@opt |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dummy (most_frequent) | 0.3012 | 1.0 | 0.5 | 0.3012 | 1.0 | 0 | 48287 |
| Dummy (stratified) | 2.3078 | 0.7 | 0.5 | 2.3078 | 0.7 | 33600 | 33915 |
| LogisticRegression | 0.3012 | 1.0 | 0.5 | 0.3012 | 1.0 | 0 | 48287 |
| RandomForest | 1.0312 | 0.8909 | 0.01 | 0.3012 | 1.0 | 0 | 48287 |
| MLP (PyTorch) | 4.0062 | 0.4457 | 0.01 | 0.3012 | 1.0 | 0 | 48287 |

## Resultados — SEM vazamento (controle anti-vazamento)

| Modelo | recall | pr_auc | roc_auc | f1 | precision | accuracy |
| --- | --- | --- | --- | --- | --- | --- |
| Dummy (most_frequent) | 1.0000 ± 0.0000 | 0.6988 ± 0.0000 | 0.5000 ± 0.0000 | 0.8227 ± 0.0000 | 0.6988 ± 0.0000 | 0.6988 ± 0.0000 |
| Dummy (stratified) | 0.7000 ± 0.0024 | 0.6983 ± 0.0017 | 0.4988 ± 0.0039 | 0.6990 ± 0.0024 | 0.6981 ± 0.0024 | 0.5788 ± 0.0033 |
| LogisticRegression | 1.0000 ± 0.0000 | 0.7005 ± 0.0018 | 0.5020 ± 0.0025 | 0.8227 ± 0.0000 | 0.6988 ± 0.0000 | 0.6988 ± 0.0000 |
| RandomForest | 0.7830 ± 0.0011 | 0.6995 ± 0.0010 | 0.5017 ± 0.0013 | 0.7382 ± 0.0004 | 0.6983 ± 0.0004 | 0.6120 ± 0.0005 |
| MLP (PyTorch) | 0.3983 ± 0.1401 | 0.6982 ± 0.0018 | 0.4988 ± 0.0021 | 0.4925 ± 0.1134 | 0.6979 ± 0.0023 | 0.4588 ± 0.0549 |

**Teste estatístico** (MLP vs `LogisticRegression`, pr_auc):
diferença média = -0.0022, paired t p = 0.2133,
Wilcoxon p = 0.1875 →
**dentro do ruído** a 0.05.

Custo FP/FN (out-of-fold):

| model | cost@0.5 | recall@0.5 | opt_threshold | cost@opt | recall@opt | FN@opt | FP@opt |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dummy (most_frequent) | 0.3012 | 1.0 | 0.5 | 0.3012 | 1.0 | 0 | 48287 |
| Dummy (stratified) | 2.3078 | 0.7 | 0.5 | 2.3078 | 0.7 | 33600 | 33915 |
| LogisticRegression | 0.3012 | 1.0 | 0.5 | 0.3012 | 1.0 | 0 | 48287 |
| RandomForest | 1.7524 | 0.783 | 0.01 | 0.3054 | 0.9994 | 70 | 48257 |
| MLP (PyTorch) | 4.3254 | 0.3983 | 0.01 | 0.3012 | 1.0 | 0 | 48287 |

## Sanity checks anti-artefato

- **ROC-AUC ≈ 0,50 em TODOS os modelos, nas DUAS configs.** Dummy 0,500 · LogReg 0,502 ·
  RF 0,500 · MLP 0,502 (com vazamento) e essencialmente idêntico sem vazamento. ROC-AUC de
  0,50 é **moeda ao ar**: nenhum modelo distingue alto de baixo risco.
- **PR-AUC ≈ 0,699 = a prevalência (0,6988).** Esse é o **piso "no-skill"** da PR-AUC (um
  classificador sem habilidade pontua exatamente a prevalência). Logo, "PR-AUC 0,70" aqui
  **não é desempenho** — é o chão.
- **Impacto do vazamento (controle):** PR-AUC do MLP 0,7006 (com) → 0,6982 (sem) = Δ ≈ **−0,002**;
  ROC-AUC 0,5022 → 0,4988. As features de vazamento **nem sequer inflam** as métricas — porque
  não há sinal algum para inflar. A hipótese de **separabilidade trivial (~0,99) é REFUTADA**:
  o problema deste dataset não é ser fácil demais, é ser **ruído** em relação às features.
- **MLP vs Dummy:** PR-AUC 0,7006 vs 0,6988 — diferença dentro do ruído (`p=0,79`). O MLP
  **não supera** a taxa-base.

## Interpretação honesta

**O MLP vence? Não.** Diferença de PR-AUC vs. o melhor baseline = **+0,0002** (com vazamento,
`paired t p=0,79`) e **−0,0022** (sem vazamento, `p=0,21`). Em ambos os casos **dentro do ruído** —
estatisticamente indistinguível de uma Regressão Logística e de um Dummy.

**É significativo? Não.** Nenhum teste pareado (t ou Wilcoxon) rejeita a hipótese nula a 0,05.
Pior: no limiar padrão 0,5 o MLP é o **pior** modelo em recall (0,45 com / 0,40 sem) e em custo
(4,0 vs 0,30) — ele está mal-limiarizado, enquanto LogReg/Dummy obtêm recall 1,0 "de graça"
simplesmente prevendo positivo para todos (a prevalência é 70%).

**O quanto é artefato do dado?** Quase tudo. ROC-AUC ≈ 0,50 universal e a ausência de impacto
do vazamento mostram que `high_risk` é **aproximadamente independente** das features disponíveis
neste dataset sintético. Não há relação aprendível — nem trivial, nem genuína. Qualquer métrica
"alta" reportada anteriormente (ex.: "Recall ≈ 97%") só é atingível pela regra **degenerada**
"prever positivo para todos", que os baselines triviais reproduzem sem nenhum modelo.

**Análise de custo (FN = 10 × FP).** Como não há sinal e o FN é caro, a política ótima de
*todos* os modelos colapsa para **"sinalizar todo mundo para revisão"** (limiar → 0,01, recall 1,0,
FN 0, custo 0,3012). A Regressão Logística já faz isso no limiar 0,5. O MLP só alcança o mesmo
custo **depois** de re-limiarizar agressivamente — sem nenhuma vantagem sobre a regra de uma linha.

**Qual modelo eu recomendaria e por quê.**

1. **Para "predição" neste dataset: nenhum.** Sob FN ≫ FP, a regra trivial *flag-all* (ou a
   Regressão Logística, que colapsa nela) é **Pareto-ótima** e iguala o melhor custo de qualquer
   modelo. O MLP adiciona parâmetros, treino, calibração e custo computacional para **zero ganho
   mensurável** — é a escolha errada por navalha de Occam.
2. **Se for obrigatório citar um classificador:** **Regressão Logística** — interpretável,
   barata, e estatisticamente equivalente ao MLP aqui.
3. **Enquadramento do projeto:** apresentar o MLP/pipeline como **demonstração de engenharia de
   MLOps** (validação estratificada, calibração, fairness, lineage, API), **não** como evidência
   de poder preditivo. Para qualquer afirmação de desempenho, é necessário **recoletar dados
   clínicos reais** — este dataset sintético não sustenta nenhuma alegação preditiva.

> **Conclusão de uma linha:** as métricas altas eram **artefato** (prevalência + limiar
> degenerado), não capacidade. O MLP não tem vantagem real, significativa ou prática sobre uma
> regra trivial neste dataset.

---
*Aether Oncology — benchmark de engenharia. Resultados sobre dataset sintético; sem validade clínica.*
