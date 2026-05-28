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
