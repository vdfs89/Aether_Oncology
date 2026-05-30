"""
test_approval_resolve.py
========================
Failure-path coverage for the P1 safety hardening of the
`POST /api/v1/clinical/approvals/{id}/resolve` endpoint.

Scope:
- Fix #2 — backend refuses the FALLBACK_PHYSICIAN_ID sentinel as a defense
  in depth, regardless of what the frontend sends.
- Fix #3 — backend enforces APPROVAL_TIMEOUT_SECONDS independently of the
  browser-side timer; late attempts return 408 and flip the row to EXPIRED.

Both tests run against an isolated SQLite file so they do not collide with
the development database at logs/pending_approvals.db.
"""

from __future__ import annotations

import time

import pytest
from fastapi.testclient import TestClient

from src.api.routes import clinical_chat as clinical_chat_routes
from src.main import app
from src.services import approval_store
from src.services.approval_store import (
    FALLBACK_PHYSICIAN_ID,
    STATUS_EXPIRED,
    STATUS_PENDING,
    SQLiteApprovalRepository,
)

client = TestClient(app)


@pytest.fixture
def isolated_repo(tmp_path, monkeypatch):
    """Swap the module-level approval_repository for one backed by a fresh
    SQLite file. Avoids touching logs/pending_approvals.db during tests and
    guarantees each test sees an empty table."""
    db_path = tmp_path / "approvals.db"
    monkeypatch.setattr(approval_store, "DB_FILE", db_path)
    repo = SQLiteApprovalRepository()
    monkeypatch.setattr(approval_store, "approval_repository", repo)
    monkeypatch.setattr(clinical_chat_routes, "approval_repository", repo)
    return repo


def _make_pending(repo: SQLiteApprovalRepository, requested_at_ms: int) -> str:
    approval_id = f"test-{requested_at_ms}"
    repo.save(
        {
            "approvalRequestId": approval_id,
            "plan": [{"tools": [{"toolId": "pubmed-search", "args": {}}]}],
            "riskLevel": "MEDIUM",
            "rationale": ["unit-test fixture"],
            "requestedAt": requested_at_ms,
            "expiresAt": requested_at_ms + 60_000,
        }
    )
    return approval_id


# ---------------------------------------------------------------------------
# Fix #2 — fallback physician is forbidden
# ---------------------------------------------------------------------------


def test_resolve_rejects_fallback_physician(isolated_repo) -> None:
    """A resolve request bearing the fallback sentinel must be refused even
    if the approval is fresh and otherwise valid. The row must stay PENDING
    so the audit trail does not record a phantom decision."""
    approval_id = _make_pending(isolated_repo, int(time.time() * 1000))

    res = client.post(
        f"/api/v1/clinical/approvals/{approval_id}/resolve",
        json={"decision": "APPROVED", "physician_id": FALLBACK_PHYSICIAN_ID},
    )

    assert res.status_code == 403
    assert "Fallback physician" in res.json()["detail"]

    row = isolated_repo.find_raw(approval_id)
    assert row is not None
    assert row["status"] == STATUS_PENDING
    assert row["decision"] is None
    assert row["decided_by"] is None


def test_resolve_rejects_empty_physician_id(isolated_repo) -> None:
    """An empty/whitespace physician_id is treated as unauthenticated."""
    approval_id = _make_pending(isolated_repo, int(time.time() * 1000))

    res = client.post(
        f"/api/v1/clinical/approvals/{approval_id}/resolve",
        json={"decision": "APPROVED", "physician_id": "   "},
    )
    assert res.status_code == 403


# ---------------------------------------------------------------------------
# Fix #3 — server-side timeout enforcement
# ---------------------------------------------------------------------------


def test_resolve_expired_returns_408(isolated_repo, monkeypatch) -> None:
    """An approval older than APPROVAL_TIMEOUT_SECONDS must be refused with
    408 and transitioned to EXPIRED in the audit-preserving way (no DELETE).

    We monkeypatch the timeout down to 1 second to avoid sleeping in the
    test. The request was made well before "now" by inserting a stale
    requested_at, so no real wall-clock wait is needed.
    """
    monkeypatch.setattr(clinical_chat_routes, "APPROVAL_TIMEOUT_SECONDS", 1)

    stale_ms = int(time.time() * 1000) - 5_000  # 5 s ago
    approval_id = _make_pending(isolated_repo, stale_ms)

    res = client.post(
        f"/api/v1/clinical/approvals/{approval_id}/resolve",
        json={"decision": "APPROVED", "physician_id": "CRM-12345"},
    )

    assert res.status_code == 408
    assert "expired" in res.json()["detail"].lower()

    row = isolated_repo.find_raw(approval_id)
    assert row is not None
    assert row["status"] == STATUS_EXPIRED
    # Audit-preserving: decision and decided_by stay null on expiry; the
    # status alone records that no physician acted in time.
    assert row["decision"] is None
    assert row["decided_by"] is None


# ---------------------------------------------------------------------------
# Happy path — guards do not block valid resolves (regression)
# ---------------------------------------------------------------------------


def test_resolve_happy_path_records_decision(isolated_repo) -> None:
    """A fresh approval resolved by a real CRM transitions PENDING → RESOLVED
    with all decision metadata stamped. Guards must not over-block."""
    approval_id = _make_pending(isolated_repo, int(time.time() * 1000))

    res = client.post(
        f"/api/v1/clinical/approvals/{approval_id}/resolve",
        json={"decision": "APPROVED", "physician_id": "CRM-99999"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["decision"] == "APPROVED"
    assert body["decided_by"] == "CRM-99999"

    row = isolated_repo.find_raw(approval_id)
    assert row["status"] == "RESOLVED"
    assert row["decision"] == "APPROVED"
    assert row["decided_by"] == "CRM-99999"
    assert row["decided_at"] is not None


def test_resolve_second_attempt_is_conflict(isolated_repo) -> None:
    """Re-resolving an already-RESOLVED approval returns 409, not silent
    success — prevents a stale FE from overwriting a recorded decision."""
    approval_id = _make_pending(isolated_repo, int(time.time() * 1000))

    first = client.post(
        f"/api/v1/clinical/approvals/{approval_id}/resolve",
        json={"decision": "APPROVED", "physician_id": "CRM-11111"},
    )
    assert first.status_code == 200

    second = client.post(
        f"/api/v1/clinical/approvals/{approval_id}/resolve",
        json={"decision": "REJECTED", "physician_id": "CRM-22222"},
    )
    assert second.status_code == 409
