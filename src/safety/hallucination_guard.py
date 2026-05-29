from src.providers.judge_provider import JudgeProvider
from src.safety.types import ClinicalJudgement


class HallucinationGuard:
    """
    Specifically focuses on verifying factual claims against established oncology guidelines.
    """
    def __init__(self):
        self.judge = JudgeProvider()

    async def check_claims(self, prompt: str, response: str) -> ClinicalJudgement:
        # Currently delegates to the JudgeProvider which evaluates hallucination risk.
        # Future enhancements: specialized DB lookup, cross-referencing PMIDs, etc.
        return await self.judge.evaluate_response(prompt, response)
