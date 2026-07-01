# tests/test_clinical_tools.py
"""
Testes unitários e de integração para as Clinical Tools e seus endpoints REST.

Cobre:
- Lógica de regras e metadados nos adapters (BiomarkerAdapter, TherapyMatcher, ClinicalRAG).
- Endpoints REST (/api/v1/tools/biomarkers, /api/v1/tools/therapy, /api/v1/tools/guidelines).
- Regras de SafetyPolicy (warning se source ou evidence_level ausentes).
"""

import pytest
from fastapi.testclient import TestClient
from pydantic import BaseModel

from src.main import app
from src.tools.biomarker_adapter import BiomarkerAdapter
from src.tools.clinical_rag import ClinicalRAG
from src.tools.therapy_matcher import TherapyMatcher

client = TestClient(app)


# ---------------------------------------------------------------------------
# Mocks / Dublês Pydantic para testes de integração HTTP
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
# 1. Testes Unitários dos Adapters
# ---------------------------------------------------------------------------


def test_biomarker_high_risk_both():
    """Tabaco=Yes + Álcool=Yes -> HIGH risk, evidence_level=I"""
    adapter = BiomarkerAdapter()
    res = adapter.analyze(
        age=45,
        tobacco_use="Yes",
        alcohol_use="Yes",
        socioeconomic_status="Middle",
        country="Brazil",
        gender="M",
    )
    assert res.overall_risk == "HIGH"
    assert res.evidence_level == "I"
    assert res.source == "INCA 2024; NCCN Head and Neck v2.2025"
    assert len(res.risk_factors) >= 2


def test_biomarker_medium_risk_one():
    """Tabaco=Yes + Álcool=No -> MEDIUM risk, evidence_level=I"""
    adapter = BiomarkerAdapter()
    res = adapter.analyze(
        age=45,
        tobacco_use="Yes",
        alcohol_use="No",
        socioeconomic_status="Middle",
        country="Brazil",
        gender="M",
    )
    assert res.overall_risk == "MEDIUM"
    assert res.evidence_level == "I"


def test_biomarker_age_over_60():
    """Idade > 60 -> Fator 'Idade avançada' com severity='MEDIUM'"""
    adapter = BiomarkerAdapter()
    res = adapter.analyze(
        age=65,
        tobacco_use="No",
        alcohol_use="No",
        socioeconomic_status="Middle",
        country="Brazil",
        gender="F",
    )
    assert res.overall_risk == "MEDIUM"
    assert res.evidence_level == "II"
    factor = next(rf for rf in res.risk_factors if rf.name == "Idade avançada")
    assert factor.severity == "MEDIUM"


def test_biomarker_age_over_70():
    """Idade > 70 -> Fator 'Idade avançada' com severity='HIGH'"""
    adapter = BiomarkerAdapter()
    res = adapter.analyze(
        age=75,
        tobacco_use="No",
        alcohol_use="No",
        socioeconomic_status="Middle",
        country="Brazil",
        gender="F",
    )
    assert res.overall_risk == "MEDIUM"
    factor = next(rf for rf in res.risk_factors if rf.name == "Idade avançada")
    assert factor.severity == "HIGH"


def test_biomarker_low_socioeconomic():
    """Socioeconomic=Low -> Fator 'Baixo acesso a cuidados' com severity='MEDIUM'"""
    adapter = BiomarkerAdapter()
    res = adapter.analyze(
        age=45,
        tobacco_use="No",
        alcohol_use="No",
        socioeconomic_status="Low",
        country="Brazil",
        gender="M",
    )
    assert res.overall_risk == "MEDIUM"
    factor = next(rf for rf in res.risk_factors if rf.name == "Baixo acesso a cuidados")
    assert factor.severity == "MEDIUM"


def test_biomarker_low_risk_no_factors():
    """Sem fatores -> LOW risk, evidence_level=II"""
    adapter = BiomarkerAdapter()
    res = adapter.analyze(
        age=45,
        tobacco_use="No",
        alcohol_use="No",
        socioeconomic_status="Middle",
        country="Brazil",
        gender="M",
    )
    assert res.overall_risk == "LOW"
    assert res.evidence_level == "II"
    assert len(res.risk_factors) == 0


@pytest.mark.parametrize(
    "risk_level,expected_stage,expected_first_line",
    [
        (
            "HIGH",
            "Moderado/Avançado (Estágio III-IV)",
            "Cirurgia + Radioterapia adjuvante",
        ),
        (
            "MEDIUM",
            "Inicial/Intermediário (Estágio I-II)",
            "Excisão cirúrgica local ampliada",
        ),
        (
            "LOW",
            "Precoce (Estágio 0-I suspeito)",
            "Vigilância ativa com retorno em 6 meses",
        ),
    ],
)
def test_therapy_matcher_options(risk_level, expected_stage, expected_first_line):
    """Opções terapêuticas mapeadas corretamente por risk_level."""
    matcher = TherapyMatcher()
    res = matcher.match(risk_level)
    assert res.stage_estimate == expected_stage
    assert res.recommended_first_line == expected_first_line
    assert res.source == "NCCN Head and Neck v2.2025; ASCO Guidelines 2024"
    assert res.evidence_level in ["I", "II"]
    assert len(res.options) > 0


def test_clinical_rag_match():
    """Pesquisa RAG com match de keyword (tabaco) retorna evidence_level I."""
    rag = ClinicalRAG()
    res = rag.query("Quais os riscos do fumo?")
    assert "tabagismo" in res.answer.lower()
    assert "INCA 2024" in res.source
    assert res.evidence_level == "I"
    assert res.confidence == 0.92


def test_clinical_rag_no_match():
    """Pesquisa RAG sem match retorna resposta genérica com evidence_level III."""
    rag = ClinicalRAG()
    res = rag.query("Etiologia desconhecida")
    assert "Não encontramos diretrizes locais específicas" in res.answer
    assert res.source == "Diretrizes Gerais"
    assert res.evidence_level == "III"
    assert res.confidence == 0.3


# ---------------------------------------------------------------------------
# 2. Testes de Integração HTTP (com Mocks e Casos Reais)
# ---------------------------------------------------------------------------


def test_api_biomarkers_success_no_warning():
    """POST /api/v1/tools/biomarkers retorna 200 com requires_physician_review=False quando o output contém source e evidence_level."""
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
    assert body["data"]["overall_risk"] == "LOW"


def test_api_therapy_success_no_warning():
    """POST /api/v1/tools/therapy retorna 200 com requires_physician_review=False quando o output contém os metadados clínicos obrigatórios."""
    payload = {"risk_level": "medium"}
    resp = client.post("/api/v1/tools/therapy", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert body["safety_warning"] is None
    assert body["requires_physician_review"] is False
    assert body["data"]["recommended_first_line"] == "Excisão cirúrgica local ampliada"


def test_api_guidelines_success_no_warning():
    """POST /api/v1/tools/guidelines retorna 200 com requires_physician_review=False quando o output contém os metadados clínicos obrigatórios."""
    payload = {"question": "fumo"}
    resp = client.post("/api/v1/tools/guidelines", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert body["safety_warning"] is None
    assert body["requires_physician_review"] is False
    assert "tabagismo" in body["data"]["answer"].lower()


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
    monkeypatch.setattr(
        "src.api.routes.clinical_tools._therapy.match",
        lambda *args, **kwargs: dummy_result,
    )

    payload = {"risk_level": "HIGH"}
    resp = client.post("/api/v1/tools/therapy", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body  # data continua presente
    assert body["safety_warning"] is not None
    assert "source ausente" in body["safety_warning"]
    assert body["requires_physician_review"] is True


def test_guidelines_warning_missing_evidence_level(monkeypatch):
    """POST /api/v1/tools/guidelines retorna 200 com safety_warning preenchido quando faltar evidence_level."""
    dummy_result = DummyRAGResult(
        query="fumo",
        answer="Fumo é nocivo.",
        references=[],
        source="INCA 2024",
        evidence_level="",  # Faltando evidence_level
        confidence=0.9,
        disclaimer="",
    )
    monkeypatch.setattr(
        "src.api.routes.clinical_tools._rag.query", lambda *args, **kwargs: dummy_result
    )

    payload = {"question": "fumo"}
    resp = client.post("/api/v1/tools/guidelines", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body  # data continua presente
    assert body["safety_warning"] is not None
    assert "evidence_level ausente" in body["safety_warning"]
    assert body["requires_physician_review"] is True
