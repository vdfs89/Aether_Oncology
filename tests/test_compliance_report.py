"""Tests for the automated compliance report (JSONL + Mongo sources)."""

import mongomock
import pytest

from src.services import audit, compliance_report, mongo
from src.services.audit import seal_and_append
from src.services.compliance_report import generate_report, render_markdown


@pytest.fixture(autouse=True)
def _reset():
    audit._chain_heads.clear()
    mongo.reset()
    yield
    audit._chain_heads.clear()
    mongo.reset()


def _seed(f):
    rows = [
        {
            "event_type": "prediction",
            "action": "READ",
            "status": "SUCCESS",
            "phi_scrubbed": True,
            "user_id": "u1",
            "timestamp": "2026-05-30T10:00:00Z",
        },
        {
            "event_type": "feedback",
            "action": "WRITE",
            "status": "SUCCESS",
            "phi_scrubbed": False,
            "user_id": "u2",
            "timestamp": "2026-05-30T11:00:00Z",
        },
        {
            "event_type": "auth",
            "action": "READ",
            "status": "FAILURE",
            "user_id": "u1",
            "error_message": "bad key",
            "timestamp": "2026-05-30T12:00:00Z",
        },
    ]
    for r in rows:
        seal_and_append(r, f)


def test_report_jsonl(tmp_path, monkeypatch):
    f = tmp_path / "audit_trail.jsonl"
    _seed(f)
    monkeypatch.setattr(compliance_report, "LOG_DIR", tmp_path)

    rep = generate_report()
    assert rep["source"] == "jsonl"
    assert rep["totals"]["entries"] == 3
    assert rep["totals"]["phi_scrubbed"] == 1
    assert rep["totals"]["failures"] == 1
    assert rep["totals"]["unique_actors"] == 2
    assert rep["by_event_type"] == {"prediction": 1, "feedback": 1, "auth": 1}
    assert rep["by_status"] == {"SUCCESS": 2, "FAILURE": 1}
    assert rep["integrity"]["status"] == "ok"
    assert rep["failures"][0]["error"] == "bad key"


def test_report_days_filter(tmp_path, monkeypatch):
    f = tmp_path / "audit_trail.jsonl"
    seal_and_append(
        {"event_type": "prediction", "timestamp": "2000-01-01T00:00:00Z"}, f
    )
    seal_and_append(
        {"event_type": "prediction", "timestamp": "2026-05-30T10:00:00Z"}, f
    )
    monkeypatch.setattr(compliance_report, "LOG_DIR", tmp_path)

    from datetime import datetime

    rep = generate_report(days=30, now=datetime(2026, 5, 31))
    assert rep["totals"]["entries"] == 1  # old 2000 entry filtered out


def test_report_mongo_source(tmp_path, monkeypatch):
    coll = mongomock.MongoClient()["t"]["audit"]
    monkeypatch.setattr(audit.mongo, "get_audit_collection", lambda: coll)
    monkeypatch.setattr(compliance_report.mongo, "get_audit_collection", lambda: coll)
    _seed(tmp_path / "audit_trail.jsonl")  # writes to Mongo (primary)

    rep = generate_report()
    assert rep["source"] == "mongodb"
    assert rep["totals"]["entries"] == 3
    assert rep["integrity"]["source"] == "mongodb"
    assert rep["integrity"]["status"] == "ok"


def test_render_markdown_smoke(tmp_path, monkeypatch):
    f = tmp_path / "audit_trail.jsonl"
    _seed(f)
    monkeypatch.setattr(compliance_report, "LOG_DIR", tmp_path)
    md = render_markdown(generate_report())
    assert "# Audit Compliance Report" in md
    assert "Chain status:** PASS" in md
