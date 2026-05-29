from typing import List, Literal

from pydantic import BaseModel, Field


class ClinicalJudgement(BaseModel):
    approved: bool = Field(
        description="Whether the output is clinically safe to proceed"
    )
    confidence: float = Field(
        ge=0.0, le=1.0, description="Confidence score from 0.0 to 1.0"
    )
    hallucination_risk: Literal["LOW", "MEDIUM", "HIGH"] = Field(
        description="Risk of hallucination"
    )
    evidence_strength: Literal["LOW", "MODERATE", "HIGH"] = Field(
        description="Strength of clinical evidence"
    )
    contradictions: List[str] = Field(
        default_factory=list, description="List of detected clinical contradictions"
    )
    missing_citations: List[str] = Field(
        default_factory=list, description="Claims lacking proper citation"
    )
    requires_physician_review: bool = Field(
        description="If the physician MUST review this before execution"
    )
    escalation_level: Literal["NONE", "WARNING", "HARD_STOP"] = Field(
        description="Escalation action required"
    )
