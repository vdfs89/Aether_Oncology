# src/api/approval_router.py
"""
Endpoints REST para o physician approval flow.

Gerencia o ciclo de vida de solicitações de aprovação médica:
PENDING → RESOLVED | EXPIRED.

O approval_repository global é injetado via FastAPI Depends() — nenhuma
instância adicional de SQLiteApprovalRepository é criada aqui.
"""

import time
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from src.services.approval_store import (
    APPROVAL_TIMEOUT_SECONDS,
    FALLBACK_PHYSICIAN_ID,
    SQLiteApprovalRepository,
)

router = APIRouter(prefix="/approval", tags=["Clinical Approval"])


# ---------------------------------------------------------------------------
# Schemas Pydantic
# ---------------------------------------------------------------------------


class ApprovalRequestBody(BaseModel):
    """Payload para criação de uma nova solicitação de aprovação médica."""

    plan: dict = Field(..., description="Plano clínico proposto pelo copiloto")
    riskLevel: str = Field(..., description="Nível de risco: HIGH | MEDIUM | LOW")
    rationale: dict = Field(
        ...,
        description="Justificativa do Clinical Judge (hallucination_risk, evidence_strength)",
    )
    sessionId: str = Field(..., description="ID da sessão clínica ativa")
    patientId: str = Field(..., description="ID do paciente")


class ApprovalDecisionBody(BaseModel):
    """Payload com a decisão do médico sobre uma solicitação pendente."""

    decision: str = Field(
        ..., description="Decisão do médico: APPROVED | REJECTED | OVERRIDE"
    )
    decided_by: str = Field(..., description="ID do médico responsável pela decisão")
    override_reason: Optional[str] = Field(
        None, description="Justificativa obrigatória quando decision == OVERRIDE"
    )


class ApprovalRequestResponse(BaseModel):
    """Resposta da criação de uma solicitação de aprovação."""

    approval_request_id: str


class ApprovalResolveResponse(BaseModel):
    """Resposta da resolução de uma solicitação de aprovação."""

    status: str
    decision: str


# ---------------------------------------------------------------------------
# Dependency injection
# ---------------------------------------------------------------------------


def get_repository() -> SQLiteApprovalRepository:
    """Injeta o singleton approval_repository de src.services.approval_store."""
    from src.services.approval_store import approval_repository

    return approval_repository


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/request",
    status_code=status.HTTP_201_CREATED,
    response_model=ApprovalRequestResponse,
)
async def request_approval(
    body: ApprovalRequestBody,
    repo: SQLiteApprovalRepository = Depends(get_repository),
):
    """Cria uma nova solicitação de aprovação médica.

    Gera um approval_request_id único e calcula o expires_at com base
    no APPROVAL_TIMEOUT_SECONDS configurado no ambiente.
    """
    approval_request_id = str(uuid.uuid4())
    now_ms = int(time.time() * 1000)
    expires_at = int((time.time() + APPROVAL_TIMEOUT_SECONDS) * 1000)

    repo.save(
        {
            "approvalRequestId": approval_request_id,
            "plan": body.plan,
            "riskLevel": body.riskLevel,
            "rationale": body.rationale,
            "requestedAt": now_ms,
            "expiresAt": expires_at,
        }
    )

    return ApprovalRequestResponse(approval_request_id=approval_request_id)


@router.post(
    "/resolve/{approval_request_id}",
    response_model=ApprovalResolveResponse,
)
async def resolve_approval(
    approval_request_id: str,
    body: ApprovalDecisionBody,
    repo: SQLiteApprovalRepository = Depends(get_repository),
):
    """Médico aprova, rejeita ou faz override de uma solicitação.

    Regras de validação:
      - 403 se decided_by for o FALLBACK_PHYSICIAN_ID (não autenticado).
      - 404 se o approval_request_id não existir.
      - 409 se a solicitação já estiver RESOLVED ou EXPIRED.
    """
    # Rejeitar médico não autenticado
    if body.decided_by == FALLBACK_PHYSICIAN_ID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado. Médico precisa estar autenticado para resolver aprovações.",
        )

    # Buscar registro completo (qualquer status)
    approval = repo.find_raw(approval_request_id)
    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitação de aprovação não encontrada.",
        )

    # Rejeitar se já resolvida ou expirada
    current_status = approval.get("status")
    if current_status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Solicitação não está pendente. Status atual: {current_status}",
        )

    # Resolver
    now_ms = int(time.time() * 1000)
    success = repo.resolve(
        approval_request_id=approval_request_id,
        decision=body.decision,
        decided_by=body.decided_by,
        decided_at=now_ms,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha interna ao resolver a solicitação.",
        )

    return ApprovalResolveResponse(status="RESOLVED", decision=body.decision)


@router.get("/pending")
async def list_pending(
    repo: SQLiteApprovalRepository = Depends(get_repository),
):
    """Lista todas as solicitações de aprovação com status PENDING."""
    return repo.list_all()


@router.get("/{approval_request_id}")
async def get_approval(
    approval_request_id: str,
    repo: SQLiteApprovalRepository = Depends(get_repository),
):
    """Retorna o estado completo de uma solicitação (PENDING, RESOLVED ou EXPIRED).

    Usa find_raw() para retornar inclusive decision, decided_by e decided_at
    em aprovações já resolvidas — necessário para auditoria.
    """
    approval = repo.find_raw(approval_request_id)
    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitação de aprovação não encontrada.",
        )
    return approval
