import time
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from src.orchestration.clinical_runtime import ClinicalInferenceRuntime
from src.services.approval_store import (
    APPROVAL_TIMEOUT_SECONDS,
    FALLBACK_PHYSICIAN_ID,
    STATUS_PENDING,
    approval_repository,
)

router = APIRouter(tags=["Clinical AI Copilot"])


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


class ResolveApprovalModel(BaseModel):
    decision: Literal["APPROVED", "REJECTED", "MODIFIED", "ESCALATED"]
    physician_id: str


@router.post("/chat", response_class=StreamingResponse)
async def clinical_chat_endpoint(request: ChatRequest, fastapi_req: Request):
    """
    Endpoint SSE real para o Aether Oncology.
    Substitui o mock pelo runtime dinâmico.
    """
    payload = request.model_dump()
    runtime: ClinicalInferenceRuntime = fastapi_req.app.state.runtime

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


@router.post("/approvals/{approval_id}/resolve")
async def resolve_approval(approval_id: str, body: ResolveApprovalModel):
    """Resolve a pending approval with a physician decision.

    Authorization (Fix #2): the fallback physician sentinel ID is never
    accepted — clinical actions require a real authenticated identity.

    Timeout (Fix #3): the server enforces APPROVAL_TIMEOUT_SECONDS independent
    of the FE timer. Late attempts mark the approval EXPIRED and return 408.
    """
    # Fix #2 — defense in depth: BE refuses fallback ID regardless of what FE
    # sends.
    physician_id = (body.physician_id or "").strip()
    if not physician_id or physician_id == FALLBACK_PHYSICIAN_ID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Fallback physician cannot authorize clinical actions",
        )

    record = approval_repository.find_raw(approval_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Approval request {approval_id} not found",
        )

    if record["status"] != STATUS_PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Approval request {approval_id} is already {record['status'].lower()}"
            ),
        )

    # Fix #3 — server-side timeout enforcement.
    now_ms = int(time.time() * 1000)
    age_seconds = (now_ms - record["requestedAt"]) / 1000.0
    if age_seconds > APPROVAL_TIMEOUT_SECONDS:
        approval_repository.mark_expired(approval_id)
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail=(
                f"Approval request {approval_id} expired after "
                f"{APPROVAL_TIMEOUT_SECONDS}s (age={age_seconds:.1f}s)"
            ),
        )

    ok = approval_repository.resolve(
        approval_request_id=approval_id,
        decision=body.decision,
        decided_by=physician_id,
        decided_at=now_ms,
    )
    if not ok:
        # Lost a race with the cleanup worker / a concurrent resolve.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Approval request {approval_id} was concurrently modified",
        )

    return {
        "status": "success",
        "approvalRequestId": approval_id,
        "decision": body.decision,
        "decided_by": physician_id,
        "decided_at": now_ms,
    }


@router.delete("/approvals/{approval_id}")
async def delete_approval(approval_id: str):
    """Delete a pending approval. Reserved for administrative/test cleanup;
    physician decisions should go through POST /resolve so the audit trail
    keeps the decision record."""
    approval_repository.delete(approval_id)
    return {"status": "success", "message": "Approval request deleted"}
