import time
import uuid
import logging
from typing import AsyncGenerator, Dict, Any

from src.streaming.protocol import TokenEvent, StatusEvent, CompleteEvent, ErrorEvent
from src.streaming.sse import format_sse
from src.providers.router import ClinicalModelRouter, ClinicalTaskProfile

logger = logging.getLogger(__name__)

class ClinicalInferenceRuntime:
    def __init__(self):
        self.router = ClinicalModelRouter()
        
    async def stream_clinical_response(self, payload: Dict[str, Any]) -> AsyncGenerator[str, None]:
        trace_id = str(uuid.uuid4())
        
        messages = payload.get("messages", [])
        context = payload.get("context", {})
        task_info = payload.get("task", {})
        
        # In frontend openai-compatible.provider.ts we added task and context
        # but wait, frontend protocol metadata needs sessionId and patientId. 
        # Since frontend doesn't send them directly in the body, we fallback.
        # Ideally, we should parse X-Patient-Id from headers. For now:
        patient_id = "default-patient"
        session_id = "default-session"

        profile = ClinicalTaskProfile(
            intent=task_info.get("intent", "conversational"),
            risk_level=task_info.get("risk_level", "LOW"),
            needs_reasoning=task_info.get("needs_reasoning", False),
            needs_low_latency=task_info.get("needs_low_latency", True),
            needs_multimodal=task_info.get("needs_multimodal", False)
        )
        
        try:
            provider = self.router.route(profile)
            yield format_sse(StatusEvent(
                status="streaming", # The frontend schema enum expects "streaming" rather than "ROUTING"
                traceId=trace_id,
                sessionId=session_id,
                patientId=patient_id
            ))
            
            async for token in provider.stream_inference(messages, context):
                yield format_sse(TokenEvent(
                    chunk=token,
                    traceId=trace_id,
                    sessionId=session_id,
                    patientId=patient_id
                ))
                
            yield format_sse(CompleteEvent(
                traceId=trace_id,
                sessionId=session_id,
                patientId=patient_id
            ))
            
        except Exception as e:
            logger.error(f"Inference error in ClinicalRuntime: {e}")
            yield format_sse(ErrorEvent(
                error={"code": "INFERENCE_FAIL", "message": str(e), "severity": "high"},
                traceId=trace_id,
                sessionId=session_id,
                patientId=patient_id
            ))
