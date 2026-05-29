import json
import sqlite3
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_FILE = Path(__file__).resolve().parents[2] / "logs" / "pending_approvals.db"


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
            conn.commit()

    def save(self, approval: Dict[str, Any]) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO pending_approvals
                (approval_request_id, plan, risk_level, rationale, requested_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    approval["approvalRequestId"],
                    json.dumps(approval["plan"]),
                    approval["riskLevel"],
                    json.dumps(approval["rationale"]),
                    approval["requestedAt"],
                    approval["expiresAt"],
                ),
            )
            conn.commit()

    def find_by_id(self, approval_request_id: str) -> Optional[Dict[str, Any]]:
        self.cleanup_expired()
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT approval_request_id, plan, risk_level, rationale, requested_at, expires_at FROM pending_approvals WHERE approval_request_id = ?",
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
                "SELECT approval_request_id, plan, risk_level, rationale, requested_at, expires_at FROM pending_approvals"
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

    def cleanup_expired(self) -> None:
        now_ms = int(time.time() * 1000)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "DELETE FROM pending_approvals WHERE expires_at < ?", (now_ms,)
            )
            conn.commit()


# Global repository instance
approval_repository = SQLiteApprovalRepository()
