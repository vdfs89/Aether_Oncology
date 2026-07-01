"""
scripts/diagnose_features.py
============================
PASSO 1 — DIAGNÓSTICO HONESTO de sinal preditivo.

Carrega o dataset bruto oficial (data/raw/oral_cancer_top30.csv), lista todas as
colunas, deriva o target `high_risk` (Diagnosis_Stage ∈ {Moderate, Late}) e mede,
SEM treinar modelo nenhum:

  - mutual_info_classif para TODAS as features (numéricas + categóricas codificadas);
  - crosstab normalizado (P(target=1 | categoria)) para cada categórica.

Conclui se existe ALGUMA feature com sinal real sobre o alvo.

Uso:
    python -m scripts.diagnose_features
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd
from scipy.stats import chi2_contingency, pointbiserialr
from sklearn.feature_selection import mutual_info_classif
from sklearn.preprocessing import LabelEncoder

RAW_PATH = Path("data/raw/oral_cancer_top30.csv")
SEED = 42

# Classificação das colunas segundo o objetivo (PASSO 2)
TIER1 = [
    "Country",
    "Gender",
    "Age",
    "Tobacco_Use",
    "Alcohol_Use",
    "Socioeconomic_Status",
    "HPV_Related",
]
TIER3 = ["Diagnosis_Stage", "Treatment_Type", "Survival_Rate"]
DROP = ["ID"]


def main() -> None:
    df = pd.read_csv(RAW_PATH)
    print(f"[data] {RAW_PATH}  shape={df.shape}")
    print("\n=== TODAS AS COLUNAS ===")
    print(list(df.columns))

    # Target oficial do projeto
    y = df["Diagnosis_Stage"].isin(["Moderate", "Late"]).astype(int).values
    print(f"\n[target] high_risk prevalence = {y.mean():.4f}")

    # Tier mapping report
    print("\n=== CATEGORIZAÇÃO (PASSO 2) ===")
    print(f"TIER 1 (fatores de risco, presentes no dataset): {TIER1}")
    print(
        "TIER 2 (sintomas clínicos): AUSENTES neste dataset "
        "(sem oral_lesions, bleeding, white/red patches, swallowing)"
    )
    print(f"TIER 3 (vazamento, NUNCA usar como preditor): {TIER3}")

    # ---- mutual information sobre TODAS as colunas (exceto ID) ----
    feature_cols = [c for c in df.columns if c not in DROP + ["Diagnosis_Stage"]]
    X = df[feature_cols].copy()

    cat_cols = X.select_dtypes(include=["object", "category"]).columns.tolist()
    X_enc = X.copy()
    for c in cat_cols:
        X_enc[c] = LabelEncoder().fit_transform(X_enc[c].astype(str))
    discrete_mask = [
        c in cat_cols or X_enc[c].dropna().nunique() <= 2 for c in X_enc.columns
    ]

    mi = mutual_info_classif(
        X_enc.fillna(-1), y, discrete_features=discrete_mask, random_state=SEED
    )
    ranking = (
        pd.DataFrame({"feature": X_enc.columns, "mutual_info": mi})
        .assign(
            tier=lambda d: d["feature"].apply(
                lambda f: "TIER3" if f in TIER3 else ("TIER1" if f in TIER1 else "?")
            )
        )
        .sort_values("mutual_info", ascending=False)
        .reset_index(drop=True)
    )
    print("\n=== RANKING DE IMPORTÂNCIA (mutual_info_classif) ===")
    print(ranking.to_string(index=False))

    # ---- crosstab normalizado para cada categórica / binária ----
    print("\n=== CROSSTAB NORMALIZADO  P(high_risk | categoria) ===")
    df_t = df.assign(high_risk=y)
    for c in TIER1:
        if c == "Age":
            continue
        ct = pd.crosstab(df_t[c], df_t["high_risk"], normalize="index")
        print(f"\n--- {c} ---")
        print(ct.to_string())

    # Age em buckets
    df_t["age_bucket"] = pd.cut(df_t["Age"], bins=[0, 30, 45, 60, 75, 120])
    print("\n--- Age (buckets) ---")
    print(
        pd.crosstab(
            df_t["age_bucket"], df_t["high_risk"], normalize="index"
        ).to_string()
    )

    # ---- teste estatístico de independência (H0: feature ⟂ target) ----
    print("\n=== TESTE DE INDEPENDÊNCIA (H0: feature independente do target) ===")
    for c in [
        "Country",
        "Gender",
        "Tobacco_Use",
        "Alcohol_Use",
        "Socioeconomic_Status",
        "HPV_Related",
    ]:
        p = chi2_contingency(pd.crosstab(df[c], y))[1]
        flag = "sinal" if p < 0.05 else "ruido"
        print(f"  {c:22s} chi2 p={p:.4f}  -> {flag}")
    r, p_age = pointbiserialr(df["Age"], y)
    print(
        f"  {'Age':22s} point-biserial r={r:+.5f} p={p_age:.4f}  "
        f"-> {'sinal' if p_age < 0.05 else 'ruido'}"
    )

    # ---- conclusão ----
    SIGNAL_THRESHOLD = 0.005  # MI nats; abaixo disso => ruído
    tier1_ranking = ranking[ranking["tier"] == "TIER1"]
    signal = tier1_ranking[tier1_ranking["mutual_info"] > SIGNAL_THRESHOLD]
    print("\n=== CONCLUSÃO PASSO 1 ===")
    print(f"Maior MI entre TIER 1: {tier1_ranking['mutual_info'].max():.6f}")
    print(
        f"Maior MI entre TIER 3 (vazamento): "
        f"{ranking[ranking['tier'] == 'TIER3']['mutual_info'].max():.6f}"
    )
    if signal.empty:
        print(
            f"\n>>> NENHUMA feature TIER 1 com MI > {SIGNAL_THRESHOLD}. "
            "Sinal de fator de risco AUSENTE — null result se mantém."
        )
    else:
        print("\n>>> Features TIER 1 com sinal acima do limiar:")
        print(signal.to_string(index=False))


if __name__ == "__main__":
    main()
