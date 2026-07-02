"""
scripts/diagnose_features.py
============================
Honest feature-signal diagnosis for the oral-cancer datasets.

Default usage keeps the legacy v1 audit:
    python -m scripts.diagnose_features

Sprint 3 usage:
    python -m scripts.diagnose_features --dataset data/raw/oral_cancer_prediction.csv
"""

from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd
from scipy.stats import chi2_contingency, pointbiserialr
from sklearn.feature_selection import mutual_info_classif
from sklearn.preprocessing import LabelEncoder

RAW_PATH = Path("data/raw/oral_cancer_top30.csv")
SEED = 42
SIGNAL_THRESHOLD = 0.005

LEGACY_TARGET = "Diagnosis_Stage"
SPRINT3_TARGET = "Oral_Cancer"

LEGACY_TIER1 = [
    "Country",
    "Gender",
    "Age",
    "Tobacco_Use",
    "Alcohol_Use",
    "Socioeconomic_Status",
    "HPV_Related",
]
LEGACY_TIER3 = ["Diagnosis_Stage", "Treatment_Type", "Survival_Rate"]

SPRINT3_TIER1 = [
    "Age",
    "Gender",
    "Country",
    "Tobacco_Use",
    "Alcohol_Use",
    "HPV_Infection",
    "Betel_Quid_Use",
    "Chronic_Sun_Exposure",
    "Poor_Oral_Hygiene",
    "Family_History_of_Cancer",
    "Compromised_Immune_System",
    "Diet",
]
SPRINT3_TIER2 = [
    "Oral_Lesions",
    "Unexplained_Bleeding",
    "Difficulty_Swallowing",
    "White_or_Red_Patches_in_Mouth",
]
SPRINT3_TIER3 = [
    "Tumor_Size_cm",
    "Cancer_Stage",
    "Treatment_Type",
    "Survival_Rate",
    "Cost_of_Treatment",
    "Economic_Burden",
    "Early_Diagnosis",
]
DROP = ["ID"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dataset",
        default=str(RAW_PATH),
        help="CSV path to diagnose. Defaults to the legacy top30 dataset.",
    )
    return parser.parse_args()


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out.columns = (
        out.columns.str.strip()
        .str.replace(r"[\s\(\)&/]", "_", regex=True)
        .str.replace(r"_+", "_", regex=True)
        .str.rstrip("_")
    )
    return out


def encode_yes_no(series: pd.Series) -> pd.Series:
    y = (
        series.astype(str)
        .str.strip()
        .str.lower()
        .map({"yes": 1, "no": 0, "1": 1, "0": 0, "true": 1, "false": 0})
    )
    if y.isna().any():
        raise ValueError(f"Invalid values in `{SPRINT3_TARGET}`: {series.unique()}")
    return y.astype(int)


def prepare_target(df: pd.DataFrame) -> tuple[pd.Series, dict[str, list[str] | str]]:
    if SPRINT3_TARGET in df.columns:
        y = encode_yes_no(df[SPRINT3_TARGET])
        tiers: dict[str, list[str] | str] = {
            "target_name": SPRINT3_TARGET,
            "target_label": "Oral_Cancer",
            "tier1": [c for c in SPRINT3_TIER1 if c in df.columns],
            "tier2": [c for c in SPRINT3_TIER2 if c in df.columns],
            "tier3": [c for c in SPRINT3_TIER3 if c in df.columns],
        }
        return y, tiers

    if LEGACY_TARGET not in df.columns:
        raise ValueError(
            f"Dataset must contain `{SPRINT3_TARGET}` or `{LEGACY_TARGET}`."
        )

    y = df[LEGACY_TARGET].isin(["Moderate", "Late"]).astype(int)
    tiers = {
        "target_name": LEGACY_TARGET,
        "target_label": "high_risk",
        "tier1": [c for c in LEGACY_TIER1 if c in df.columns],
        "tier2": [],
        "tier3": [c for c in LEGACY_TIER3 if c in df.columns],
    }
    return y, tiers


def feature_tier(feature: str, tiers: dict[str, list[str] | str]) -> str:
    if feature in tiers["tier3"]:
        return "TIER3"
    if feature in tiers["tier2"]:
        return "TIER2"
    if feature in tiers["tier1"]:
        return "TIER1"
    return "?"


def compute_mutual_information(
    df: pd.DataFrame,
    y: pd.Series,
    tiers: dict[str, list[str] | str],
) -> pd.DataFrame:
    target_name = str(tiers["target_name"])
    feature_cols = [c for c in df.columns if c not in DROP + [target_name]]
    X = df[feature_cols].copy()

    cat_cols = X.select_dtypes(include=["object", "category", "bool"]).columns.tolist()
    X_enc = X.copy()
    for column in cat_cols:
        X_enc[column] = LabelEncoder().fit_transform(X_enc[column].astype(str))

    discrete_mask = [
        column in cat_cols or X_enc[column].dropna().nunique() <= 2
        for column in X_enc.columns
    ]
    mi = mutual_info_classif(
        X_enc.fillna(-1),
        y,
        discrete_features=discrete_mask,
        random_state=SEED,
    )
    return (
        pd.DataFrame({"feature": X_enc.columns, "mutual_info": mi})
        .assign(tier=lambda d: d["feature"].apply(lambda f: feature_tier(f, tiers)))
        .sort_values("mutual_info", ascending=False)
        .reset_index(drop=True)
    )


def print_crosstabs(df: pd.DataFrame, y: pd.Series, columns: list[str]) -> None:
    print("\n=== NORMALIZED CROSSTAB  P(target=1 | category) ===")
    df_t = df.assign(_target=y)
    for column in columns:
        if column == "Age" or column not in df_t.columns:
            continue
        if df_t[column].nunique(dropna=False) > 40:
            continue
        ct = pd.crosstab(df_t[column], df_t["_target"], normalize="index")
        print(f"\n--- {column} ---")
        print(ct.to_string())

    if "Age" in df_t.columns:
        df_t["age_bucket"] = pd.cut(df_t["Age"], bins=[0, 30, 45, 60, 75, 120])
        print("\n--- Age (buckets) ---")
        print(pd.crosstab(df_t["age_bucket"], df_t["_target"], normalize="index"))


def print_independence_tests(df: pd.DataFrame, y: pd.Series, columns: list[str]) -> None:
    print("\n=== INDEPENDENCE TESTS (H0: feature independent from target) ===")
    for column in columns:
        if column == "Age" or column not in df.columns:
            continue
        if df[column].nunique(dropna=False) > 40:
            continue
        p_value = chi2_contingency(pd.crosstab(df[column], y))[1]
        flag = "signal" if p_value < 0.05 else "noise"
        print(f"  {column:34s} chi2 p={p_value:.4f}  -> {flag}")

    if "Age" in df.columns:
        r_value, p_age = pointbiserialr(df["Age"], y)
        flag = "signal" if p_age < 0.05 else "noise"
        print(f"  {'Age':34s} point-biserial r={r_value:+.5f} p={p_age:.4f} -> {flag}")


def main() -> None:
    args = parse_args()
    dataset_path = Path(args.dataset)
    df = normalize_columns(pd.read_csv(dataset_path))
    y, tiers = prepare_target(df)

    tier1 = list(tiers["tier1"])
    tier2 = list(tiers["tier2"])
    tier3 = list(tiers["tier3"])

    print(f"[data] {dataset_path}  shape={df.shape}")
    print("\n=== ALL COLUMNS ===")
    print(list(df.columns))
    print(f"\n[target] {tiers['target_label']} prevalence = {y.mean():.4f}")

    print("\n=== FEATURE TIERS ===")
    print(f"TIER 1 (risk factors): {tier1}")
    print(f"TIER 2 (clinical symptoms): {tier2 or 'ABSENT'}")
    print(f"TIER 3 (leakage, never predictors): {tier3}")

    ranking = compute_mutual_information(df, y, tiers)
    print("\n=== FEATURE RANKING (mutual_info_classif) ===")
    print(ranking.to_string(index=False))

    signal_columns = tier1 + tier2
    print_crosstabs(df, y, signal_columns)
    print_independence_tests(df, y, signal_columns)

    print("\n=== CONCLUSION ===")
    allowed_ranking = ranking[ranking["tier"].isin(["TIER1", "TIER2"])]
    leakage_ranking = ranking[ranking["tier"] == "TIER3"]
    print(f"Highest MI among TIER 1/2: {allowed_ranking['mutual_info'].max():.6f}")
    if not leakage_ranking.empty:
        print(f"Highest MI among TIER 3: {leakage_ranking['mutual_info'].max():.6f}")

    signal = allowed_ranking[allowed_ranking["mutual_info"] > SIGNAL_THRESHOLD]
    if signal.empty:
        print(
            f"\n>>> No TIER 1/2 feature exceeded MI > {SIGNAL_THRESHOLD}. "
            "Expect a weak/null benchmark."
        )
    else:
        print(f"\n>>> TIER 1/2 features above MI > {SIGNAL_THRESHOLD}:")
        print(signal.to_string(index=False))


if __name__ == "__main__":
    main()
