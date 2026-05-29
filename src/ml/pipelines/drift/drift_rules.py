import logging
from typing import Dict, List

import numpy as np
import pandas as pd
from scipy import stats
from scipy.spatial import distance

logger = logging.getLogger("aether.drift")


class ClinicalDriftMonitor:
    """
    Hospital-grade Drift Monitor.
    Calculates Population Stability Index (PSI) for categorical distributions,
    Kolmogorov-Smirnov (KS) test for numerical inputs, and Jensen-Shannon Divergence
    for prediction drift.
    """

    def __init__(self, baseline_df: pd.DataFrame, alpha: float = 0.05):
        self.baseline_df = baseline_df
        self.alpha = alpha
        self.numeric_features = ["Age", "Survival_Rate"]
        self.categorical_features = [
            "Country",
            "Gender",
            "Socioeconomic_Status",
            "Tobacco_Use",
            "Alcohol_Use",
            "Treatment_Type",
        ]

    def calculate_psi(self, baseline: pd.Series, current: pd.Series) -> float:
        """
        Calculates Population Stability Index (PSI) for a categorical feature.
        """
        # Get relative frequencies
        base_counts = baseline.value_counts(normalize=True)
        curr_counts = current.value_counts(normalize=True)

        # Align categories
        all_cats = list(set(base_counts.index).union(set(curr_counts.index)))

        psi_val = 0.0
        for cat in all_cats:
            # Add small epsilon to avoid division by zero or log of zero
            b_prob = base_counts.get(cat, 0.0)
            c_prob = curr_counts.get(cat, 0.0)

            # Epsilon adjustment
            b_prob = max(b_prob, 1e-5)
            c_prob = max(c_prob, 1e-5)

            psi_val += (c_prob - b_prob) * np.log(c_prob / b_prob)

        return float(psi_val)

    def calculate_js_divergence(
        self, baseline_probs: List[float], current_probs: List[float]
    ) -> float:
        """
        Calculates Jensen-Shannon Divergence for continuous output probabilities.
        """
        if not baseline_probs or not current_probs:
            return 0.0

        # Bin probabilities into 10 bins between 0 and 1
        bins = np.linspace(0, 1, 11)
        base_hist, _ = np.histogram(baseline_probs, bins=bins, density=True)
        curr_hist, _ = np.histogram(current_probs, bins=bins, density=True)

        # Normalize histograms to sum to 1 (probability distributions)
        p = base_hist / (np.sum(base_hist) + 1e-8)
        q = curr_hist / (np.sum(curr_hist) + 1e-8)

        # Compute JS Divergence
        jsd = distance.jensenshannon(p, q)
        return float(jsd)

    def check_drift(
        self,
        current_df: pd.DataFrame,
        live_probs: List[float] = None,
        baseline_probs: List[float] = None,
    ) -> Dict:
        """
        Evaluates input features and outputs for statistical drift.
        """
        drift_report = {
            "drift_detected": False,
            "drifted_features": [],
            "metrics": {},
            "concept_drift": {"drift": False, "js_divergence": 0.0},
        }

        # 1. Numerical input drift (KS-Test)
        for col in self.numeric_features:
            if col not in current_df.columns:
                continue
            ks_stat, p_value = stats.ks_2samp(
                self.baseline_df[col].dropna(), current_df[col].dropna()
            )
            is_drifted = p_value < self.alpha

            drift_report["metrics"][col] = {
                "method": "Kolmogorov-Smirnov",
                "p_value": float(p_value) if pd.notna(p_value) else 1.0,
                "ks_stat": float(ks_stat),
                "drift": bool(is_drifted),
            }
            if is_drifted:
                drift_report["drifted_features"].append(col)

        # 2. Categorical input drift (PSI)
        for col in self.categorical_features:
            if col not in current_df.columns:
                continue
            psi_val = self.calculate_psi(
                self.baseline_df[col].dropna(), current_df[col].dropna()
            )
            is_drifted = psi_val >= 0.25  # standard threshold for significant drift

            drift_report["metrics"][col] = {
                "method": "PSI",
                "psi_value": psi_val,
                "drift": bool(is_drifted),
            }
            if is_drifted:
                drift_report["drifted_features"].append(col)

        # If > 33% of checked features drifted, trigger data drift flag
        total_checked = len(drift_report["metrics"])
        if total_checked > 0:
            drift_ratio = len(drift_report["drifted_features"]) / total_checked
            if drift_ratio > 0.33:
                drift_report["drift_detected"] = True

        # 3. Output prediction drift (Jensen-Shannon)
        if live_probs and baseline_probs:
            jsd = self.calculate_js_divergence(baseline_probs, live_probs)
            # Threshold of 0.2 indicates significant output divergence
            concept_drifted = jsd >= 0.20
            drift_report["concept_drift"] = {
                "drift": bool(concept_drifted),
                "js_divergence": jsd,
            }
            if concept_drifted:
                drift_report["drift_detected"] = True
                logger.warning(
                    f"CONCEPT DRIFT DETECTED: Jensen-Shannon Divergence is {jsd:.4f}!"
                )

        return drift_report
