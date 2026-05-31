"""
Automated HIPAA-style compliance reports over the audit trail.

Reads sealed audit entries from the active store (MongoDB primary, JSONL
fallback), decrypts them, and produces an aggregate report: event/action/status
breakdowns, PHI-scrubbing coverage, failures, unique (anonymized) actors, the
covered time range — plus the **tamper-evidence integrity verdict** of the chain.

Output is a plain dict (JSON-ready) with a Markdown renderer for humans.
"""

from __future__ import annotations

import json
import logging
from collections import Counter
from datetime import datetime, timedelta, timezone

from src.services import audit_chain, audit_rotation, mongo
from src.services.audit import LOG_DIR, get_fernet
from src.services.audit_store_mongo import MongoAuditStore

logger = logging.getLogger(__name__)

_MAX_FAILURES = 50


def _parse_ts(value) -> datetime | None:
    """Lenient ISO-8601 parse; returns a tz-naive datetime or None."""
    if not isinstance(value, str):
        return None
    s = value.strip().replace("Z", "")
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return None
    return dt.replace(tzinfo=None)


def _inner(envelope: dict) -> dict | None:
    """Decrypt a sealed envelope to its inner audit entry. Segment headers and
    undecryptable lines return None."""
    if audit_chain.is_segment_header(envelope):
        return None
    if envelope.get("encrypted") is True and envelope.get("payload"):
        try:
            raw = get_fernet().decrypt(envelope["payload"].encode("utf-8"))
            return json.loads(raw.decode("utf-8"))
        except Exception as e:  # noqa: BLE001 - report must not crash on one bad row
            logger.warning("compliance: undecryptable entry skipped: %s", e)
            return None
    return envelope  # legacy plaintext


def _classify(inner: dict) -> str:
    if "event_type" in inner:
        return str(inner["event_type"])
    if inner.get("type") == "clinical_feedback":
        return "feedback"
    if "input" in inner and "output" in inner:
        return "prediction"
    return "unknown"


def _iter_envelopes(start: datetime | None):
    """Yield raw envelopes from MongoDB (primary) or the JSONL segments."""
    coll = mongo.get_audit_collection()
    if coll is not None:
        query = {}
        if start is not None:
            query["created_dt"] = {"$gte": start.replace(tzinfo=timezone.utc)}
        for doc in coll.find(query, sort=[("seq", 1)]):
            yield doc
        return

    for seg in audit_rotation.list_segments(LOG_DIR, "audit_trail"):
        with audit_chain._open_lines(seg) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    yield json.loads(line)
                except Exception:
                    continue


def _integrity() -> dict:
    """Tamper-evidence verdict of the active store."""
    coll = mongo.get_audit_collection()
    if coll is not None:
        rep = MongoAuditStore(coll).verify()
        return {"source": "mongodb", **rep}
    rep = audit_rotation.verify_trail(LOG_DIR, "audit_trail")
    return {"source": "jsonl", **rep}


def generate_report(
    *,
    days: int | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    now: datetime | None = None,
) -> dict:
    """Build the compliance report. Window is [start, end]; `days` is shorthand
    for the last N days."""
    now = (now or datetime.now(timezone.utc)).replace(tzinfo=None)
    if days is not None and start is None:
        start = now - timedelta(days=days)

    source = "mongodb" if mongo.get_audit_collection() is not None else "jsonl"

    by_event: Counter = Counter()
    by_action: Counter = Counter()
    by_status: Counter = Counter()
    users: set[str] = set()
    failures: list[dict] = []
    phi_scrubbed = 0
    total = 0
    first_ts: datetime | None = None
    last_ts: datetime | None = None

    for env in _iter_envelopes(start):
        inner = _inner(env)
        if inner is None:
            continue
        ts = _parse_ts(inner.get("timestamp"))
        if ts is not None:
            if start is not None and ts < start:
                continue
            if end is not None and ts > end.replace(tzinfo=None):
                continue
            first_ts = ts if first_ts is None or ts < first_ts else first_ts
            last_ts = ts if last_ts is None or ts > last_ts else last_ts

        total += 1
        by_event[_classify(inner)] += 1
        if inner.get("action"):
            by_action[str(inner["action"])] += 1
        status = inner.get("status")
        if status:
            by_status[str(status)] += 1
        if inner.get("phi_scrubbed") is True:
            phi_scrubbed += 1
        if inner.get("user_id"):
            users.add(str(inner["user_id"]))
        if status == "FAILURE" and len(failures) < _MAX_FAILURES:
            failures.append(
                {
                    "event_type": _classify(inner),
                    "action": inner.get("action"),
                    "timestamp": inner.get("timestamp"),
                    "error": inner.get("error_message"),
                }
            )

    return {
        "generated_at": now.isoformat() + "Z",
        "period": {
            "start": start.isoformat() if start else None,
            "end": end.isoformat() if end else None,
            "days": days,
        },
        "source": source,
        "totals": {
            "entries": total,
            "phi_scrubbed": phi_scrubbed,
            "failures": int(by_status.get("FAILURE", 0)),
            "unique_actors": len(users),
        },
        "by_event_type": dict(by_event),
        "by_action": dict(by_action),
        "by_status": dict(by_status),
        "time_range": {
            "first": first_ts.isoformat() if first_ts else None,
            "last": last_ts.isoformat() if last_ts else None,
        },
        "integrity": _integrity(),
        "failures": failures,
    }


def render_markdown(report: dict) -> str:
    """Human-readable Markdown rendering of a compliance report."""
    integ = report["integrity"]
    ok = integ.get("status") == "ok"
    lines = [
        "# Audit Compliance Report — Aether Oncology",
        "",
        f"- **Generated:** {report['generated_at']}",
        f"- **Source:** {report['source']}",
        f"- **Period:** {report['period']['start'] or 'all'} "
        f"to {report['period']['end'] or 'now'}",
        "",
        "## Integrity (tamper-evidence)",
        f"- **Chain status:** {'PASS' if ok else integ.get('status', 'unknown').upper()}",
        f"- **Verified entries:** {integ.get('verified', 0)}",
    ]
    if not ok and integ.get("broken_at") is not None:
        lines.append(f"- **Broken at:** {integ['broken_at']} ({integ.get('reason')})")

    t = report["totals"]
    lines += [
        "",
        "## Activity",
        f"- **Total entries:** {t['entries']}",
        f"- **Failures:** {t['failures']}",
        f"- **PHI-scrubbed entries:** {t['phi_scrubbed']}",
        f"- **Unique actors (anonymized):** {t['unique_actors']}",
        f"- **Time range:** {report['time_range']['first'] or '-'} "
        f"to {report['time_range']['last'] or '-'}",
        "",
        "### By event type",
    ]
    lines += [f"- `{k}`: {v}" for k, v in sorted(report["by_event_type"].items())] or [
        "- (none)"
    ]
    lines += ["", "### By action"]
    lines += [f"- `{k}`: {v}" for k, v in sorted(report["by_action"].items())] or [
        "- (none)"
    ]
    lines += ["", "### By status"]
    lines += [f"- `{k}`: {v}" for k, v in sorted(report["by_status"].items())] or [
        "- (none)"
    ]

    if report["failures"]:
        lines += ["", "## Failures (most recent sample)"]
        for f in report["failures"]:
            lines.append(
                f"- [{f.get('timestamp')}] {f.get('event_type')}/{f.get('action')}"
                f" — {f.get('error') or 'no detail'}"
            )
    return "\n".join(lines) + "\n"
