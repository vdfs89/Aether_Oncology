# tests/test_safety_policy.py
"""
Testes unitários para a SafetyPolicy.

Cobre os métodos síncronos evaluate_prediction e evaluate_tool_output.
O método evaluate_response é async e depende de LLM — testado separadamente
via mocks nos testes de integração do ClinicalInferenceRuntime.
"""

import pytest

from src.safety.policy import SafetyPolicy


@pytest.fixture
def policy():
    """Instância limpa de SafetyPolicy para cada teste."""
    return SafetyPolicy()


# ---------------------------------------------------------------------------
# evaluate_prediction
# ---------------------------------------------------------------------------


def test_prediction_low_confidence_warning(policy):
    """confidence=0.5 (entre 0.4 e 0.6) → WARNING + requires_physician_review."""
    j = policy.evaluate_prediction(confidence=0.5, risk_level="LOW")
    assert j.escalation_level == "WARNING"
    assert j.requires_physician_review is True
    assert j.approved is True  # WARNING não bloqueia, apenas sinaliza


def test_prediction_very_low_confidence_hard_stop(policy):
    """confidence=0.35 (< 0.4) → HARD_STOP + approved=False."""
    j = policy.evaluate_prediction(confidence=0.35, risk_level="LOW")
    assert j.escalation_level == "HARD_STOP"
    assert j.approved is False
    assert j.requires_physician_review is True


def test_prediction_high_confidence_none(policy):
    """confidence=0.85 (>= 0.8) → NONE + approved=True + evidence_strength HIGH."""
    j = policy.evaluate_prediction(confidence=0.85, risk_level="LOW")
    assert j.escalation_level == "NONE"
    assert j.approved is True
    assert j.requires_physician_review is False
    assert j.evidence_strength == "HIGH"


def test_prediction_high_risk_forces_review(policy):
    """confidence=0.85 com risk_level=HIGH → requires_physician_review=True apesar do high confidence."""
    j = policy.evaluate_prediction(confidence=0.85, risk_level="HIGH")
    assert j.requires_physician_review is True
    assert j.escalation_level == "NONE"  # HIGH risk não muda escalation, só review
    assert j.approved is True


# ---------------------------------------------------------------------------
# evaluate_tool_output
# ---------------------------------------------------------------------------


def test_tool_output_missing_source(policy):
    """Output sem 'source' → missing_citations não vazio + WARNING."""
    j = policy.evaluate_tool_output("biomarker", {"result": "TP53 mutation detected"})
    assert len(j.missing_citations) > 0
    assert "source ausente" in j.missing_citations
    assert j.approved is False
    assert j.escalation_level == "WARNING"
    assert j.requires_physician_review is True


def test_tool_output_missing_evidence_level(policy):
    """Output com 'source' mas sem 'evidence_level' → missing_citations contém 'evidence_level ausente'."""
    j = policy.evaluate_tool_output(
        "biomarker", {"result": "EGFR+", "source": "INCA 2024"}
    )
    assert "evidence_level ausente" in j.missing_citations
    assert j.approved is False
    assert j.escalation_level == "WARNING"


def test_tool_output_complete(policy):
    """Output com 'source' e 'evidence_level' → approved=True, NONE."""
    j = policy.evaluate_tool_output(
        "biomarker",
        {"result": "EGFR+", "source": "INCA 2024", "evidence_level": "I"},
    )
    assert j.approved is True
    assert j.escalation_level == "NONE"
    assert len(j.missing_citations) == 0
    assert j.requires_physician_review is False
