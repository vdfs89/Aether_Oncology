import logging
from typing import Dict, List

import numpy as np
import pandas as pd
from scipy import stats

logger = logging.getLogger(__name__)


class DriftDetector:
    """
    Enterprise-grade Drift Detection for Clinical Inference.
    Detects Data Drift (Feature distribution shift) and Concept Drift (Model confidence shift).
    """

    def __init__(self, baseline_df: pd.DataFrame, alpha: float = 0.05):
        """
        Args:
            baseline_df: The training dataset used as reference.
            alpha: Significance level for KS-Test.
        """
        self.baseline = baseline_df
        self.alpha = alpha
        self.feature_columns = baseline_df.select_dtypes(
            include=[np.number]
        ).columns.tolist()
        logger.info(
            f"DriftDetector initialized with {len(self.feature_columns)} features."
        )

    def check_data_drift(self, current_df: pd.DataFrame) -> Dict:
        """
        Detects Data Drift using Kolmogorov-Smirnov test for each feature.
        """
        drift_report = {"drift_detected": False, "drifted_features": [], "metrics": {}}

        for col in self.feature_columns:
            if col not in current_df.columns:
                continue

            # Perform KS-Test
            ks_stat, p_value = stats.ks_2samp(self.baseline[col], current_df[col])

            is_drifted = p_value < self.alpha
            drift_report["metrics"][col] = {
                "p_value": float(p_value),
                "ks_stat": float(ks_stat),
                "drift": bool(is_drifted),
            }

            if is_drifted:
                drift_report["drifted_features"].append(col)

        # If more than 33% of features drifted, flag global drift
        drift_percentage = len(drift_report["drifted_features"]) / len(
            self.feature_columns
        )
        if drift_percentage > 0.33:
            drift_report["drift_detected"] = True
            logger.warning(
                f"CRITICAL: Data drift detected in {drift_percentage * 100:.1f}% of features!"
            )

        return drift_report

    def check_concept_drift(
        self, live_predictions: List[float], baseline_predictions: List[float]
    ) -> Dict:
        """
        Detects Concept Drift by comparing prediction probability distributions.
        """
        ks_stat, p_value = stats.ks_2samp(baseline_predictions, live_predictions)
        is_drifted = p_value < self.alpha

        return {
            "concept_drift": bool(is_drifted),
            "p_value": float(p_value),
            "ks_stat": float(ks_stat),
        }
