import hashlib
import json
import logging
import os
from datetime import datetime

logger = logging.getLogger("aether.lineage")


def hash_file(path: str) -> str:
    """Calculates SHA-256 checksum of a file."""
    if not os.path.exists(path):
        return ""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()


class ClinicalDataLineageRegistry:
    """
    Hospital-grade Data Lineage and Traceability Registry.
    Tracks checksums of training data, schemas, registries, and preprocessing logic.
    """

    def __init__(
        self, dataset_path: str, output_path: str = "models/data_lineage.json"
    ):
        self.dataset_path = dataset_path
        self.output_path = output_path

    def register_lineage(
        self, calibration_method: str, brier_score: float, model_version: str = "3.1.0"
    ) -> dict:
        """
        Compiles lineage metadata and saves it to data_lineage.json.
        """
        # Define paths to files we need to hash
        schema_dir = "src/ml/pipelines/validation"
        features_dir = "src/ml/pipelines/preprocessing"

        # Hashes
        dataset_hash = hash_file(self.dataset_path)

        training_schema_hash = hash_file(os.path.join(schema_dir, "training_schema.py"))
        inference_schema_hash = hash_file(
            os.path.join(schema_dir, "inference_schema.py")
        )
        clinical_rules_hash = hash_file(os.path.join(schema_dir, "clinical_rules.py"))

        feature_registry_hash = hash_file(
            os.path.join(features_dir, "feature_registry.json")
        )
        preprocessing_hash = hash_file(os.path.join(features_dir, "preprocessing.py"))

        # Git commit (simple fallback if git fails)
        git_commit = "unknown"
        try:
            import subprocess

            res = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                capture_output=True,
                text=True,
                check=False,
            )
            if res.returncode == 0:
                git_commit = res.stdout.strip()
        except Exception:
            pass

        lineage_metadata = {
            "model_version": model_version,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "git_commit": git_commit,
            "dataset_version": "v1.0",
            "dataset_hash": f"sha256:{dataset_hash}",
            "schema_hash": f"sha256:{training_schema_hash}",
            "inference_schema_hash": f"sha256:{inference_schema_hash}",
            "clinical_rules_hash": f"sha256:{clinical_rules_hash}",
            "feature_registry_hash": f"sha256:{feature_registry_hash}",
            "preprocessing_version": f"sha256:{preprocessing_hash}",
            "calibration_method": calibration_method,
            "brier_score": brier_score,
        }

        os.makedirs(os.path.dirname(self.output_path), exist_ok=True)
        with open(self.output_path, "w") as f:
            json.dump(lineage_metadata, f, indent=2)

        logger.info(f"Data lineage logged to {self.output_path}")
        return lineage_metadata
