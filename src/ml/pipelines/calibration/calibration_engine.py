import json
import logging
import os

import joblib
import matplotlib
import numpy as np

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.calibration import calibration_curve
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss

logger = logging.getLogger("aether.calibration")


class ClinicalCalibrationEngine:
    """
    Hospital-grade Probability Calibration Engine.
    Implements Platt Scaling and Isotonic Regression, selecting the best model
    using Brier Score, and computes Expected/Maximum Calibration Error (ECE/MCE).
    """

    def __init__(self, n_bins: int = 10):
        self.n_bins = n_bins
        self.best_method = None
        self.best_calibrator = None
        self.brier_score = None
        self.ece = None
        self.mce = None

    def calculate_ece_mce(
        self, y_true: np.ndarray, y_prob: np.ndarray
    ) -> tuple[float, float]:
        """
        Computes Expected Calibration Error (ECE) and Maximum Calibration Error (MCE).
        """
        bin_boundaries = np.linspace(0, 1, self.n_bins + 1)
        ece = 0.0
        mce = 0.0

        for i in range(self.n_bins):
            bin_lower = bin_boundaries[i]
            bin_upper = bin_boundaries[i + 1]

            # Select samples in current bin
            in_bin = (y_prob >= bin_lower) & (y_prob < bin_upper)
            prop_in_bin = np.mean(in_bin)

            if prop_in_bin > 0:
                accuracy_in_bin = np.mean(y_true[in_bin])
                avg_confidence_in_bin = np.mean(y_prob[in_bin])
                delta = abs(avg_confidence_in_bin - accuracy_in_bin)
                ece += prop_in_bin * delta
                mce = max(mce, delta)

        return float(ece), float(mce)

    def calibrate(
        self,
        y_val: np.ndarray,
        val_logits: np.ndarray,
        output_dir: str = "models/calibration",
    ) -> dict:
        """
        Fits both calibrators and stores metrics + graphs.
        """
        os.makedirs(output_dir, exist_ok=True)
        val_logits = val_logits.reshape(-1, 1)

        # 1. Platt Scaling (Logistic Regression)
        platt = LogisticRegression(C=1.0, solver="lbfgs")
        platt.fit(val_logits, y_val)
        platt_probs = platt.predict_proba(val_logits)[:, 1]
        platt_brier = brier_score_loss(y_val, platt_probs)

        # 2. Isotonic Regression
        isotonic = IsotonicRegression(out_of_bounds="clip")
        isotonic.fit(val_logits.flatten(), y_val)
        iso_probs = isotonic.predict(val_logits.flatten())
        iso_brier = brier_score_loss(y_val, iso_probs)

        logger.info(f"Platt Brier: {platt_brier:.6f} | Isotonic Brier: {iso_brier:.6f}")

        # Choose best calibrator
        if iso_brier <= platt_brier:
            self.best_method = "isotonic"
            self.best_calibrator = isotonic
            self.brier_score = float(iso_brier)
            best_probs = iso_probs
        else:
            self.best_method = "platt"
            self.best_calibrator = platt
            self.brier_score = float(platt_brier)
            best_probs = platt_probs

        # Save best model
        joblib.dump(self.best_calibrator, os.path.join(output_dir, "calibrator.joblib"))

        # Calculate ECE / MCE
        self.ece, self.mce = self.calculate_ece_mce(y_val, best_probs)

        # Save metrics JSON
        metrics = {
            "best_calibration_method": self.best_method,
            "brier_score": self.brier_score,
            "ece": self.ece,
            "mce": self.mce,
            "platt_brier": float(platt_brier),
            "isotonic_brier": float(iso_brier),
        }

        with open(os.path.join(output_dir, "calibration_metrics.json"), "w") as f:
            json.dump(metrics, f, indent=2)

        with open(os.path.join(output_dir, "brier_score.json"), "w") as f:
            json.dump({"brier_score": self.brier_score}, f, indent=2)

        # Generate reliability curve visual
        prob_true, prob_pred = calibration_curve(y_val, best_probs, n_bins=self.n_bins)

        plt.figure(figsize=(6, 6))
        plt.plot([0, 1], [0, 1], "k:", label="Perfect Calibration")
        plt.plot(prob_pred, prob_true, "s-", label=f"Calibrated ({self.best_method})")
        plt.xlabel("Mean Predicted Probability")
        plt.ylabel("Fraction of Positives")
        plt.title(
            f"Reliability Curve (Brier={self.brier_score:.4f}, ECE={self.ece:.4f})"
        )
        plt.legend(loc="lower right")
        plt.grid(True)
        plt.savefig(
            os.path.join(output_dir, "reliability_curve.png"),
            dpi=150,
            bbox_inches="tight",
        )
        plt.close()

        logger.info(f"Calibration completed. Selected method: {self.best_method}")
        return metrics
