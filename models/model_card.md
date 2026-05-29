# Model Card: Aether Oncology Clinical Assistant

Generated on: 2026-05-29T03:03:24.723294Z
Model Version: `3.1.0`
Git Commit: `5b2fea750022865a21dc4bd6fdb60de83053795d`

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
* **Raw Dataset SHA-256**: `sha256:4cb9194c8623fc8e64c1e5ed341f79acd07b20b941bd45974ba605961b978cf9`
* **Inference Schema SHA-256**: `sha256:407ace9305ea7a331408db984ebad193b688cbda7c1b87e420d92e981247c6f7`
* **Feature Registry SHA-256**: `sha256:7809bdca0d221b2be8878991fa9d8f99e0eb03694406aa7f32dbdf9e495426e8`
* **Preprocessing Pipeline SHA-256**: `sha256:5048107de9ba7331da95c0371ab12d581732c64bf951958aa93f41afba6de0bd`

---

## Model Calibration
* **Selected Calibration Method**: `ISOTONIC`
* **Brier Score**: `0.21028977632522583`
* **Expected Calibration Error (ECE)**: `3.843413793882918e-08`
* **Maximum Calibration Error (MCE)**: `4.940608977488381e-08`

---

## Clinical Fairness Audit (Equalized Odds & FN Harm)
### Subgroup Parity: Gender

| Subgroup | Recall (Sensitivity) | False Positive Rate | False Negative Rate | Brier Score | Sample Count |
|---|---|---|---|---|---|
| Female | 100.00% | 100.00% | 0.00% | 0.2137 | 7937 |
| Male | 100.00% | 100.00% | 0.00% | 0.2121 | 16107 |

* **Recall Disparity**: 0.0000%
* **False Negative Rate Disparity**: 0.0000%
* **Equalized Odds Status**: Passed

### Subgroup Parity: age_bucket

| Subgroup | Recall (Sensitivity) | False Positive Rate | False Negative Rate | Brier Score | Sample Count |
|---|---|---|---|---|---|
| 18-30 | 100.00% | 100.00% | 0.00% | 0.2147 | 6703 |
| 31-45 | 100.00% | 100.00% | 0.00% | 0.2100 | 6910 |
| 46-60 | 100.00% | 100.00% | 0.00% | 0.2137 | 3458 |
| 61+ | 100.00% | 100.00% | 0.00% | 0.2127 | 6973 |

* **Recall Disparity**: 0.0000%
* **False Negative Rate Disparity**: 0.0000%
* **Equalized Odds Status**: Passed

### Subgroup Parity: Country

| Subgroup | Recall (Sensitivity) | False Positive Rate | False Negative Rate | Brier Score | Sample Count |
|---|---|---|---|---|---|
| Bangladesh | 100.00% | 100.00% | 0.00% | 0.2172 | 794 |
| Brazil | 100.00% | 100.00% | 0.00% | 0.2127 | 818 |
| China | 100.00% | 100.00% | 0.00% | 0.2051 | 801 |
| Colombia | 100.00% | 100.00% | 0.00% | 0.2076 | 759 |
| DR Congo | 100.00% | 100.00% | 0.00% | 0.2102 | 826 |
| Egypt | 100.00% | 100.00% | 0.00% | 0.2157 | 761 |
| Ethiopia | 100.00% | 100.00% | 0.00% | 0.2095 | 795 |
| France | 100.00% | 100.00% | 0.00% | 0.2137 | 805 |
| Germany | 100.00% | 100.00% | 0.00% | 0.2109 | 802 |
| India | 100.00% | 100.00% | 0.00% | 0.2091 | 836 |
| Indonesia | 100.00% | 100.00% | 0.00% | 0.2196 | 826 |
| Iran | 100.00% | 100.00% | 0.00% | 0.2101 | 788 |
| Italy | 100.00% | 100.00% | 0.00% | 0.2170 | 815 |
| Japan | 100.00% | 100.00% | 0.00% | 0.2116 | 809 |
| Kenya | 100.00% | 100.00% | 0.00% | 0.2085 | 781 |
| Mexico | 100.00% | 100.00% | 0.00% | 0.2022 | 738 |
| Myanmar | 100.00% | 100.00% | 0.00% | 0.2155 | 784 |
| Nigeria | 100.00% | 100.00% | 0.00% | 0.2138 | 812 |
| Pakistan | 100.00% | 100.00% | 0.00% | 0.2045 | 802 |
| Philippines | 100.00% | 100.00% | 0.00% | 0.2120 | 816 |
| Russia | 100.00% | 100.00% | 0.00% | 0.2126 | 830 |
| South Africa | 100.00% | 100.00% | 0.00% | 0.2191 | 844 |
| South Korea | 100.00% | 100.00% | 0.00% | 0.2215 | 818 |
| Spain | 100.00% | 100.00% | 0.00% | 0.2232 | 798 |
| Tanzania | 100.00% | 100.00% | 0.00% | 0.2119 | 786 |
| Thailand | 100.00% | 100.00% | 0.00% | 0.2089 | 823 |
| Turkey | 100.00% | 100.00% | 0.00% | 0.2100 | 797 |
| United Kingdom | 100.00% | 100.00% | 0.00% | 0.2144 | 776 |
| United States | 100.00% | 100.00% | 0.00% | 0.2247 | 799 |
| Vietnam | 100.00% | 100.00% | 0.00% | 0.2043 | 805 |

* **Recall Disparity**: 0.0000%
* **False Negative Rate Disparity**: 0.0000%
* **Equalized Odds Status**: Passed


---

## Regulatory Compliance Declaration
* **FDA SaMD Category**: Class II (Decision Support).
* **HIPAA/LGPD Compliance**: All data logged in the audit trail is encrypted via Fernet (AES-128-CBC/HMAC). IndexedDB data is encrypted using Web Crypto PBKDF2 GCM-256.
