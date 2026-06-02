# ruff: noqa: E402
"""
src/benchmark.py
================
Aether Oncology — Benchmark reprodutível de poder preditivo.

Responde objetivamente: o MLP tem vantagem preditiva REAL sobre baselines, ou as
métricas altas são artefato do dataset sintético?

Fluxo: métrica → pipeline replicável → modelos → validação estratificada (k=5,
aplicada TAMBÉM ao MLP) → teste estatístico pareado → análise de custo FP/FN →
sanity checks anti-artefato (vs Dummy, separabilidade trivial, controle de
vazamento treatment_type/survival_rate) → recomendação.

REUTILIZA o pipeline/schema/MLP já existentes no projeto — nada é inventado:
  - Dataset oficial:        data/raw/oral_cancer_top30.csv
  - Target:                 high_risk = Diagnosis_Stage ∈ {Moderate, Late}
  - Pré-processador:        src.ml.pipelines.preprocessing (Extractor + ColumnTransformer)
  - MLP + treino:           src.models.mlp.MLP / src.train.train_mlp (early stopping)

Uso:
    python -m src.benchmark
"""

from __future__ import annotations

import os
import random
import warnings
from pathlib import Path

import numpy as np

# Reprodutibilidade global (antes de qualquer import que use RNG).
SEED = 42
random.seed(SEED)
np.random.seed(SEED)

import mlflow
import pandas as pd
import torch
from scipy import stats
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

torch.manual_seed(SEED)

# Pipeline/MLP reais do projeto -------------------------------------------------
from src.features.preprocessor import TARGET, build_preprocessor
from src.ml.pipelines.preprocessing.preprocessing import ClinicalFeatureExtractor
from src.train import train_mlp

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------
RAW_DATA_PATH = Path("data/raw/oral_cancer_top30.csv")
REPORTS_DIR = Path("reports")
DOCS_DIR = Path("docs")
N_SPLITS = 5

# Conjunto de features cru passado ao pipeline (mesmo do treino oficial).
FEATURE_COLS = [
    "Age",
    "Survival_Rate",
    "Tobacco_Use",
    "Alcohol_Use",
    "Country",
    "Gender",
    "Socioeconomic_Status",
    "Treatment_Type",
    "HPV_Related",
]
# Features de VAZAMENTO (consequência do diagnóstico, não preditores).
LEAKAGE_COLS = ["Survival_Rate", "Treatment_Type"]

# Matriz de custo de rastreio: Falso Negativo >> Falso Positivo.
COST_FN = 10.0
COST_FP = 1.0

METRIC_KEYS = ["recall", "pr_auc", "roc_auc", "f1", "precision", "accuracy"]
PRIMARY_METRIC = "pr_auc"  # contexto de rastreio


# ---------------------------------------------------------------------------
# Pré-processadores: COM e SEM vazamento (reutilizam o ClinicalFeatureExtractor)
# ---------------------------------------------------------------------------
def make_preprocessor(*, include_leakage: bool) -> Pipeline:
    """COM vazamento → pipeline oficial. SEM → remove Survival_Rate/Treatment_Type."""
    if include_leakage:
        return build_preprocessor()

    # Variante sem vazamento: mesmo extractor, ColumnTransformer sem as colunas-alvo.
    col_transformer = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), ["Age", "risk_index"]),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                ["Country", "Gender", "Socioeconomic_Status", "age_bucket"],
            ),
            (
                "pass",
                "passthrough",
                ["high_incidence_country", "Tobacco_Use", "Alcohol_Use"],
            ),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )
    return Pipeline(
        [("extractor", ClinicalFeatureExtractor()), ("preprocessor", col_transformer)]
    )


# ---------------------------------------------------------------------------
# Métricas
# ---------------------------------------------------------------------------
def compute_metrics(
    y_true: np.ndarray, y_pred: np.ndarray, y_score: np.ndarray
) -> dict[str, float]:
    return {
        "recall": recall_score(y_true, y_pred, zero_division=0),
        "pr_auc": average_precision_score(y_true, y_score),
        "roc_auc": roc_auc_score(y_true, y_score),
        "f1": f1_score(y_true, y_pred, zero_division=0),
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "accuracy": accuracy_score(y_true, y_pred),
    }


# ---------------------------------------------------------------------------
# MLP wrapper — usa a MESMA validação estratificada e o early stopping do projeto
# ---------------------------------------------------------------------------
def fit_predict_mlp(
    X_tr: np.ndarray, y_tr: np.ndarray, X_te: np.ndarray, *, seed: int
) -> np.ndarray:
    """Treina o MLP do projeto num fold (com split interno de val p/ early stopping)
    e devolve probabilidades no conjunto de teste do fold."""
    torch.manual_seed(seed)
    np.random.seed(seed)

    X_tr2, X_val, y_tr2, y_val = train_test_split(
        X_tr, y_tr, test_size=0.15, stratify=y_tr, random_state=seed
    )
    model = train_mlp(
        X_train=X_tr2,
        y_train=y_tr2,
        X_val=X_val,
        y_val=y_val,
        input_dim=X_tr.shape[1],
    )
    model.eval()
    with torch.no_grad():
        logits = model(torch.FloatTensor(X_te))
        probs = torch.sigmoid(logits).squeeze().numpy()
    return probs


def make_sklearn_models() -> dict:
    """Instâncias frescas dos baselines sklearn (seed fixa)."""
    return {
        "Dummy (most_frequent)": DummyClassifier(strategy="most_frequent"),
        "Dummy (stratified)": DummyClassifier(strategy="stratified", random_state=SEED),
        "LogisticRegression": LogisticRegression(max_iter=1000, random_state=SEED),
        "RandomForest": RandomForestClassifier(
            n_estimators=200, n_jobs=-1, random_state=SEED
        ),
    }


MLP_NAME = "MLP (PyTorch)"
ALL_MODELS = [*make_sklearn_models().keys(), MLP_NAME]


# ---------------------------------------------------------------------------
# Validação cruzada estratificada (k=5) — aplicada a TODOS os modelos
# ---------------------------------------------------------------------------
def run_cv(
    X: pd.DataFrame, y: np.ndarray, *, include_leakage: bool
) -> tuple[dict, dict]:
    """Retorna (per_fold_metrics, oof_scores).

    per_fold_metrics[model] -> list[dict] (uma entrada por fold)
    oof_scores[model]       -> np.ndarray (probabilidade out-of-fold por amostra)
    """
    skf = StratifiedKFold(n_splits=N_SPLITS, shuffle=True, random_state=SEED)
    per_fold: dict[str, list[dict]] = {m: [] for m in ALL_MODELS}
    oof: dict[str, np.ndarray] = {m: np.full(len(y), np.nan) for m in ALL_MODELS}

    for fold, (tr_idx, te_idx) in enumerate(skf.split(X, y)):
        pre = make_preprocessor(include_leakage=include_leakage)
        X_tr = pre.fit_transform(X.iloc[tr_idx])
        X_te = pre.transform(X.iloc[te_idx])
        y_tr, y_te = y[tr_idx], y[te_idx]

        # --- baselines sklearn ---
        for name, model in make_sklearn_models().items():
            model.fit(X_tr, y_tr)
            y_pred = model.predict(X_te)
            proba = model.predict_proba(X_te)
            y_score = proba[:, 1] if proba.shape[1] > 1 else proba[:, 0]
            per_fold[name].append(compute_metrics(y_te, y_pred, y_score))
            oof[name][te_idx] = y_score

        # --- MLP (mesma CV estratificada) ---
        mlp_score = fit_predict_mlp(X_tr, y_tr, X_te, seed=SEED + fold)
        mlp_pred = (mlp_score >= 0.5).astype(int)
        per_fold[MLP_NAME].append(compute_metrics(y_te, mlp_pred, mlp_score))
        oof[MLP_NAME][te_idx] = mlp_score

        print(
            f"  [fold {fold + 1}/{N_SPLITS}] leak={include_leakage}  "
            f"MLP {PRIMARY_METRIC}={per_fold[MLP_NAME][-1][PRIMARY_METRIC]:.4f}  "
            f"RF {PRIMARY_METRIC}={per_fold['RandomForest'][-1][PRIMARY_METRIC]:.4f}",
            flush=True,
        )

    return per_fold, oof


def aggregate(per_fold: dict) -> pd.DataFrame:
    """média ± desvio entre folds, por modelo × métrica."""
    rows = []
    for model, folds in per_fold.items():
        row = {"model": model}
        for k in METRIC_KEYS:
            vals = np.array([f[k] for f in folds])
            row[f"{k}_mean"] = vals.mean()
            row[f"{k}_std"] = vals.std()
        rows.append(row)
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Teste estatístico pareado: MLP vs melhor baseline
# ---------------------------------------------------------------------------
def paired_test(per_fold: dict, baseline: str) -> dict:
    mlp_vals = np.array([f[PRIMARY_METRIC] for f in per_fold[MLP_NAME]])
    base_vals = np.array([f[PRIMARY_METRIC] for f in per_fold[baseline]])
    diff = mlp_vals - base_vals

    t_stat, t_p = stats.ttest_rel(mlp_vals, base_vals)
    # Wilcoxon exige diferenças não-nulas; protege contra empate perfeito.
    try:
        w_stat, w_p = stats.wilcoxon(mlp_vals, base_vals)
    except ValueError:
        w_stat, w_p = np.nan, np.nan

    return {
        "baseline": baseline,
        "metric": PRIMARY_METRIC,
        "mlp_mean": float(mlp_vals.mean()),
        "baseline_mean": float(base_vals.mean()),
        "mean_diff": float(diff.mean()),
        "t_stat": float(t_stat),
        "t_pvalue": float(t_p),
        "wilcoxon_stat": float(w_stat),
        "wilcoxon_pvalue": float(w_p),
        "significant_0.05": bool(t_p < 0.05),
    }


# ---------------------------------------------------------------------------
# Análise de custo FP vs FN (sobre predições out-of-fold)
# ---------------------------------------------------------------------------
def cost_analysis(y_true: np.ndarray, oof: dict) -> pd.DataFrame:
    rows = []
    thresholds = np.linspace(0.01, 0.99, 99)
    for model, scores in oof.items():
        if np.isnan(scores).any():
            continue
        # limiar padrão
        pred05 = (scores >= 0.5).astype(int)
        fn05 = int(((pred05 == 0) & (y_true == 1)).sum())
        fp05 = int(((pred05 == 1) & (y_true == 0)).sum())
        cost05 = (fn05 * COST_FN + fp05 * COST_FP) / len(y_true)
        rec05 = recall_score(y_true, pred05, zero_division=0)

        # limiar otimizado (mínimo custo esperado — favorece recall pois FN>>FP)
        best_cost, best_t, best_rec, best_fn, best_fp = cost05, 0.5, rec05, fn05, fp05
        for t in thresholds:
            pred = (scores >= t).astype(int)
            fn = int(((pred == 0) & (y_true == 1)).sum())
            fp = int(((pred == 1) & (y_true == 0)).sum())
            cost = (fn * COST_FN + fp * COST_FP) / len(y_true)
            if cost < best_cost:
                best_cost, best_t = cost, t
                best_rec = recall_score(y_true, pred, zero_division=0)
                best_fn, best_fp = fn, fp

        rows.append(
            {
                "model": model,
                "cost@0.5": round(cost05, 4),
                "recall@0.5": round(rec05, 4),
                "opt_threshold": round(best_t, 3),
                "cost@opt": round(best_cost, 4),
                "recall@opt": round(best_rec, 4),
                "FN@opt": best_fn,
                "FP@opt": best_fp,
            }
        )
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Formatação de tabela
# ---------------------------------------------------------------------------
def format_table(agg: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame({"Modelo": agg["model"]})
    for k in METRIC_KEYS:
        out[k] = [
            f"{m:.4f} ± {s:.4f}"
            for m, s in zip(agg[f"{k}_mean"], agg[f"{k}_std"], strict=False)
        ]
    return out


def df_to_markdown(df: pd.DataFrame) -> str:
    cols = list(df.columns)
    head = "| " + " | ".join(cols) + " |"
    sep = "| " + " | ".join(["---"] * len(cols)) + " |"
    body = "\n".join(
        "| " + " | ".join(str(df.iloc[i][c]) for c in cols) + " |"
        for i in range(len(df))
    )
    return "\n".join([head, sep, body])


# ---------------------------------------------------------------------------
# MLflow
# ---------------------------------------------------------------------------
def log_to_mlflow(config: str, agg: pd.DataFrame, per_fold: dict, stat: dict) -> None:
    try:
        uri = os.getenv("MLFLOW_TRACKING_URI", "./mlruns")
        mlflow.set_tracking_uri(uri)
        mlflow.set_experiment("Aether_Oncology_Benchmark")
        for model in agg["model"]:
            with mlflow.start_run(run_name=f"{config}__{model}"):
                mlflow.log_params(
                    {
                        "config": config,
                        "model": model,
                        "n_splits": N_SPLITS,
                        "seed": SEED,
                    }
                )
                # métricas por fold (step = fold)
                for fold, fm in enumerate(per_fold[model]):
                    for k, v in fm.items():
                        mlflow.log_metric(f"fold_{k}", float(v), step=fold)
                # agregadas
                r = agg[agg["model"] == model].iloc[0]
                for k in METRIC_KEYS:
                    mlflow.log_metric(f"{k}_mean", float(r[f"{k}_mean"]))
                    mlflow.log_metric(f"{k}_std", float(r[f"{k}_std"]))
                if model == MLP_NAME:
                    mlflow.log_metrics(
                        {
                            "stat_t_pvalue": stat["t_pvalue"],
                            "stat_mean_diff": stat["mean_diff"],
                        }
                    )
    except Exception as exc:  # noqa: BLE001
        print(f"[mlflow] tracking skipped (non-fatal): {exc}", flush=True)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    REPORTS_DIR.mkdir(exist_ok=True)
    DOCS_DIR.mkdir(exist_ok=True)

    print(f"[seed] {SEED}", flush=True)
    df = pd.read_csv(RAW_DATA_PATH)
    df[TARGET] = df["Diagnosis_Stage"].isin(["Moderate", "Late"]).astype(int)
    df = df.drop_duplicates().reset_index(drop=True)
    X = df[FEATURE_COLS].copy()
    y = df[TARGET].values
    print(
        f"[data] {RAW_DATA_PATH}  shape={df.shape}  "
        f"high_risk prevalence={y.mean():.4f}",
        flush=True,
    )

    results = {}
    for include_leakage in (True, False):
        config = "WITH_leakage" if include_leakage else "NO_leakage"
        print(f"\n=== CONFIG: {config} ===", flush=True)
        per_fold, oof = run_cv(X, y, include_leakage=include_leakage)
        agg = aggregate(per_fold)

        # melhor baseline = maior pr_auc médio entre os não-MLP
        base_only = agg[agg["model"] != MLP_NAME]
        best_baseline = base_only.loc[base_only["pr_auc_mean"].idxmax(), "model"]
        stat = paired_test(per_fold, best_baseline)
        costs = cost_analysis(y, oof)

        results[config] = {
            "agg": agg,
            "stat": stat,
            "costs": costs,
            "table": format_table(agg),
        }
        log_to_mlflow(config, agg, per_fold, stat)

        # CSV por config
        agg.to_csv(REPORTS_DIR / f"benchmark_{config}.csv", index=False)
        costs.to_csv(REPORTS_DIR / f"benchmark_cost_{config}.csv", index=False)

        # impressão
        print(f"\n--- Tabela {config} (média ± desvio, k={N_SPLITS}) ---", flush=True)
        print(results[config]["table"].to_string(index=False), flush=True)
        print(
            f"\n--- Teste estatístico (MLP vs {best_baseline}, {PRIMARY_METRIC}) ---",
            flush=True,
        )
        print(
            f"  mean_diff={stat['mean_diff']:+.4f}  "
            f"paired t p={stat['t_pvalue']:.4g}  "
            f"Wilcoxon p={stat['wilcoxon_pvalue']:.4g}  "
            f"significativo@0.05={stat['significant_0.05']}",
            flush=True,
        )
        print(
            f"\n--- Custo FP/FN (OOF, FN={COST_FN:.0f} : FP={COST_FP:.0f}) ---",
            flush=True,
        )
        print(costs.to_string(index=False), flush=True)

    write_report(results, y)
    print("\n[done] reports/ + docs/benchmark.md gravados.", flush=True)


def write_report(results: dict, y: np.ndarray) -> None:
    """docs/benchmark.md — interpretação honesta."""
    w = results["WITH_leakage"]
    n = results["NO_leakage"]

    def metric_of(agg, model, metric):
        return float(agg[agg["model"] == model][f"{metric}_mean"].iloc[0])

    mlp_pr_w = metric_of(w["agg"], MLP_NAME, "pr_auc")
    mlp_pr_n = metric_of(n["agg"], MLP_NAME, "pr_auc")
    mlp_roc_w = metric_of(w["agg"], MLP_NAME, "roc_auc")
    mlp_roc_n = metric_of(n["agg"], MLP_NAME, "roc_auc")
    dummy_pr = metric_of(n["agg"], "Dummy (most_frequent)", "pr_auc")

    md = f"""# Benchmark — Poder Preditivo do MLP vs. Baselines

> Gerado por [`src/benchmark.py`](../src/benchmark.py). Reprodutível (seed={SEED}),
> validação `StratifiedKFold(k={N_SPLITS})` aplicada a **todos** os modelos (inclusive o MLP),
> sobre o dataset oficial `data/raw/oral_cancer_top30.csv` (prevalência de alto risco = {y.mean():.2%}).

## Pergunta

O MLP tem **vantagem preditiva real** sobre baselines triviais, ou as métricas altas
são **artefato** do dataset sintético e do **vazamento** (`treatment_type`, `survival_rate`)?

## Métrica

Contexto de **rastreio**: o Falso Negativo (deixar passar um caso avançado) é o erro caro.
Métricas principais: **Recall** e **PR-AUC**. Secundárias: ROC-AUC, F1, Precision, Accuracy.
Custo modelado: FN = {COST_FN:.0f} × FP.

## Resultados — COM vazamento (pipeline oficial de produção)

{df_to_markdown(w["table"])}

**Teste estatístico** (MLP vs `{w["stat"]["baseline"]}`, {PRIMARY_METRIC}):
diferença média = {w["stat"]["mean_diff"]:+.4f}, paired t p = {w["stat"]["t_pvalue"]:.4g},
Wilcoxon p = {w["stat"]["wilcoxon_pvalue"]:.4g} →
**{"significativa" if w["stat"]["significant_0.05"] else "dentro do ruído"}** a 0.05.

Custo FP/FN (out-of-fold):

{df_to_markdown(w["costs"])}

## Resultados — SEM vazamento (controle anti-vazamento)

{df_to_markdown(n["table"])}

**Teste estatístico** (MLP vs `{n["stat"]["baseline"]}`, {PRIMARY_METRIC}):
diferença média = {n["stat"]["mean_diff"]:+.4f}, paired t p = {n["stat"]["t_pvalue"]:.4g},
Wilcoxon p = {n["stat"]["wilcoxon_pvalue"]:.4g} →
**{"significativa" if n["stat"]["significant_0.05"] else "dentro do ruído"}** a 0.05.

Custo FP/FN (out-of-fold):

{df_to_markdown(n["costs"])}

## Sanity checks anti-artefato

- **Impacto do vazamento (PR-AUC do MLP):** {mlp_pr_w:.4f} (com) → {mlp_pr_n:.4f} (sem) =
  queda de **{(mlp_pr_w - mlp_pr_n):+.4f}**. ROC-AUC: {mlp_roc_w:.4f} → {mlp_roc_n:.4f}.
  Isso **quantifica** o quanto `treatment_type`/`survival_rate` inflam o desempenho.
- **MLP vs Dummy (sem vazamento):** PR-AUC {mlp_pr_n:.4f} vs taxa-base {dummy_pr:.4f}.
- **Métricas ~0.99:** ver tabelas — qualquer valor próximo de 1.0 deve ser lido como
  provável **separabilidade trivial do dado sintético**, não como excelência do modelo.

## Interpretação honesta

(Preencher após inspecionar os números acima — ver o resumo impresso no console.)

---
*Aether Oncology — benchmark de engenharia. Resultados sobre dataset sintético; sem validade clínica.*
"""
    (DOCS_DIR / "benchmark.md").write_text(md, encoding="utf-8")


if __name__ == "__main__":
    main()
