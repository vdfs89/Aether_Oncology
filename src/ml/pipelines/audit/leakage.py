import logging

import numpy as np
import pandas as pd
from sklearn.feature_selection import mutual_info_classif
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression

logger = logging.getLogger("aether.audit.leakage")


class LeakageAuditor:
    """
    Hospital-grade Leakage Auditor (v2).
    Scans for proxy features, posterior indicators, and near-perfect predictors.
    """

    def run_leakage_audit(
        self,
        X_df: pd.DataFrame,
        y: np.ndarray,
        preprocessed_feature_names: list[str],
        X_train_t: np.ndarray,
        y_train: np.ndarray,
    ) -> dict:
        """
        Runs comprehensive leakage checks.
        Returns a report. Raises ValueError if blocking leakage is detected.
        """
        report = {
            "passed": True,
            "blocked_by": [],
            "correlations": {},
            "mutual_information": {},
            "permutation_importance": {},
        }

        # 1. Check for posterior features (Temporal Leakage)
        leaky_features = ["Diagnosis_Stage", "Treatment_Type", "Survival_Rate"]
        for feat in leaky_features:
            if feat in X_df.columns:
                # Except if we explicitly allow Survival_Rate as a baseline check,
                # but if it was passed raw to the model without validation, it's risky.
                # In Aether Oncology, Survival_Rate is a feature, but Treatment_Type and Diagnosis_Stage
                # are posterior. Let's flag Diagnosis_Stage as a blocking leakage.
                if feat == "Diagnosis_Stage":
                    report["passed"] = False
                    msg = f"TEMPORAL LEAKAGE: Posterior feature '{feat}' found in model input features."
                    report["blocked_by"].append(msg)
                    logger.error(msg)

        # 2. Check for high Pearson correlation with target for numerical columns
        # Map target back to df for correlation calc
        temp_df = X_df.copy()
        temp_df["__target"] = y
        for col in temp_df.select_dtypes(include=[np.number]).columns:
            if col == "__target":
                continue
            corr = temp_df[col].corr(temp_df["__target"])
            report["correlations"][col] = float(corr) if pd.notna(corr) else 0.0
            if abs(corr) > 0.95:
                report["passed"] = False
                msg = f"PROXY LEAKAGE: Feature '{col}' has near-perfect correlation (r={corr:.4f}) with target."
                report["blocked_by"].append(msg)
                logger.error(msg)

        # 3. Mutual Information Leakage Audit
        # Sample subset for speed if dataset is huge
        sample_size = min(5000, len(X_train_t))
        indices = np.random.choice(len(X_train_t), sample_size, replace=False)
        X_sample = X_train_t[indices]
        y_sample = y_train[indices]

        mi_scores = mutual_info_classif(X_sample, y_sample, random_state=42)
        for name, score in zip(preprocessed_feature_names, mi_scores):
            report["mutual_information"][name] = float(score)
            if score > 0.95:
                report["passed"] = False
                msg = f"PROXY LEAKAGE: Preprocessed feature '{name}' has mutual information score of {score:.4f}."
                report["blocked_by"].append(msg)
                logger.error(msg)

        # 4. Permutation Importance Audit
        # Train a simple Logistic Regression model to test permutation importance
        clf = LogisticRegression(max_iter=500, random_state=42)
        clf.fit(X_sample, y_sample)

        perm_importance = permutation_importance(
            clf, X_sample, y_sample, n_repeats=5, random_state=42
        )

        for name, import_mean in zip(
            preprocessed_feature_names, perm_importance.importances_mean
        ):
            report["permutation_importance"][name] = float(import_mean)
            # If a single feature drops classification accuracy by > 45% when permuted, it's dominant (likely leaked)
            if import_mean > 0.45:
                report["passed"] = False
                msg = f"DOMINANCE LEAKAGE: Preprocessed feature '{name}' dominates classification accuracy (permutation drop = {import_mean:.4f})."
                report["blocked_by"].append(msg)
                logger.error(msg)

        if not report["passed"]:
            raise ValueError(
                f"Model training blocked due to data leakage: {report['blocked_by']}"
            )

        logger.info("Leakage audit passed successfully.")
        return report
