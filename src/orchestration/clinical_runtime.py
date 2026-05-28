import time
import uuid
import logging
from typing import AsyncGenerator, Dict, Any

from src.streaming.protocol import TokenEvent, StatusEvent, CompleteEvent, ErrorEvent, JudgementStartedEvent, JudgementCompletedEvent, EscalationTriggeredEvent
from src.streaming.sse import format_sse
from src.providers.router import ClinicalModelRouter, ClinicalTaskProfile
from src.safety.clinical_judge import ClinicalJudge

logger = logging.getLogger(__name__)

class ClinicalInferenceRuntime:
    def __init__(self):
        self.router = ClinicalModelRouter()
        self.judge = ClinicalJudge()
        
    async def stream_clinical_response(self, payload: Dict[str, Any]) -> AsyncGenerator[str, None]:
        trace_id = str(uuid.uuid4())
        
        messages = payload.get("messages", [])
        context = payload.get("context", {})
        task_info = payload.get("task", {})
        
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
                status="generating_internally",
                traceId=trace_id,
                sessionId=session_id,
                patientId=patient_id
            ))
            
            # Collect full response internally
            full_response = ""
            async for token in provider.stream_inference(messages, context):
                full_response += token
                
            # Run Clinical Judge
            yield format_sse(JudgementStartedEvent(
                traceId=trace_id,
                sessionId=session_id,
                patientId=patient_id
            ))
            
            # Original prompt is the last user message
            user_msg = next((m["content"] for m in reversed(messages) if m.get("role") == "user"), "")
            
            judgement = await self.judge.evaluate(user_msg, full_response)
            
            yield format_sse(JudgementCompletedEvent(
                judgement=judgement.model_dump(),
                traceId=trace_id,
                sessionId=session_id,
                patientId=patient_id
            ))
            
            if judgement.escalation_level != "NONE":
                yield format_sse(EscalationTriggeredEvent(
                    level=judgement.escalation_level,
                    reason="Safety threshold breached",
                    traceId=trace_id,
                    sessionId=session_id,
                    patientId=patient_id
                ))
            
            # If a HARD_STOP is required, we don't stream the content
            if judgement.escalation_level == "HARD_STOP":
                yield format_sse(ErrorEvent(
                    error={"code": "SAFETY_VIOLATION", "message": "Response blocked by Clinical Judge.", "severity": "critical"},
                    traceId=trace_id,
                    sessionId=session_id,
                    patientId=patient_id
                ))
                return

            # Proceed to stream final output
            yield format_sse(StatusEvent(
                status="streaming",
                traceId=trace_id,
                sessionId=session_id,
                patientId=patient_id
            ))
            
            # Yield in chunks
            chunk_size = 20
            for i in range(0, len(full_response), chunk_size):
                yield format_sse(TokenEvent(
                    chunk=full_response[i:i+chunk_size],
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
