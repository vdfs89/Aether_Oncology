import json
import logging

from src.providers.openai_provider import OpenAIProvider
from src.safety.types import ClinicalJudgement

logger = logging.getLogger(__name__)


class JudgeProvider:
    """
    Encapsulates OpenAI to perform clinical evaluation, returning structured ClinicalJudgement.
    """

    def __init__(self):
        self.provider = OpenAIProvider()

    async def evaluate_response(
        self, original_prompt: str, generated_response: str
    ) -> ClinicalJudgement:
        if not self.provider.client:
            # Fail-SAFE, not fail-open: when the safety judge cannot run we must
            # NOT silently mark the response as approved/NONE. Deliver it in a
            # degraded mode but flag it as UNVERIFIED and require physician review
            # (WARNING, not HARD_STOP, so the experimental copilot still works).
            logger.warning(
                "JudgeProvider unavailable (OPENAI_API_KEY not set) — returning "
                "UNVERIFIED judgement that requires physician review."
            )
            return ClinicalJudgement(
                approved=False,
                confidence=0.0,
                hallucination_risk="MEDIUM",
                evidence_strength="LOW",
                contradictions=[],
                missing_citations=[
                    "Safety judge unavailable: response not verified by the clinical judge."
                ],
                requires_physician_review=True,
                escalation_level="WARNING",
            )

        system_prompt = """
        You are an expert Clinical Judge. Your job is to evaluate an AI-generated clinical response
        for safety, hallucination risk, evidence strength, and contradictions.

        Respond ONLY in a strict JSON format matching the schema:
        {
          "approved": boolean,
          "confidence": float (0.0 to 1.0),
          "hallucination_risk": "LOW" | "MEDIUM" | "HIGH",
          "evidence_strength": "LOW" | "MODERATE" | "HIGH",
          "contradictions": ["string"],
          "missing_citations": ["string"],
          "requires_physician_review": boolean,
          "escalation_level": "NONE" | "WARNING" | "HARD_STOP"
        }
        """

        user_content = f"Original Query: {original_prompt}\n\nGenerated Response: {generated_response}"

        try:
            response = await self.provider.client.chat.completions.create(
                model=self.provider.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                response_format={"type": "json_object"},
                temperature=0.0,
            )

            raw_json = response.choices[0].message.content
            data = json.loads(raw_json)

            return ClinicalJudgement(**data)

        except Exception as e:
            logger.error(f"Failed to evaluate response: {e}")
            # Fallback to safe escalation
            return ClinicalJudgement(
                approved=False,
                confidence=0.0,
                hallucination_risk="HIGH",
                evidence_strength="LOW",
                contradictions=["Evaluation Failed"],
                missing_citations=[],
                requires_physician_review=True,
                escalation_level="HARD_STOP",
            )
