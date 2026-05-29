import os
from datetime import datetime


class ClinicalModelCardGenerator:
    """
    Hospital-grade FDA SaMD / ANVISA Model Card Generator.
    Saves a comprehensive MD card describing performance, calibration, and clinical limitations.
    """

    def generate_card(
        self,
        lineage_metadata: dict,
        calibration_metrics: dict,
        fairness_report: dict,
        output_path: str = "models/model_card.md",
    ) -> None:

        # Build sensitive group metrics MD tables
        fairness_section = ""
        for feat, data in fairness_report.get("sensitive_metrics", {}).items():
            fairness_section += f"### Subgroup Parity: {feat}\n\n"
            fairness_section += "| Subgroup | Recall (Sensitivity) | False Positive Rate | False Negative Rate | Brier Score | Sample Count |\n"
            fairness_section += "|---|---|---|---|---|---|\n"
            for sub, metrics in data.get("group_metrics", {}).items():
                fairness_section += (
                    f"| {sub} | {metrics['recall']:.2%} | {metrics['fpr'] if 'fpr' in metrics else metrics.get('FPR', 0.0):.2%} | "
                    f"{metrics['fnr'] if 'fnr' in metrics else metrics.get('FNR', 0.0):.2%} | {metrics['brier_score']:.4f} | {metrics['sample_count']} |\n"
                )
            fairness_section += (
                f"\n* **Recall Disparity**: {data.get('recall_disparity', 0.0):.4%}\n"
            )
            fairness_section += f"* **False Negative Rate Disparity**: {data.get('fnr_disparity', 0.0):.4%}\n"
            fairness_section += f"* **Equalized Odds Status**: {'Passed' if data.get('is_fair') else 'Failed'}\n\n"

        content = f"""# Model Card: Aether Oncology Clinical Assistant

Generated on: {datetime.utcnow().isoformat()}Z
Model Version: `{lineage_metadata.get("model_version")}`
Git Commit: `{lineage_metadata.get("git_commit")}`

---

## Intended Use & Clinical Indication
* **Target Audience**: Board-certified Oncologists and Head & Neck Surgeons.
* **Intended Use**: Clinical Decision Support System (CDSS) for oral cancer screening.
* **Clinical Indication**: Screening aid to classify patient demographic and risk profiles into **Early Stage** vs. **Advanced Stage** (Moderate/Late) oral cancer.

## Clinical Limitations & Contraindications
> [!WARNING]
> **Important Limitations**
> * **Not Diagnostic**: This model is for screening support and decision augmentation only. It does not replace tissue biopsies or histology.
> * **Pediatric Exclusion**: Not validated for pediatric patients (under 18 years old).
> * **Immunocompromised Patients**: Not validated for immunocompromised or post-transplant populations.
> * **Geographic Variance**: Validated primarily against the Top 30 highest-burden oral cancer countries. Use caution outside these countries.

---

## Data Registry & Lineage
* **Registry Version**: `v1.0`
* **Raw Dataset SHA-256**: `{lineage_metadata.get("dataset_hash")}`
* **Inference Schema SHA-256**: `{lineage_metadata.get("inference_schema_hash")}`
* **Feature Registry SHA-256**: `{lineage_metadata.get("feature_registry_hash")}`
* **Preprocessing Pipeline SHA-256**: `{lineage_metadata.get("preprocessing_version")}`

---

## Model Calibration
* **Selected Calibration Method**: `{calibration_metrics.get("best_calibration_method").upper()}`
* **Brier Score**: `{calibration_metrics.get("brier_score")}`
* **Expected Calibration Error (ECE)**: `{calibration_metrics.get("ece")}`
* **Maximum Calibration Error (MCE)**: `{calibration_metrics.get("mce")}`

---

## Clinical Fairness Audit (Equalized Odds & FN Harm)
{fairness_section}
---

## Regulatory Compliance Declaration
* **FDA SaMD Category**: Class II (Decision Support).
* **HIPAA/LGPD Compliance**: All data logged in the audit trail is encrypted via Fernet (AES-128-CBC/HMAC). IndexedDB data is encrypted using Web Crypto PBKDF2 GCM-256.
"""

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)

        # Also copy it to the artifact directory so the user gets notified/updates
        # Wait, the artifact walkthrough or card will mention it.
