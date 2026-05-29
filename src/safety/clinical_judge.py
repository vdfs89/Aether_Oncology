import logging

from src.safety.consensus_engine import ConsensusEngine
from src.safety.escalation_policy import EscalationPolicy
from src.safety.hallucination_guard import HallucinationGuard
from src.safety.types import ClinicalJudgement

logger = logging.getLogger(__name__)

class ClinicalJudge:
    """
    The orchestrator for the safety layer.
    """
    def __init__(self):
        self.guard = HallucinationGuard()
        self.consensus = ConsensusEngine()
        self.policy = EscalationPolicy()

    async def evaluate(self, original_prompt: str, generated_response: str) -> ClinicalJudgement:
        logger.info("Evaluating response via Clinical Judge...")

        # 1. Check for hallucinations and basic evidence
        judgement = await self.guard.check_claims(original_prompt, generated_response)

        # 2. Consensus check — passes ClinicalJudgement (not raw text) to real guard logic
        has_consensus = self.consensus.evaluate_consensus(judgement)
        if not has_consensus:
            judgement.contradictions.append("Failed multi-model consensus.")
            judgement.confidence *= 0.5

        # 3. Apply escalation policy rules
        final_judgement = self.policy.evaluate(judgement)

        logger.info(f"Clinical Judgement complete. Approved: {final_judgement.approved}, Escalation: {final_judgement.escalation_level}")
        return final_judgement
