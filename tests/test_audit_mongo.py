"""Tests for the MongoDB audit store, dual-write fallback and archival.

Uses mongomock (in-memory) — no real Atlas needed."""

from datetime import datetime, timedelta, timezone

import mongomock
import pytest
from pymongo.errors import PyMongoError

from src.services import audit, mongo
from src.services.audit import seal_and_append
from src.services.audit_chain import verify_chain
from src.services.audit_rotation import LoggingArchiver
from src.services.audit_store_mongo import MongoAuditStore


@pytest.fixture(autouse=True)
def _reset():
    audit._chain_heads.clear()
    mongo.reset()
    yield
    audit._chain_heads.clear()
    mongo.reset()


@pytest.fixture
def coll():
    return mongomock.MongoClient()["aether_audit_test"]["audit_trail"]


def _use_mongo(monkeypatch, collection):
    monkeypatch.setattr(audit.mongo, "get_audit_collection", lambda: collection)


# --------------------------------------------------------------------------- #
#  Store                                                                       #
# --------------------------------------------------------------------------- #
def test_store_append_and_head(coll):
    store = MongoAuditStore(coll)
    assert store.read_head() == (0, "0" * 64)
    store.append({"seq": 1, "prev_hash": "0" * 64, "entry_hash": "h1", "payload": "p"})
    assert store.read_head() == (1, "h1")
    assert store.count() == 1


def test_store_append_is_idempotent_on_seq(coll):
    store = MongoAuditStore(coll)
    store.ensure_indexes()
    doc = {"seq": 1, "prev_hash": "0" * 64, "entry_hash": "h1", "payload": "p"}
    store.append(doc)
    store.append(doc)  # duplicate seq swallowed
    assert store.count() == 1


def test_store_verify_ok_and_tamper(coll, monkeypatch, tmp_path):
    _use_mongo(monkeypatch, coll)
    for i in range(4):
        seal_and_append({"event": i}, tmp_path / "a.jsonl")
    store = MongoAuditStore(coll)
    assert store.verify()["status"] == "ok"
    assert store.verify()["verified"] == 4

    coll.update_one({"seq": 2}, {"$set": {"payload": "TAMPERED"}})
    report = store.verify()
    assert report["status"] == "broken"
    assert report["broken_at"] == 2


# --------------------------------------------------------------------------- #
#  Dual-write: Mongo primary, JSONL fallback                                  #
# --------------------------------------------------------------------------- #
def test_seal_writes_to_mongo_primary(coll, monkeypatch, tmp_path):
    _use_mongo(monkeypatch, coll)
    f = tmp_path / "audit.jsonl"
    for i in range(3):
        seal_and_append({"event": i}, f)
    assert coll.count_documents({}) == 3
    assert not f.exists()  # nothing fell through to JSONL
    assert MongoAuditStore(coll).verify()["status"] == "ok"


def test_seal_falls_back_to_jsonl_on_mongo_error(monkeypatch, tmp_path):
    class Broken:
        def insert_one(self, doc):
            raise PyMongoError("cluster down")

        def find_one(self, *a, **k):
            raise PyMongoError("cluster down")

    _use_mongo(monkeypatch, Broken())
    f = tmp_path / "audit.jsonl"
    seal_and_append({"event": 1}, f)
    assert f.exists()  # written to the JSONL fallback
    assert verify_chain(f)["status"] == "ok"


def test_chain_continuity_across_stores(coll, monkeypatch, tmp_path):
    f = tmp_path / "audit.jsonl"
    # First two entries land in JSONL (Mongo off)...
    monkeypatch.setattr(audit.mongo, "get_audit_collection", lambda: None)
    seal_and_append({"event": 1}, f)
    e2 = seal_and_append({"event": 2}, f)

    # ...then Mongo comes online; head must recover from the JSONL tail.
    audit._chain_heads.clear()
    _use_mongo(monkeypatch, coll)
    e3 = seal_and_append({"event": 3}, f)

    assert e3["seq"] == 3
    assert coll.count_documents({}) == 1
    assert coll.find_one({"seq": 3})["prev_hash"] == e2["entry_hash"]  # chained


# --------------------------------------------------------------------------- #
#  Archival (archive THEN expire)                                             #
# --------------------------------------------------------------------------- #
def test_archive_and_expire(coll, tmp_path):
    store = MongoAuditStore(coll)
    old = datetime.now(timezone.utc) - timedelta(days=200)
    for i in range(1, 4):
        coll.insert_one(
            {
                "seq": i,
                "prev_hash": "x",
                "entry_hash": "y",
                "payload": "p",
                "created_dt": old,
            }
        )
    arc = LoggingArchiver()
    res = store.archive_and_expire(
        archive_after_days=90, archiver=arc, archive_dir=tmp_path
    )
    assert res["archived"] == 3
    assert arc.archived  # cold-storage hook fired
    assert coll.count_documents({"archived_at": {"$exists": True}}) == 3

    # Re-running is a no-op (already archived).
    res2 = store.archive_and_expire(
        archive_after_days=90, archiver=arc, archive_dir=tmp_path
    )
    assert res2["archived"] == 0


def test_archive_skips_recent_docs(coll, tmp_path):
    store = MongoAuditStore(coll)
    coll.insert_one(
        {
            "seq": 1,
            "prev_hash": "x",
            "entry_hash": "y",
            "payload": "p",
            "created_dt": datetime.now(timezone.utc),
        }
    )
    res = store.archive_and_expire(archive_after_days=90, archive_dir=tmp_path)
    assert res["archived"] == 0
