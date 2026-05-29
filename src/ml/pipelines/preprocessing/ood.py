from __future__ import annotations

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest


class ClinicalOODDetector:
    """
    Hospital-grade Out-of-Distribution (OOD) Detector.
    Uses Isolation Forest to detect patient demographic combinations
    not seen or rare in the training distribution.
    """

    def __init__(self, contamination: float = 0.01, random_state: int = 42):
        self.detector = IsolationForest(
            contamination=contamination, random_state=random_state, n_jobs=-1
        )

    def fit(self, X_preprocessed: np.ndarray) -> ClinicalOODDetector:
        self.detector.fit(X_preprocessed)
        return self

    def predict_ood(self, X_single_preprocessed: np.ndarray) -> bool:
        """
        Returns True if the record is Out-of-Distribution (anomaly).
        """
        # Isolation Forest outputs -1 for anomalies, 1 for normal
        pred = self.detector.predict(X_single_preprocessed)
        return bool(pred[0] == -1)

    def save(self, path: str) -> None:
        joblib.dump(self.detector, path)

    @classmethod
    def load(cls, path: str) -> ClinicalOODDetector:
        instance = cls()
        instance.detector = joblib.load(path)
        return instance
