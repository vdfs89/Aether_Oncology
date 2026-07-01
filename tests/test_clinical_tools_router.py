# tests/test_clinical_tools_router.py
"""
Testes de integração para a rota de clinical tools.

Cobre os endpoints:
- POST /api/v1/tools/biomarkers
- POST /api/v1/tools/therapy
- POST /api/v1/tools/guidelines

Usa unittest.mock / pytest monkeypatch para simular retornos dos adapters
e validar o comportamento da SafetyPolicy e o formato da ToolResponse.
"""

from fastapi.testclient import TestClient
from pydantic import BaseModel

from src.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Mocks / Dublês Pydantic para os testes
# ---------------------------------------------------------------------------


class DummyBiomarkerResult(BaseModel):
    patient_profile: dict
    risk_factors: list
    overall_risk: str
    source: str
    evidence_level: str
    version: str
    recommendations: list


class DummyTherapyResult(BaseModel):
    risk_level: str
    stage_estimate: str
    options: list
    recommended_first_line: str
    source: str
    evidence_level: str
    version: str
    notes: str


class DummyRAGResult(BaseModel):
    query: str
    answer: str
    references: list
    source: str
    evidence_level: str
    confidence: float
    disclaimer: str


# ---------------------------------------------------------------------------
# Testes
# ---------------------------------------------------------------------------


def test_biomarkers_success_no_warning(monkeypatch):
    """POST /api/v1/tools/biomarkers retorna 200 com requires_physician_review=False quando o output contém source e evidence_level."""
    dummy_result = DummyBiomarkerResult(
        patient_profile={},
        risk_factors=[],
        overall_risk="LOW",
        source="INCA 2024",
        evidence_level="I",
        version="2025.1",
        recommendations=[],
    )

    # Mock do analyze do biomarker adapter
    monkeypatch.setattr(
        "src.api.routes.clinical_tools._biomarker.analyze",
        lambda **kwargs: dummy_result,
    )

    payload = {
        "age": 45,
        "tobacco_use": "No",
        "alcohol_use": "No",
        "socioeconomic_status": "Middle",
        "country": "Brazil",
        "gender": "M",
    }

    resp = client.post("/api/v1/tools/biomarkers", json=payload)
    assert resp.status_code == 200

    body = resp.json()
    assert "data" in body
    assert body["safety_warning"] is None
    assert body["requires_physician_review"] is False
    assert body["data"]["source"] == "INCA 2024"
    assert body["data"]["evidence_level"] == "I"


def test_therapy_warning_missing_source(monkeypatch):
    """POST /api/v1/tools/therapy retorna 200 com safety_warning preenchido quando faltar source."""
    dummy_result = DummyTherapyResult(
        risk_level="HIGH",
        stage_estimate="Avançado",
        options=[],
        recommended_first_line="Cirurgia",
        source="",  # Faltando source
        evidence_level="I",
        version="2025.1",
        notes="",
    )

    # Mock do match do therapy matcher
    monkeypatch.setattr(
        "src.api.routes.clinical_tools._therapy.match",
        lambda *args, **kwargs: dummy_result,
    )

    payload = {"risk_level": "HIGH"}

    resp = client.post("/api/v1/tools/therapy", json=payload)
    assert resp.status_code == 200

    body = resp.json()
    assert "data" in body  # O campo data sempre é retornado
    assert body["safety_warning"] is not None
    assert "source ausente" in body["safety_warning"]
    assert body["requires_physician_review"] is True


def test_guidelines_warning_missing_evidence_level(monkeypatch):
    """POST /api/v1/tools/guidelines retorna 200 com safety_warning preenchido quando faltar evidence_level."""
    dummy_result = DummyRAGResult(
        query="cigarro",
        answer="Tabaco é nocivo.",
        references=[],
        source="INCA 2024",
        evidence_level="",  # Faltando evidence_level
        confidence=0.9,
        disclaimer="",
    )

    # Mock do query do clinical RAG
    monkeypatch.setattr(
        "src.api.routes.clinical_tools._rag.query", lambda *args, **kwargs: dummy_result
    )

    payload = {"question": "cigarro"}

    resp = client.post("/api/v1/tools/guidelines", json=payload)
    assert resp.status_code == 200

    body = resp.json()
    assert "data" in body  # O campo data sempre é retornado
    assert body["safety_warning"] is not None
    assert "evidence_level ausente" in body["safety_warning"]
    assert body["requires_physician_review"] is True
