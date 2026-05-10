import logging
from typing import Any, Dict

import numpy as np
import pandas as pd

from .drift import DriftDetector
from .fairness import FairnessAuditor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MLPlatformOrchestrator:
    """
    Orchestrates ML Platform operations: Drift Detection, Fairness Auditing, and Retraining Gates.
    """

    def __init__(self, baseline_data_path: str):
        self.baseline_df = pd.read_csv(baseline_data_path)
        self.drift_detector = DriftDetector(self.baseline_df)
        self.fairness_auditor = FairnessAuditor()

    def run_production_health_check(self, live_data: pd.DataFrame, predictions: np.ndarray, ground_truth: np.ndarray = None) -> Dict[str, Any]:
        """
        Executes a full health check on production data.
        """
        results = {}

        # 1. Data Drift
        results["data_drift"] = self.drift_detector.check_data_drift(live_data)

        # 2. Fairness (Using 'mean radius' as a clinical slice for demonstration)
        if ground_truth is not None:
            # Bin the radius feature into 3 categories: small, medium, large
            radius_bins = pd.qcut(live_data['mean radius'], q=3, labels=['small', 'medium', 'large'])
            results["fairness"] = self.fairness_auditor.audit_recall_parity(
                ground_truth,
                (predictions > 0.5).astype(int),
                radius_bins.values
            )

        # 3. Decision Gate for Retraining
        results["trigger_retraining"] = results["data_drift"]["drift_detected"] or \
                                        (not results.get("fairness", {}).get("is_fair"))

        if results["trigger_retraining"]:
            logger.warning("HEALTH CHECK FAILED: Recommending immediate model retraining.")
        else:
            logger.info("HEALTH CHECK PASSED: Model remains stable.")

        return results

    def validate_new_model(self, new_val_data: pd.DataFrame, y_true: np.ndarray, y_pred: np.ndarray) -> bool:
        """
        Final gate before promoting a new model version to production.
        Checks for metrics degradation and fairness.
        """
        # Logic to compare with previous production metrics
        # For now, just check if fairness passes
        radius_bins = pd.qcut(new_val_data['mean radius'], q=3, labels=['small', 'medium', 'large'])
        fairness_report = self.fairness_auditor.audit_recall_parity(y_true, (y_pred > 0.5).astype(int), radius_bins.values)

        return fairness_report["is_fair"]
