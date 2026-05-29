import json
import uuid
from typing import Any, Dict

from pydantic import BaseModel, Field


class BaseEventMetadata(BaseModel):
    """
    Envelope base para todos os eventos SSE do Clinical Runtime.
    Inclui campos de observabilidade completos para replay, auditoria e tracing.
    """

    type: str
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sequence: int = 0
    # Traceability
    sessionId: str = "default-session"
    patientId: str = "default-patient"
    traceId: str = Field(default_factory=lambda: str(uuid.uuid4()))
    # Provider observability
    provider: str = ""
    model: str = ""
    timestamp: float = Field(default_factory=lambda: __import__("time").time())


class TokenEvent(BaseEventMetadata):
    type: str = "token"
    chunk: str


class StatusEvent(BaseEventMetadata):
    type: str = "status"
    status: str


class ErrorEvent(BaseEventMetadata):
    type: str = "error"
    error: Dict[str, Any]


class CompleteEvent(BaseEventMetadata):
    type: str = "complete"
    total_tokens: int = 0


class JudgementStartedEvent(BaseEventMetadata):
    type: str = "judgement_started"


class JudgementCompletedEvent(BaseEventMetadata):
    type: str = "judgement_completed"
    judgement: Dict[str, Any]


class HallucinationDetectedEvent(BaseEventMetadata):
    type: str = "hallucination_detected"
    details: str


class EscalationTriggeredEvent(BaseEventMetadata):
    type: str = "escalation_triggered"
    level: str
    reason: str


class RoutingDecisionEvent(BaseEventMetadata):
    """
    Emitido ANTES da inferência começar.
    Descreve QUAL provider foi selecionado e POR QUÊ.
    Ouro para auditoria, billing e observabilidade.
    """

    type: str = "routing_decision"
    rationale: str
    estimated_latency_ms: int
    estimated_cost: float
    fallback_chain: list[str] = Field(default_factory=list)


class InferenceEnvelopeEvent(BaseEventMetadata):
    """
    Emitido APÓS coleta completa da resposta, ANTES do Judge.
    Captura telemetria real de latência e custo para o InspectorHUD e replay.
    """

    type: str = "inference_envelope"
    prompt_tokens: int
    completion_tokens: int
    latency_ms: int
    cost_estimate: float
    raw_response_length: int


def format_sse(event: BaseEventMetadata) -> str:
    """
    Formata um modelo Pydantic em string SSE padrão.
    A quebra dupla \\n\\n delimita mensagens no protocolo SSE.
    """
    data_str = event.model_dump_json()
    return f"data: {data_str}\n\n"


def format_raw_sse(data: dict) -> str:
    """
    Formata um dicionário arbitrário em SSE. Útil para eventos simples ou debug.
    """
    data_str = json.dumps(data)
    return f"data: {data_str}\n\n"
