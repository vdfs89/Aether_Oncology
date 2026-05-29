import logging
from typing import Any, Dict

import numpy as np
import pandas as pd
from sklearn.metrics import recall_score

logger = logging.getLogger(__name__)


class FairnessAuditor:
    """
    Audits clinical model predictions for bias across clinical subgroups.
    Ensures 'Equal Opportunity' in cancer detection.
    """

    def audit_recall_parity(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        sensitive_feature: np.ndarray,
        threshold: float = 0.1,
    ) -> Dict[str, Any]:
        """
        Checks if recall varies significantly across subgroups of a sensitive feature.
        """
        unique_groups = np.unique(sensitive_feature)
        group_metrics = {}

        for group in unique_groups:
            mask = sensitive_feature == group
            if np.sum(mask) == 0:
                continue

            rec = recall_score(y_true[mask], y_pred[mask], zero_division=0)
            group_metrics[str(group)] = rec

        # Calculate disparity
        rec_values = list(group_metrics.values())
        disparity = max(rec_values) - min(rec_values)

        is_fair = disparity <= threshold

        report = {
            "is_fair": bool(is_fair),
            "disparity_score": float(disparity),
            "group_metrics": group_metrics,
            "audit_type": "recall_parity",
        }

        if not is_fair:
            logger.warning(
                f"FAIRNESS ALERT: Recall disparity of {disparity:.2f} detected between subgroups!"
            )

        return report

    def audit_fpr_fnr(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        sensitive_feature: np.ndarray,
    ) -> Dict[str, Any]:
        """
        Calculates False Positive Rate (FPR) and False Negative Rate (FNR) per subgroup.
        """
        unique_groups = np.unique(sensitive_feature)
        group_metrics = {}

        for group in unique_groups:
            mask = sensitive_feature == group
            if np.sum(mask) == 0:
                continue

            y_t = y_true[mask]
            y_p = y_pred[mask]

            # FPR = FP / (FP + TN) -> rate of false alarms
            negatives = y_t == 0
            if np.sum(negatives) > 0:
                fpr = np.sum((y_p == 1) & negatives) / np.sum(negatives)
            else:
                fpr = 0.0

            # FNR = FN / (FN + TP) -> rate of missed detections
            positives = y_t == 1
            if np.sum(positives) > 0:
                fnr = np.sum((y_p == 0) & positives) / np.sum(positives)
            else:
                fnr = 0.0

            group_metrics[str(group)] = {"FPR": fpr, "FNR": fnr}

        return {
            "audit_type": "fpr_fnr_parity",
            "group_metrics": group_metrics,
        }

    def audit_by_feature_slice(
        self, df: pd.DataFrame, y_true_col: str, y_pred_col: str, slice_col: str
    ) -> Dict[str, Any]:
        """
        Convenience method to audit a dataframe slice.
        Useful for auditing by tumor size (mean radius) bins.
        """
        return self.audit_recall_parity(
            df[y_true_col].values, df[y_pred_col].values, df[slice_col].values
        )
