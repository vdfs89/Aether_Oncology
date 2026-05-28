from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from src.orchestration.clinical_runtime import ClinicalInferenceRuntime

router = APIRouter(tags=["Clinical AI Copilot"])
runtime = ClinicalInferenceRuntime()

class ChatRequest(BaseModel):
    messages: List[Dict[str, Any]]
    context: Optional[Dict[str, Any]] = {}
    task: Optional[Dict[str, Any]] = {}

@router.post("/chat", response_class=StreamingResponse)
async def clinical_chat_endpoint(request: ChatRequest):
    """
    Endpoint SSE real para o Aether Oncology.
    Substitui o mock pelo runtime dinâmico.
    """
    payload = request.model_dump()
    
    return StreamingResponse(
        runtime.stream_clinical_response(payload),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
