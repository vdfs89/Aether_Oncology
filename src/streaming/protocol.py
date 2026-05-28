from typing import Any, Dict, Optional
from pydantic import BaseModel

class BaseEventMetadata(BaseModel):
    type: str
    sessionId: str = "default-session"
    patientId: str = "default-patient"
    traceId: str

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
