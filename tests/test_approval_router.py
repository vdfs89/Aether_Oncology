# tests/test_approval_router.py
"""
Testes de integração para o approval_router.

Usa pytest + httpx AsyncClient contra a app FastAPI real.
O SQLiteApprovalRepository é o singleton global — cada teste cria
seus próprios registros para evitar acoplamento entre testes.
"""

import pytest
import httpx
from fastapi.testclient import TestClient

from src.main import app
from src.services.approval_store import FALLBACK_PHYSICIAN_ID


client = TestClient(app)

BASE = "/api/v1/approval"

VALID_PAYLOAD = {
    "plan": {"treatment": "Cisplatin + RT", "stage": "III"},
    "riskLevel": "HIGH",
    "rationale": {"hallucination_risk": "MEDIUM", "evidence_strength": "MODERATE"},
    "sessionId": "test-session-001",
    "patientId": "test-patient-001",
}


def _create_approval() -> str:
    """Helper: cria uma approval request e retorna o approval_request_id."""
    resp = client.post(f"{BASE}/request", json=VALID_PAYLOAD)
    assert resp.status_code == 201
    return resp.json()["approval_request_id"]


# ── 1. POST /request com payload válido → 201, retorna approval_request_id ──

def test_create_approval_request_returns_201():
    """Criação bem-sucedida retorna 201 e um UUID."""
    resp = client.post(f"{BASE}/request", json=VALID_PAYLOAD)
    assert resp.status_code == 201
    body = resp.json()
    assert "approval_request_id" in body
    assert len(body["approval_request_id"]) == 36  # UUID v4


# ── 2. POST /resolve com FALLBACK_PHYSICIAN_ID → 403 ──

def test_resolve_with_fallback_physician_returns_403():
    """Tentativa de resolver com médico não autenticado é bloqueada."""
    aid = _create_approval()
    resp = client.post(
        f"{BASE}/resolve/{aid}",
        json={"decision": "APPROVED", "decided_by": FALLBACK_PHYSICIAN_ID},
    )
    assert resp.status_code == 403


# ── 3. POST /resolve com id inexistente → 404 ──

def test_resolve_nonexistent_returns_404():
    """Resolver um ID inexistente retorna 404."""
    resp = client.post(
        f"{BASE}/resolve/nonexistent-uuid-here",
        json={"decision": "APPROVED", "decided_by": "dr.house"},
    )
    assert resp.status_code == 404


# ── 4. POST /resolve válido → 200, status RESOLVED ──

def test_resolve_valid_approval_returns_200():
    """Médico autenticado resolve com sucesso → RESOLVED."""
    aid = _create_approval()
    resp = client.post(
        f"{BASE}/resolve/{aid}",
        json={"decision": "APPROVED", "decided_by": "dr.oliveira"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "RESOLVED"
    assert body["decision"] == "APPROVED"


# ── 5. POST /resolve já resolvido → 409 ──

def test_resolve_already_resolved_returns_409():
    """Tentar resolver novamente uma approval já RESOLVED → 409 Conflict."""
    aid = _create_approval()
    # Primeira resolução — sucesso
    client.post(
        f"{BASE}/resolve/{aid}",
        json={"decision": "APPROVED", "decided_by": "dr.oliveira"},
    )
    # Segunda resolução — conflito
    resp = client.post(
        f"{BASE}/resolve/{aid}",
        json={"decision": "REJECTED", "decided_by": "dr.silva"},
    )
    assert resp.status_code == 409


# ── 6. GET /pending → lista vazia após resolver todos os criados ──

def test_pending_excludes_resolved():
    """Após resolver, o item não aparece mais na lista de pendentes."""
    aid = _create_approval()
    client.post(
        f"{BASE}/resolve/{aid}",
        json={"decision": "APPROVED", "decided_by": "dr.santos"},
    )

    resp = client.get(f"{BASE}/pending")
    assert resp.status_code == 200
    pending_ids = [item["approvalRequestId"] for item in resp.json()]
    assert aid not in pending_ids


# ── 7. GET /{id} após resolução → decision e decided_by corretos ──

def test_get_approval_shows_decision_after_resolve():
    """Consulta completa após resolução retorna decision, decided_by e status."""
    aid = _create_approval()
    client.post(
        f"{BASE}/resolve/{aid}",
        json={"decision": "REJECTED", "decided_by": "dr.costa"},
    )

    resp = client.get(f"{BASE}/{aid}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "RESOLVED"
    assert body["decision"] == "REJECTED"
    assert body["decided_by"] == "dr.costa"
    assert body["decided_at"] is not None
