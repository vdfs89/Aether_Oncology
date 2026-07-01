# src/safety/policy.py
"""
SafetyPolicy — ponto único de entrada para avaliação de segurança clínica.

Usada por: ClinicalInferenceRuntime, endpoint /predict, clinical tools.
Centraliza regras de escalation para que não fiquem espalhadas pelo código.

O ClinicalJudge (guard + consensus + escalation_policy) é usado internamente
apenas para avaliações de respostas LLM. Para predições e tools, as regras
são avaliadas de forma síncrona sem chamadas a LLM.
"""

from src.safety.clinical_judge import ClinicalJudge
from src.safety.types import ClinicalJudgement


class SafetyPolicy:
    """
    Política de segurança unificada.
    Usada por: ClinicalInferenceRuntime, /predict, clinical tools.
    """

    def __init__(self):
        self.judge = ClinicalJudge()

    async def evaluate_response(self, prompt: str, response: str) -> ClinicalJudgement:
        """Avalia resposta do copiloto clínico via ClinicalJudge completo.

        Delega para o pipeline guard → consensus → escalation_policy.
        """
        return await self.judge.evaluate(prompt, response)

    def evaluate_prediction(self, confidence: float, risk_level: str) -> ClinicalJudgement:
        """Avalia predições do /predict endpoint.

        Regras:
          - confidence < 0.4  → HARD_STOP + approved=False
          - confidence < 0.6  → WARNING + requires_physician_review=True
          - confidence >= 0.6 → NONE + approved=True
          - risk_level=="HIGH" sempre adiciona requires_physician_review=True

        Retorna ClinicalJudgement sem chamar LLM (síncrono).
        """
        # Determinar nível de escalation baseado em confidence
        if confidence < 0.4:
            escalation_level = "HARD_STOP"
            approved = False
            requires_review = True
            evidence_strength = "LOW"
        elif confidence < 0.6:
            escalation_level = "WARNING"
            approved = True  # WARNING não bloqueia, mas requer revisão
            requires_review = True
            evidence_strength = "LOW"
        else:
            escalation_level = "NONE"
            approved = True
            requires_review = False
            evidence_strength = "MODERATE" if confidence < 0.8 else "HIGH"

        # risk_level HIGH sempre requer revisão médica, independente do confidence
        if risk_level == "HIGH":
            requires_review = True

        return ClinicalJudgement(
            approved=approved,
            confidence=confidence,
            hallucination_risk="LOW",
            evidence_strength=evidence_strength,
            contradictions=[],
            missing_citations=[],
            requires_physician_review=requires_review,
            escalation_level=escalation_level,
        )

    def evaluate_tool_output(self, tool_name: str, output: dict) -> ClinicalJudgement:
        """Avalia output de clinical tools.

        Regras:
          - output sem campo "source" → missing_citations=["source ausente"] + WARNING
          - output sem campo "evidence_level" → missing_citations append "evidence_level ausente"
          - Se missing_citations não vazio → requires_physician_review=True
          - Se tudo ok → approved=True, escalation_level="NONE"

        Retorna ClinicalJudgement sem chamar LLM (síncrono).
        """
        missing: list[str] = []

        if "source" not in output or not output["source"]:
            missing.append("source ausente")
        if "evidence_level" not in output or not output["evidence_level"]:
            missing.append("evidence_level ausente")

        has_issues = len(missing) > 0

        return ClinicalJudgement(
            approved=not has_issues,
            confidence=1.0 if not has_issues else 0.4,
            hallucination_risk="LOW" if not has_issues else "MEDIUM",
            evidence_strength="HIGH" if not has_issues else "LOW",
            contradictions=[],
            missing_citations=missing,
            requires_physician_review=has_issues,
            escalation_level="WARNING" if has_issues else "NONE",
        )
