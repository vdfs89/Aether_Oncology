# src/api/routes/clinical_tools.py
"""
Endpoints REST para as clinical tools.

Cada resposta passa por SafetyPolicy.evaluate_tool_output() antes de retornar.
Se requires_physician_review=True → inclui campo "safety_warning" na resposta.
"""

from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from src.safety.policy import SafetyPolicy
from src.tools.biomarker_adapter import BiomarkerAdapter
from src.tools.clinical_rag import ClinicalRAG
from src.tools.therapy_matcher import TherapyMatcher

router = APIRouter(prefix="/tools", tags=["Clinical Tools"])

# Instâncias stateless
_biomarker = BiomarkerAdapter()
_therapy = TherapyMatcher()
_rag = ClinicalRAG()
_policy = SafetyPolicy()


class BiomarkerRequest(BaseModel):
    age: int
    tobacco_use: str
    alcohol_use: str
    socioeconomic_status: str
    country: str
    gender: str
    survival_rate: Optional[float] = None


class TherapyRequest(BaseModel):
    risk_level: str
    biomarkers: Optional[dict] = None


class RAGRequest(BaseModel):
    question: str


class ToolResponse(BaseModel):
    data: dict
    safety_warning: Optional[List[str]] = None
    requires_physician_review: bool = False


@router.post("/biomarkers", response_model=ToolResponse)
def analyze_biomarkers(body: BiomarkerRequest) -> ToolResponse:
    """Analisa biomarcadores de risco e retorna resultado auditável."""
    result = _biomarker.analyze(**body.model_dump())
    judgement = _policy.evaluate_tool_output(
        "biomarker_adapter",
        result.model_dump(),
    )
    return ToolResponse(
        data=result.model_dump(),
        safety_warning=judgement.missing_citations
        if judgement.requires_physician_review
        else None,
        requires_physician_review=judgement.requires_physician_review,
    )


@router.post("/therapy", response_model=ToolResponse)
def match_therapy(body: TherapyRequest) -> ToolResponse:
    """Retorna opções terapêuticas rankeadas por nível de evidência."""
    result = _therapy.match(body.risk_level, body.biomarkers)
    judgement = _policy.evaluate_tool_output(
        "therapy_matcher",
        result.model_dump(),
    )
    return ToolResponse(
        data=result.model_dump(),
        safety_warning=judgement.missing_citations
        if judgement.requires_physician_review
        else None,
        requires_physician_review=judgement.requires_physician_review,
    )


@router.post("/guidelines", response_model=ToolResponse)
def query_guidelines(body: RAGRequest) -> ToolResponse:
    """Consulta guidelines clínicos com fontes auditáveis."""
    result = _rag.query(body.question)
    judgement = _policy.evaluate_tool_output(
        "clinical_rag",
        result.model_dump(),
    )
    return ToolResponse(
        data=result.model_dump(),
        safety_warning=judgement.missing_citations
        if judgement.requires_physician_review
        else None,
        requires_physician_review=judgement.requires_physician_review,
    )
