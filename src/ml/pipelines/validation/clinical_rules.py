from typing import Any, Dict, List, Literal

from pydantic import BaseModel


class ClinicalValidationResult(BaseModel):
    isValid: bool
    severity: Literal["OK", "WARNING", "HIGH", "CRITICAL"]
    errors: List[str]
    can_infer: bool


def validate_inference_record(record: Dict[str, Any]) -> ClinicalValidationResult:
    errors = []
    severity: Literal["OK", "WARNING", "HIGH", "CRITICAL"] = "OK"
    can_infer = True

    # 1. Check required fields
    required_fields = [
        "Age",
        "Gender",
        "Country",
        "Tobacco_Use",
        "Alcohol_Use",
        "Socioeconomic_Status",
    ]
    for field in required_fields:
        if field not in record or record[field] is None:
            errors.append(f"Missing mandatory field: {field}")
            severity = "CRITICAL"
            can_infer = False

    if not can_infer:
        return ClinicalValidationResult(
            isValid=False, severity=severity, errors=errors, can_infer=can_infer
        )

    # 2. Age validation
    age = record.get("Age")
    try:
        age_val = int(age)
        if age_val < 0 or age_val > 150:
            errors.append(f"Age {age_val} is physically impossible")
            severity = "CRITICAL"
            can_infer = False
        elif age_val < 18:
            errors.append(
                f"Patient age {age_val} is under 18. Model is not validated for pediatric populations."
            )
            if severity != "CRITICAL":
                severity = "HIGH"
            can_infer = False
        elif age_val > 110:
            errors.append(f"Extreme age detected: {age_val} years.")
            if severity not in ["CRITICAL", "HIGH"]:
                severity = "WARNING"
    except (ValueError, TypeError):
        errors.append(f"Invalid age value: {age}")
        severity = "CRITICAL"
        can_infer = False

    # 3. Survival Rate validation
    survival_rate = record.get("Survival_Rate")
    if survival_rate is not None:
        try:
            sr_val = float(survival_rate)
            if sr_val < 0.0 or sr_val > 1.0:
                errors.append(f"Survival rate {sr_val} is out of bounds [0.0, 1.0]")
                severity = "CRITICAL"
                can_infer = False
        except (ValueError, TypeError):
            errors.append(f"Invalid survival rate value: {survival_rate}")
            severity = "CRITICAL"
            can_infer = False

    # 4. Gender check
    gender = record.get("Gender")
    if gender not in ["Male", "Female"]:
        errors.append(f"Invalid gender: {gender}")
        severity = "CRITICAL"
        can_infer = False

    is_valid = len(errors) == 0
    return ClinicalValidationResult(
        isValid=is_valid, severity=severity, errors=errors, can_infer=can_infer
    )


def validate_training_record(record: Dict[str, Any]) -> ClinicalValidationResult:
    # Training is more tolerant, but still checks critical fields
    res = validate_inference_record(record)

    # Additional training-specific checks (e.g. Diagnosis_Stage vs Survival_Rate)
    stage = record.get("Diagnosis_Stage")
    survival_rate = record.get("Survival_Rate")

    if stage == "Late" and survival_rate is not None:
        try:
            sr_val = float(survival_rate)
            if sr_val == 1.0:
                res.errors.append(
                    "Clinical inconsistency: Late stage diagnosis cannot have a 1.0 survival rate"
                )
                res.isValid = False
                if res.severity not in ["CRITICAL"]:
                    res.severity = "HIGH"
        except (ValueError, TypeError):
            pass

    return res
