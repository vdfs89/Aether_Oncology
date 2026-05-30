"""
test_consensus_engine.py
========================
Failure-path coverage for the P1 safety hardening of `src.safety.consensus_engine`.

Scope:
- Fix #1 — class no longer claims "tri-layer consensus" and rejects single-judge
  lists at construction time so the contract is loud, not silent.
- Fix #4 — single-judge PASSED log must disclaim that the final clinical
  decision still depends on EscalationPolicy.

These tests purposely target audit-trail honesty, not new approval logic — the
bottom-line behavior of `evaluate_consensus` is unchanged.
"""

import logging
from unittest.mock import MagicMock

import pytest

from src.safety.consensus_engine import ConsensusEngine, SafetyGate
from src.safety.types import ClinicalJudgement


def _passing_judgement() -> ClinicalJudgement:
    """Builds a judgement that should clear all 4 gates."""
    return ClinicalJudgement(
        approved=True,
        confidence=0.92,
        hallucination_risk="LOW",
        evidence_strength="HIGH",
        contradictions=[],
        missing_citations=[],
        requires_physician_review=False,
        escalation_level="NONE",
    )


# ---------------------------------------------------------------------------
# Fix #1 — honest contract on construction
# ---------------------------------------------------------------------------


def test_constructor_rejects_single_judge_list() -> None:
    """A single-element judges list must raise — the word "consensus" requires
    ≥2 independent voters or None (single-judge mode)."""
    fake_judge = MagicMock()
    with pytest.raises(ValueError, match="≥2 independent judges"):
        ConsensusEngine(judges=[fake_judge])


def test_constructor_accepts_two_or_more_judges() -> None:
    """Two judges is the minimum for a real consensus claim."""
    engine = ConsensusEngine(judges=[MagicMock(), MagicMock()])
    assert "multi-judge n=2" in engine.mode


def test_default_constructor_is_single_judge_mode() -> None:
    """No-args ctor stays in the legacy single-judge fast path."""
    assert ConsensusEngine().mode == "single-judge"


def test_safety_gate_alias_is_consensus_engine() -> None:
    """SafetyGate is the honest name; ConsensusEngine is preserved for compat."""
    assert SafetyGate is ConsensusEngine


def test_docstring_does_not_claim_tri_layer() -> None:
    """Regression guard against the original misleading "tri-layer consensus"
    docstring re-appearing."""
    doc = (ConsensusEngine.__doc__ or "").lower()
    assert "tri-layer" not in doc
    assert "third guard" not in doc


# ---------------------------------------------------------------------------
# Fix #4 — PASSED log disclaims escalation pending
# ---------------------------------------------------------------------------


def test_passed_log_disclaims_final_decision(caplog: pytest.LogCaptureFixture) -> None:
    """When the gate passes, the log must signal that EscalationPolicy still
    has the last word — otherwise audit-trail readers reconcile a `PASSED`
    here with a downstream `approved=False` and conclude the system is
    inconsistent."""
    engine = ConsensusEngine()
    with caplog.at_level(logging.INFO, logger="src.safety.consensus_engine"):
        assert engine.evaluate_consensus(_passing_judgement()) is True

    passed_records = [
        r
        for r in caplog.records
        if "PASSED" in r.getMessage() and "Consensus" in r.getMessage()
    ]
    assert passed_records, "expected at least one Consensus PASSED log line"
    assert any(
        "decision pending escalation" in r.getMessage() for r in passed_records
    ), "PASSED log must disclaim that final decision still depends on escalation"


def test_failed_log_includes_mode_prefix(caplog: pytest.LogCaptureFixture) -> None:
    """Failure path: dissenting guard and mode prefix surface so audit
    readers can tell single-judge gate failures from multi-judge ones."""
    engine = ConsensusEngine()
    bad = _passing_judgement().model_copy(update={"hallucination_risk": "HIGH"})
    with caplog.at_level(logging.WARNING, logger="src.safety.consensus_engine"):
        assert engine.evaluate_consensus(bad) is False
    assert any(
        "[single-judge]" in r.getMessage() and "hallucination_guard" in r.getMessage()
        for r in caplog.records
    )
