import logging

import numpy as np
import pandas as pd
from sklearn.metrics import brier_score_loss, recall_score

logger = logging.getLogger("aether.audit.fairness")


class ClinicalFairnessAuditor:
    """
    Hospital-grade Clinical Fairness and Bias Auditor.
    Assesses Equalized Odds, Subgroup Calibration, and False Negative Harm.
    """

    def run_fairness_audit(
        self,
        df: pd.DataFrame,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        y_prob: np.ndarray,
        sensitive_features: list[str] = ["Gender", "age_bucket", "Country"],
    ) -> dict:
        """
        Audits prediction fairness across subgroups of sensitive features.
        """
        report = {
            "is_fair": True,
            "sensitive_metrics": {},
            "audit_type": "clinical_fairness_audit",
        }

        # We allow a maximum disparity of 15% for clinical fairness
        disparity_threshold = 0.15

        for col in sensitive_features:
            if col not in df.columns:
                continue

            subgroups = df[col].astype(str).values
            unique_groups = np.unique(subgroups)
            group_metrics = {}

            for group in unique_groups:
                mask = subgroups == group
                if np.sum(mask) == 0:
                    continue

                y_t = y_true[mask]
                y_p = y_pred[mask]
                y_pr = y_prob[mask]

                # FNR (False Negative Rate) - Missed cancer rate (critical in oncology)
                positives = y_t == 1
                if np.sum(positives) > 0:
                    fnr = float(np.sum((y_p == 0) & positives) / np.sum(positives))
                    recall = float(recall_score(y_t, y_p, zero_division=0))
                else:
                    fnr = 0.0
                    recall = 1.0

                # FPR (False Positive Rate) - False alarm rate
                negatives = y_t == 0
                if np.sum(negatives) > 0:
                    fpr = float(np.sum((y_p == 1) & negatives) / np.sum(negatives))
                else:
                    fpr = 0.0

                # Subgroup Calibration (Brier Score)
                if len(np.unique(y_t)) > 0:
                    try:
                        brier = float(brier_score_loss(y_t, y_pr))
                    except Exception:
                        brier = 0.0
                else:
                    brier = 0.0

                group_metrics[group] = {
                    "recall": recall,
                    "FPR": fpr,
                    "FNR": fnr,
                    "brier_score": brier,
                    "sample_count": int(np.sum(mask)),
                }

            # Calculate disparities
            recalls = [m["recall"] for m in group_metrics.values()]
            fprs = [m["FPR"] for m in group_metrics.values()]
            fnrs = [m["FNR"] for m in group_metrics.values()]

            recall_disparity = max(recalls) - min(recalls) if recalls else 0.0
            fpr_disparity = max(fprs) - min(fprs) if fprs else 0.0
            fnr_disparity = max(fnrs) - min(fnrs) if fnrs else 0.0

            # Equalized odds requires parity of both FPR and TPR (Recall)
            is_group_fair = (recall_disparity <= disparity_threshold) and (
                fpr_disparity <= disparity_threshold
            )

            report["sensitive_metrics"][col] = {
                "group_metrics": group_metrics,
                "recall_disparity": recall_disparity,
                "fpr_disparity": fpr_disparity,
                "fnr_disparity": fnr_disparity,
                "is_fair": bool(is_group_fair),
            }

            if not is_group_fair:
                report["is_fair"] = False
                logger.warning(
                    f"CLINICAL BIAS ALERT: High disparity in '{col}' subgroup! "
                    f"Recall disparity: {recall_disparity:.4f}, FPR disparity: {fpr_disparity:.4f}"
                )

        return report
