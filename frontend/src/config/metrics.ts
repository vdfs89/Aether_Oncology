export const METRICS = {
  // Números honestos do benchmark reprodutível (docs/benchmark.md, k=5 CV).
  // O modelo NÃO supera a taxa-base no dataset sintético (sem sinal aprendível).
  hero: [
    { label: "ROC-AUC (CV k=5)", value: "0.50" },
    { label: "Recall @0.5", value: "~0.45" },
    { label: "Registros (sintético)", value: "160", suffix: "K" },
    { label: "Baselines comparados", value: "4" },
  ],
  dataset: [
    { label: "Registros", value: "160K+" },
    { label: "Features Clínicas", value: "11" },
    { label: "Países Base", value: "30" },
  ]
}
