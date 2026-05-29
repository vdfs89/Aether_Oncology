import logging
from typing import Optional
from src.safety.types import ClinicalJudgement

logger = logging.getLogger(__name__)

# Thresholds
_CONFIDENCE_FLOOR = 0.50          # below → no consensus
_MAX_CONTRADICTIONS_OK = 1        # 0–1 contradictions allowed
_MIN_EVIDENCE_FOR_LOW_CITES = "MODERATE"  # if evidence is LOW, citations scrutinized
_MAX_MISSING_CITES_LOW_EVIDENCE = 1       # with LOW evidence, max missing citations


class ConsensusResult:
    """Structured output from the consensus layer."""
    __slots__ = ("passed", "dissenting_guard", "reason")

    def __init__(self, passed: bool, dissenting_guard: Optional[str] = None, reason: str = "") -> None:
        self.passed = passed
        self.dissenting_guard = dissenting_guard
        self.reason = reason


class ConsensusEngine:
    """
    Tri-layer consensus gate — third guard in the safety pipeline.

    Aggregation rules (ALL must pass; policy_guard has veto):
      1. hallucination_guard veto  — HIGH hallucination_risk → FAIL
      2. evidence_guard            — LOW evidence + ≥2 missing citations → FAIL
      3. confidence_gate           — confidence < 0.50 → FAIL
      4. contradiction_gate        — ≥2 contradictions → FAIL
    """

    def evaluate_consensus(self, judgement: ClinicalJudgement, _judge_response: str = "") -> bool:
        """
        Returns True if consensus is reached, False otherwise.
        Logs which guard dissented for audit purposes.
        `_judge_response` kept for API compatibility — unused.
        """
        result = self._evaluate(judgement)
        if not result.passed:
            logger.warning(
                "Consensus FAILED | guard=%s | reason=%s | "
                "hallucination_risk=%s | confidence=%.2f | contradictions=%d | missing_citations=%d",
                result.dissenting_guard,
                result.reason,
                judgement.hallucination_risk,
                judgement.confidence,
                len(judgement.contradictions),
                len(judgement.missing_citations),
            )
        else:
            logger.debug(
                "Consensus PASSED | confidence=%.2f | evidence=%s | contradictions=%d",
                judgement.confidence,
                judgement.evidence_strength,
                len(judgement.contradictions),
            )
        return result.passed

    # ------------------------------------------------------------------
    # Internal guards
    # ------------------------------------------------------------------

    def _evaluate(self, j: ClinicalJudgement) -> ConsensusResult:
        # Guard 1 — hallucination_guard (veto absolute)
        if j.hallucination_risk == "HIGH":
            return ConsensusResult(
                passed=False,
                dissenting_guard="hallucination_guard",
                reason="HIGH hallucination_risk — absolute veto",
            )

        # Guard 2 — confidence_gate
        if j.confidence < _CONFIDENCE_FLOOR:
            return ConsensusResult(
                passed=False,
                dissenting_guard="confidence_gate",
                reason=f"confidence {j.confidence:.2f} below floor {_CONFIDENCE_FLOOR}",
            )

        # Guard 3 — contradiction_gate
        if len(j.contradictions) > _MAX_CONTRADICTIONS_OK:
            return ConsensusResult(
                passed=False,
                dissenting_guard="contradiction_gate",
                reason=f"{len(j.contradictions)} contradictions exceed allowed {_MAX_CONTRADICTIONS_OK}",
            )

        # Guard 4 — evidence_guard (LOW evidence + excessive missing citations)
        if (
            j.evidence_strength == "LOW"
            and len(j.missing_citations) > _MAX_MISSING_CITES_LOW_EVIDENCE
        ):
            return ConsensusResult(
                passed=False,
                dissenting_guard="evidence_guard",
                reason=(
                    f"LOW evidence_strength with {len(j.missing_citations)} missing citations "
                    f"(max {_MAX_MISSING_CITES_LOW_EVIDENCE})"
                ),
            )

        return ConsensusResult(passed=True)
