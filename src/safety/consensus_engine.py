import asyncio
import logging
import math
from typing import List, Optional

from src.providers.judge_provider import JudgeProvider
from src.safety.hallucination_guard import HallucinationGuard
from src.safety.types import ClinicalJudgement

logger = logging.getLogger(__name__)

# Thresholds
_CONFIDENCE_FLOOR = 0.50  # below → no consensus
_MAX_CONTRADICTIONS_OK = 1  # 0–1 contradictions allowed
_MIN_EVIDENCE_FOR_LOW_CITES = "MODERATE"  # if evidence is LOW, citations scrutinized
_MAX_MISSING_CITES_LOW_EVIDENCE = 1  # with LOW evidence, max missing citations


class ConsensusResult:
    """Structured output from the safety gate."""

    __slots__ = ("passed", "dissenting_guard", "reason")

    def __init__(
        self, passed: bool, dissenting_guard: Optional[str] = None, reason: str = ""
    ) -> None:
        self.passed = passed
        self.dissenting_guard = dissenting_guard
        self.reason = reason


class ConsensusEngine:
    """
    SafetyGate — deterministic 4-gate filter over a ClinicalJudgement.

    Default mode (single-judge):
      Operates on the ClinicalJudgement produced upstream by HallucinationGuard,
      which itself delegates to one JudgeProvider. This is NOT multi-model
      consensus — it is a 4-rule safety gate. The historical name
      "ConsensusEngine" is preserved for API compatibility (see alias SafetyGate
      below); the public docstring is the source of truth on what it actually
      does.

      Gates (any failure → not passed; ordering is logical, not weighted):
        1. hallucination_guard  — HIGH hallucination_risk → FAIL (veto)
        2. confidence_gate      — confidence < 0.50 → FAIL
        3. contradiction_gate   — ≥2 contradictions → FAIL
        4. evidence_guard       — LOW evidence + ≥2 missing citations → FAIL

    Multi-judge mode (opt-in via `judges=[...]` of length ≥ 2):
      Use `evaluate_multi_judge(prompt, response)` to run N independent
      JudgeProviders in parallel and require a 2/3 majority of judgements to
      pass the 4 gates. This is the only mode that warrants the word
      "consensus" — and is gated on the caller actually providing ≥2
      independent judges.

      A list of length < 2 raises ValueError to make the contract loud rather
      than silently degrading to a single-judge claiming consensus.
    """

    def __init__(self, judges: Optional[List[JudgeProvider]] = None) -> None:
        if judges is not None and len(judges) < 2:
            raise ValueError(
                "consensus requires ≥2 independent judges; pass None for "
                "single-judge mode"
            )
        self._judges: Optional[List[JudgeProvider]] = judges

    @property
    def mode(self) -> str:
        return f"multi-judge n={len(self._judges)}" if self._judges else "single-judge"

    def evaluate_consensus(self, judgement: ClinicalJudgement) -> bool:
        """
        Run the 4 gates against a single ClinicalJudgement.

        This is the single-judge fast path used by `ClinicalJudge.evaluate`.
        Returns True iff all gates pass. Logs the dissenting guard on failure.

        IMPORTANT: a True return here is the consensus-gate verdict only. The
        final clinical decision is still subject to `EscalationPolicy` and may
        flip `approved` to False. Audit-trail readers should rely on
        `ClinicalJudge`'s final log, not this one, for the bottom line.
        """
        result = self._evaluate(judgement)
        if not result.passed:
            logger.warning(
                "[%s] Consensus gate FAILED | guard=%s | reason=%s | "
                "hallucination_risk=%s | confidence=%.2f | contradictions=%d | "
                "missing_citations=%d",
                self.mode,
                result.dissenting_guard,
                result.reason,
                judgement.hallucination_risk,
                judgement.confidence,
                len(judgement.contradictions),
                len(judgement.missing_citations),
            )
        else:
            logger.info(
                "[%s] Consensus gate PASSED (decision pending escalation) | "
                "confidence=%.2f | evidence=%s | contradictions=%d",
                self.mode,
                judgement.confidence,
                judgement.evidence_strength,
                len(judgement.contradictions),
            )
        return result.passed

    async def evaluate_multi_judge(
        self, original_prompt: str, generated_response: str
    ) -> bool:
        """
        True majority-vote consensus across N independent judges.

        Requires the instance to have been constructed with `judges=[...]`.
        Each judge produces a ClinicalJudgement; each is filtered through the
        4 gates; consensus = ⌈2/3 · N⌉ passing votes.
        """
        if not self._judges:
            raise RuntimeError(
                "evaluate_multi_judge requires ≥2 judges injected at construction time"
            )

        # Each judge is wrapped in HallucinationGuard to produce a
        # ClinicalJudgement consistent with the single-judge path.
        async def _vote(judge: JudgeProvider) -> bool:
            guard = HallucinationGuard()
            guard.judge = judge  # inject this specific judge
            judgement = await guard.check_claims(original_prompt, generated_response)
            return self._evaluate(judgement).passed

        votes = await asyncio.gather(*(_vote(j) for j in self._judges))
        passing = sum(1 for v in votes if v)
        threshold = math.ceil(2 / 3 * len(votes))
        ok = passing >= threshold
        logger.info(
            "[%s] Multi-judge consensus %s | passing=%d/%d (threshold=%d)",
            self.mode,
            "PASSED" if ok else "FAILED",
            passing,
            len(votes),
            threshold,
        )
        return ok

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


# Honest alias — use this name for new code. The original `ConsensusEngine`
# is kept as a re-export for backward compatibility with existing imports.
SafetyGate = ConsensusEngine
