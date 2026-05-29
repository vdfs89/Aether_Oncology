from src.safety.types import ClinicalJudgement


class EscalationPolicy:
    """
    Applies rules to determine if the judgement requires human intervention.
    """

    def evaluate(self, judgement: ClinicalJudgement) -> ClinicalJudgement:
        # If any major red flags, escalate
        if (
            judgement.hallucination_risk == "HIGH"
            or judgement.evidence_strength == "LOW"
            or judgement.contradictions
        ):
            judgement.requires_physician_review = True
            judgement.escalation_level = "HARD_STOP"
            judgement.approved = False
        elif judgement.hallucination_risk == "MEDIUM" or judgement.missing_citations:
            judgement.requires_physician_review = True
            judgement.escalation_level = "WARNING"

        # Ensure that if it requires review, it's not automatically approved
        if (
            judgement.requires_physician_review
            and judgement.escalation_level == "HARD_STOP"
        ):
            judgement.approved = False

        return judgement
