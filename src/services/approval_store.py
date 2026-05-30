import json
import logging
import os
import sqlite3
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DB_FILE = Path(__file__).resolve().parents[2] / "logs" / "pending_approvals.db"

# Sentinel ID for unauthenticated clinical sessions. Must match the value in
# frontend/src/features/ai/orchestration/runtime/physicianSession.ts. Any
# resolve attempt using this ID is rejected at the API boundary (Fix #2).
FALLBACK_PHYSICIAN_ID = "PHYSICIAN_NOT_AUTHENTICATED"

# Default approval window (15 min) — matches DEFAULT_TIMEOUT_MS in the FE
# approvalManager. Configurable so deployments and tests can tighten it.
APPROVAL_TIMEOUT_SECONDS = int(os.getenv("APPROVAL_TIMEOUT_SECONDS", "900"))

# Approval lifecycle states. Decision is recorded separately so a single status
# value can be used for the cleanup worker's filter.
STATUS_PENDING = "PENDING"
STATUS_RESOLVED = "RESOLVED"
STATUS_EXPIRED = "EXPIRED"


class SQLiteApprovalRepository:
    def __init__(self):
        self.db_path = DB_FILE
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS pending_approvals (
                    approval_request_id TEXT PRIMARY KEY,
                    plan TEXT NOT NULL,
                    risk_level TEXT NOT NULL,
                    rationale TEXT NOT NULL,
                    requested_at INTEGER NOT NULL,
                    expires_at INTEGER NOT NULL
                )
            """)
            # Idempotent column additions for in-place migration. ALTER TABLE
            # ... ADD COLUMN cannot be wrapped in IF NOT EXISTS on SQLite, so
            # we swallow the "duplicate column" OperationalError instead.
            for column, ddl in (
                ("status", f"TEXT NOT NULL DEFAULT '{STATUS_PENDING}'"),
                ("decision", "TEXT"),
                ("decided_by", "TEXT"),
                ("decided_at", "INTEGER"),
            ):
                try:
                    conn.execute(
                        f"ALTER TABLE pending_approvals ADD COLUMN {column} {ddl}"
                    )
                except sqlite3.OperationalError:
                    pass
            conn.commit()

    def save(self, approval: Dict[str, Any]) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO pending_approvals
                (approval_request_id, plan, risk_level, rationale, requested_at, expires_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    approval["approvalRequestId"],
                    json.dumps(approval["plan"]),
                    approval["riskLevel"],
                    json.dumps(approval["rationale"]),
                    approval["requestedAt"],
                    approval["expiresAt"],
                    STATUS_PENDING,
                ),
            )
            conn.commit()

    def find_by_id(self, approval_request_id: str) -> Optional[Dict[str, Any]]:
        self.cleanup_expired()
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT approval_request_id, plan, risk_level, rationale, requested_at, expires_at FROM pending_approvals WHERE approval_request_id = ? AND status = ?",
                (approval_request_id, STATUS_PENDING),
            )
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "approvalRequestId": row[0],
                "plan": json.loads(row[1]),
                "riskLevel": row[2],
                "rationale": json.loads(row[3]),
                "requestedAt": row[4],
                "expiresAt": row[5],
            }

    def find_raw(self, approval_request_id: str) -> Optional[Dict[str, Any]]:
        """Return the full row regardless of status — used by resolve() to
        distinguish 404 (missing) from 409 (already resolved/expired)."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT approval_request_id, plan, risk_level, rationale, requested_at, expires_at, status, decision, decided_by, decided_at FROM pending_approvals WHERE approval_request_id = ?",
                (approval_request_id,),
            )
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "approvalRequestId": row[0],
                "plan": json.loads(row[1]),
                "riskLevel": row[2],
                "rationale": json.loads(row[3]),
                "requestedAt": row[4],
                "expiresAt": row[5],
                "status": row[6],
                "decision": row[7],
                "decided_by": row[8],
                "decided_at": row[9],
            }

    def delete(self, approval_request_id: str) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "DELETE FROM pending_approvals WHERE approval_request_id = ?",
                (approval_request_id,),
            )
            conn.commit()

    def list_all(self) -> List[Dict[str, Any]]:
        self.cleanup_expired()
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT approval_request_id, plan, risk_level, rationale, requested_at, expires_at FROM pending_approvals WHERE status = ?",
                (STATUS_PENDING,),
            )
            rows = cursor.fetchall()
            return [
                {
                    "approvalRequestId": row[0],
                    "plan": json.loads(row[1]),
                    "riskLevel": row[2],
                    "rationale": json.loads(row[3]),
                    "requestedAt": row[4],
                    "expiresAt": row[5],
                }
                for row in rows
            ]

    def resolve(
        self,
        approval_request_id: str,
        decision: str,
        decided_by: str,
        decided_at: int,
    ) -> bool:
        """Mark a PENDING approval as RESOLVED with the physician's decision.
        Returns True iff the row transitioned from PENDING → RESOLVED."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                """
                UPDATE pending_approvals
                SET status = ?, decision = ?, decided_by = ?, decided_at = ?
                WHERE approval_request_id = ? AND status = ?
                """,
                (
                    STATUS_RESOLVED,
                    decision,
                    decided_by,
                    decided_at,
                    approval_request_id,
                    STATUS_PENDING,
                ),
            )
            conn.commit()
            return cursor.rowcount > 0

    def mark_expired(self, approval_request_id: str) -> bool:
        """Transition a single PENDING row to EXPIRED (called when a late
        resolve attempt arrives). Audit-preserving — does not DELETE."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "UPDATE pending_approvals SET status = ? WHERE approval_request_id = ? AND status = ?",
                (STATUS_EXPIRED, approval_request_id, STATUS_PENDING),
            )
            conn.commit()
            return cursor.rowcount > 0

    def cleanup_expired(self) -> int:
        """Mark all overdue PENDING approvals as EXPIRED. Returns the number
        of rows transitioned. Audit-preserving: rows are not deleted so the
        decision history survives for regulators."""
        now_ms = int(time.time() * 1000)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "UPDATE pending_approvals SET status = ? WHERE expires_at < ? AND status = ?",
                (STATUS_EXPIRED, now_ms, STATUS_PENDING),
            )
            conn.commit()
            return cursor.rowcount


# Global repository instance
approval_repository = SQLiteApprovalRepository()
