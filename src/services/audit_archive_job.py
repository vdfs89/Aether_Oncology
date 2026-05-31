"""
Scheduled audit-trail archival (in-process, no Celery).

Periodically moves audit docs older than the retention window from the active
MongoDB collection to a cold collection (`audit_trail_archive`), deletes them
from the active one, and records the run in the audit trail itself. The chain
head is never archived, so the tamper-evident hash chain stays anchored on both
sides (see MongoAuditStore.archive_to_cold).

Driven by `main.py`'s lifespan via a native asyncio loop. Env:
    AUDIT_ARCHIVE_ENABLED         "false" disables the loop (default on)
    AUDIT_RETENTION_DAYS          age threshold to archive (default 90)
    AUDIT_ARCHIVE_INTERVAL_HOURS  loop period (default 24 — daily)
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone

from src.services import mongo, slack_alerter
from src.services.audit import seal_and_append
from src.services.audit_store_mongo import MongoAuditStore

logger = logging.getLogger(__name__)


def retention_days() -> int:
    return int(os.getenv("AUDIT_RETENTION_DAYS", "90"))


def interval_seconds() -> float:
    return float(os.getenv("AUDIT_ARCHIVE_INTERVAL_HOURS", "24")) * 3600


def enabled() -> bool:
    return os.getenv("AUDIT_ARCHIVE_ENABLED", "true").lower() != "false"


def run_archive_cycle(*, days: int | None = None, now: datetime | None = None) -> dict:
    """One archive+expire pass. Returns a summary. Safe no-op if Mongo is off."""
    active = mongo.get_audit_collection()
    cold = mongo.get_archive_collection()
    if active is None or cold is None:
        return {"status": "skipped", "reason": "mongo unavailable", "archived": 0}

    rd = days if days is not None else retention_days()
    now = now or datetime.now(timezone.utc)
    res = MongoAuditStore(active).archive_to_cold(cold, retention_days=rd, now=now)

    if res["archived"]:
        # Record the run in the trail itself (advances the chain in the active
        # collection — this event is recent, so it is never archived next cycle).
        seal_and_append(
            {
                "event_type": "archive",
                "action": "DELETE",
                "status": "SUCCESS",
                "timestamp": now.isoformat(),
                "data": {
                    "archived": res["archived"],
                    "seq_range": res["seq_range"],
                    "anchor_seq": res.get("anchor_seq"),
                    "retention_days": rd,
                    "cold_collection": cold.name,
                },
            }
        )
        logger.info("AUDIT ARCHIVE cycle: %s", res)
    return {"status": "ok", **res}


def check_volume_anomaly(*, now: datetime | None = None) -> dict | None:
    """T3: compare the last hour's audit volume against the 24h hourly mean and
    raise a Slack WARNING on silence (0 in usage hours) or a >10x spike."""
    active = mongo.get_audit_collection()
    if active is None:
        return None
    now = now or datetime.now(timezone.utc)
    last_hour = active.count_documents(
        {"created_dt": {"$gte": now - timedelta(hours=1)}}
    )
    last_24 = active.count_documents(
        {"created_dt": {"$gte": now - timedelta(hours=24)}}
    )
    alert = slack_alerter.evaluate_volume(last_hour, last_24 / 24.0, now.hour)
    if alert:
        slack_alerter.send_alert(alert["level"], alert["title"], alert["details"])
    return alert
