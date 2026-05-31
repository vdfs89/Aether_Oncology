"""Test the audit archival cycle: archive old docs to a cold collection, expire
from the active one, preserve the hash-chain anchor."""

from datetime import datetime, timedelta, timezone

import mongomock
import pytest

from src.services import audit, mongo
from src.services.audit import seal_and_append
from src.services.audit_archive_job import run_archive_cycle
from src.services.audit_store_mongo import MongoAuditStore


@pytest.fixture(autouse=True)
def _reset():
    audit._chain_heads.clear()
    mongo.reset()
    yield
    audit._chain_heads.clear()
    mongo.reset()


def test_archive_expire_cycle(tmp_path, monkeypatch):
    active = mongomock.MongoClient()["t"]["audit_trail"]
    cold = mongomock.MongoClient()["t"]["audit_trail_archive"]
    monkeypatch.setattr(mongo, "get_audit_collection", lambda: active)
    monkeypatch.setattr(mongo, "get_archive_collection", lambda: cold)
    monkeypatch.setattr(audit, "AUDIT_FILE", tmp_path / "audit_trail.jsonl")
    audit._chain_heads.clear()

    # Seed a 5-entry chain into the active collection (Mongo is primary).
    for i in range(5):
        seal_and_append({"event": i})
    assert active.count_documents({}) == 5

    # Age the first three docs past the retention window.
    old = datetime.now(timezone.utc) - timedelta(days=200)
    active.update_many({"seq": {"$in": [1, 2, 3]}}, {"$set": {"created_dt": old}})

    res = run_archive_cycle(days=90)

    assert res["status"] == "ok"
    assert res["archived"] == 3
    assert res["anchor_seq"] == 3
    # Cold has the 3 archived; active keeps 4,5 + the logged archive event (seq 6).
    assert cold.count_documents({}) == 3
    assert active.count_documents({}) == 3
    # Both chains still verify (active first doc anchors to the archived head).
    assert MongoAuditStore(active).verify()["status"] == "ok"
    assert MongoAuditStore(cold).verify()["status"] == "ok"
    # The run was recorded in the trail.
    assert active.find_one({"seq": 6}) is not None


def test_archive_never_touches_head_when_all_old(tmp_path, monkeypatch):
    active = mongomock.MongoClient()["t"]["audit_trail"]
    cold = mongomock.MongoClient()["t"]["audit_trail_archive"]
    monkeypatch.setattr(mongo, "get_audit_collection", lambda: active)
    monkeypatch.setattr(mongo, "get_archive_collection", lambda: cold)
    monkeypatch.setattr(audit, "AUDIT_FILE", tmp_path / "audit_trail.jsonl")
    audit._chain_heads.clear()

    for i in range(3):
        seal_and_append({"event": i})
    old = datetime.now(timezone.utc) - timedelta(days=200)
    active.update_many({}, {"$set": {"created_dt": old}})  # ALL old

    res = run_archive_cycle(days=90)
    # head (seq 3) is never archived -> only seq 1,2 move; active never empties.
    assert res["archived"] == 2
    assert active.find_one({"seq": 3}) is not None
    assert active.count_documents({}) >= 1


def test_cycle_skips_when_mongo_off(monkeypatch):
    monkeypatch.setattr(mongo, "get_audit_collection", lambda: None)
    res = run_archive_cycle()
    assert res["status"] == "skipped"
    assert res["archived"] == 0
