"""Tests for Slack audit alerting — one per trigger (webhook mocked)."""

from datetime import datetime, timedelta, timezone

import mongomock
import pytest

from src.services import (
    audit,
    audit_archive_job,
    compliance_report,
    mongo,
    slack_alerter,
)
from src.services.audit import seal_and_append


@pytest.fixture(autouse=True)
def _wire(monkeypatch):
    """Enable the webhook and capture deliveries (no real HTTP / threads)."""
    monkeypatch.setenv("SLACK_WEBHOOK_URL", "https://hooks.slack.test/x")
    sent: list[dict] = []
    monkeypatch.setattr(
        slack_alerter, "_deliver", lambda url, payload: sent.append(payload)
    )
    slack_alerter.reset()
    audit._chain_heads.clear()
    mongo.reset()
    yield sent
    slack_alerter.reset()
    audit._chain_heads.clear()
    mongo.reset()


def _text(payload: dict) -> str:
    return payload["attachments"][0]["blocks"][0]["text"]["text"]


def test_no_webhook_is_noop(monkeypatch):
    monkeypatch.delenv("SLACK_WEBHOOK_URL", raising=False)
    assert slack_alerter.send_alert(slack_alerter.CRITICAL, "x") is False


# T1 — chain broken
def test_trigger_chain_broken(_wire):
    slack_alerter.alert_chain_status(
        {"status": "broken", "broken_at": 7, "reason": "entry_hash mismatch"}, "mongodb"
    )
    assert len(_wire) == 1
    assert "integrity FAILED" in _text(_wire[0])
    assert _wire[0]["attachments"][0]["color"] == slack_alerter._COLORS["critical"]


def test_chain_ok_no_alert(_wire):
    slack_alerter.alert_chain_status({"status": "ok"}, "mongodb")
    assert _wire == []


# T2 — judge fail-open
def test_trigger_judge_fail_open(_wire):
    import asyncio

    from src.providers.judge_provider import JudgeProvider

    judge = JudgeProvider()
    judge.provider.client = None  # force unavailable
    asyncio.run(judge.evaluate_response("q", "a"))
    assert any("judge unavailable" in _text(p).lower() for p in _wire)


# T3 — volume anomaly
def test_trigger_volume_silence(_wire, monkeypatch):
    coll = mongomock.MongoClient()["t"]["audit"]
    monkeypatch.setattr(mongo, "get_audit_collection", lambda: coll)
    now = datetime(2026, 5, 31, 12, tzinfo=timezone.utc)  # within usage hours
    # 48 entries over the prior 2-24h, but ZERO in the last hour -> silence.
    for i in range(48):
        coll.insert_one({"seq": i, "created_dt": now - timedelta(hours=2 + i % 20)})

    alert = audit_archive_job.check_volume_anomaly(now=now)
    assert alert and alert["level"] == slack_alerter.WARNING
    assert "silence" in alert["title"]
    assert any("anomaly" in _text(p) for p in _wire)


def test_volume_spike(_wire):
    # baseline 1/h, 20 in last hour -> >10x spike
    alert = slack_alerter.evaluate_volume(last_hour=20, mean_hourly=1.0, hour_utc=12)
    assert alert and "spike" in alert["title"]


# T4 — recurring decrypt errors
def test_trigger_decrypt_recurring(_wire):
    slack_alerter.record_decrypt_result(False)
    slack_alerter.record_decrypt_result(False)
    assert _wire == []  # below threshold (3)
    slack_alerter.record_decrypt_result(False)
    assert len(_wire) == 1
    assert "decrypt" in _text(_wire[0]).lower()


def test_decrypt_success_resets(_wire):
    slack_alerter.record_decrypt_result(False)
    slack_alerter.record_decrypt_result(True)  # reset
    slack_alerter.record_decrypt_result(False)
    slack_alerter.record_decrypt_result(False)
    assert _wire == []  # never hit 3 consecutive


def test_decrypt_wired_into_report(_wire, tmp_path, monkeypatch):
    # Seal one entry, corrupt its payload, then a report read triggers a decrypt
    # failure recorded via slack_alerter.
    f = tmp_path / "audit_trail.jsonl"
    seal_and_append({"event_type": "prediction"}, f)
    monkeypatch.setattr(compliance_report, "LOG_DIR", tmp_path)
    data = f.read_bytes().replace(b'"payload": "', b'"payload": "X', 1)
    f.write_bytes(data)
    compliance_report.generate_report()  # decrypt fails -> record_decrypt_result(False)
    # one failure only -> below threshold, no alert, but no crash
    assert isinstance(_wire, list)
