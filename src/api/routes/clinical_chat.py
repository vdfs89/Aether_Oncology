from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from src.orchestration.clinical_runtime import ClinicalInferenceRuntime
from src.services.approval_store import approval_repository

router = APIRouter(tags=["Clinical AI Copilot"])
runtime = ClinicalInferenceRuntime()


class ChatRequest(BaseModel):
    messages: List[Dict[str, Any]]
    context: Optional[Dict[str, Any]] = {}
    task: Optional[Dict[str, Any]] = {}


class PendingApprovalModel(BaseModel):
    approvalRequestId: str
    plan: List[Dict[str, Any]]
    riskLevel: str
    rationale: List[str]
    requestedAt: int
    expiresAt: int


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
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/approvals", response_model=List[PendingApprovalModel])
async def list_approvals():
    """List all active, unexpired pending approvals."""
    return approval_repository.list_all()


@router.get("/approvals/{approval_id}", response_model=PendingApprovalModel)
async def get_approval(approval_id: str):
    """Retrieve a specific pending approval by ID."""
    appr = approval_repository.find_by_id(approval_id)
    if not appr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Approval request {approval_id} not found or expired",
        )
    return appr


@router.post("/approvals", status_code=status.HTTP_201_CREATED)
async def create_approval(approval: PendingApprovalModel):
    """Persist a new pending approval requested by the runtime."""
    approval_repository.save(approval.model_dump())
    return {"status": "success", "message": "Approval request persisted"}


@router.delete("/approvals/{approval_id}")
async def delete_approval(approval_id: str):
    """Delete a pending approval once resolved by the physician."""
    approval_repository.delete(approval_id)
    return {"status": "success", "message": "Approval request deleted"}
