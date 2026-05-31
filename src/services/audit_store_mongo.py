"""
MongoDB-backed audit store.

Each JSONL envelope maps 1:1 to a document — the tamper-evident hash chain is
unchanged (every doc carries seq / prev_hash / entry_hash / payload), so
`verify()` proves integrity exactly like the file chain, without decrypting PHI.

Retention follows the "archive THEN expire" policy:
  - `created_dt` (BSON date) is stamped at insert for time-based queries.
  - `archive_and_expire()` exports old docs to cold storage (Archiver) and stamps
    `archived_at`.
  - A TTL index on `archived_at` deletes ONLY archived docs after the retention
    window — non-archived docs never expire, so nothing is lost before it is
    safely in cold storage.
"""

from __future__ import annotations

import gzip
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from pymongo.collection import Collection
from pymongo.errors import DuplicateKeyError

from src.services import audit_chain
from src.services.audit_rotation import Archiver, LoggingArchiver

logger = logging.getLogger(__name__)


class MongoAuditStore:
    """Thin wrapper over a PyMongo collection holding sealed audit envelopes."""

    def __init__(self, collection: Collection):
        self.collection = collection

    # -- schema ----------------------------------------------------------- #
    def ensure_indexes(self, retention_seconds: int | None = None) -> None:
        """Create the audit indexes. The TTL index on `archived_at` only ever
        expires documents that have been archived (the field is set by
        `archive_and_expire`)."""
        self.collection.create_index("seq", unique=True, name="uniq_seq")
        self.collection.create_index("created_dt", name="created_dt")
        # 6 years default (HIPAA-style). TTL acts only on docs WITH archived_at.
        ttl = (
            retention_seconds if retention_seconds is not None else 6 * 365 * 24 * 3600
        )
        self.collection.create_index(
            "archived_at", name="ttl_archived", expireAfterSeconds=ttl
        )

    # -- write ------------------------------------------------------------ #
    def append(self, envelope: dict) -> None:
        """Insert one sealed envelope. Idempotent on `seq` (duplicate seq is a
        no-op, which makes the one-shot migration safely re-runnable)."""
        doc = dict(envelope)
        doc.setdefault("created_dt", datetime.now(timezone.utc))
        try:
            self.collection.insert_one(doc)
        except DuplicateKeyError:
            logger.debug("Audit seq %s already present — skipping", doc.get("seq"))

    # -- read ------------------------------------------------------------- #
    def read_head(self) -> tuple[int, str]:
        """Highest (seq, entry_hash) — the current chain head; genesis if empty."""
        doc = self.collection.find_one(sort=[("seq", -1)])
        if doc and "seq" in doc and "entry_hash" in doc:
            return int(doc["seq"]), str(doc["entry_hash"])
        return 0, audit_chain.GENESIS_HASH

    def count(self) -> int:
        return self.collection.count_documents({})

    def iter_entries(self):
        return self.collection.find(sort=[("seq", 1)])

    # -- verify ----------------------------------------------------------- #
    def verify(self) -> dict:
        """Walk the documents by seq and verify linkage + entry hashes."""
        prev: str | None = None
        verified = 0
        for doc in self.collection.find(sort=[("seq", 1)]):
            seq = doc.get("seq")
            ph = str(doc.get("prev_hash", ""))
            eh = str(doc.get("entry_hash", ""))
            payload = str(doc.get("payload", ""))
            if prev is not None and ph != prev:
                return {
                    "status": "broken",
                    "verified": verified,
                    "broken_at": seq,
                    "reason": "prev_hash linkage mismatch",
                }
            if audit_chain.compute_entry_hash(ph, seq, payload) != eh:
                return {
                    "status": "broken",
                    "verified": verified,
                    "broken_at": seq,
                    "reason": "entry_hash mismatch",
                }
            prev = eh
            verified += 1
        return {
            "status": "ok" if verified else "empty",
            "verified": verified,
            "broken_at": None,
            "head_hash": prev,
        }

    # -- archival (archive THEN expire) ----------------------------------- #
    def archive_and_expire(
        self,
        *,
        archive_after_days: int,
        archiver: Archiver | None = None,
        archive_dir: Path | None = None,
        now: datetime | None = None,
    ) -> dict:
        """Export documents older than `archive_after_days` to cold storage and
        stamp `archived_at` (after which the TTL index reclaims them). Returns a
        summary. Never deletes here — deletion is the TTL index's job, only once
        the doc is safely archived."""
        archiver = archiver or LoggingArchiver()
        now = now or datetime.now(timezone.utc)
        cutoff = now.timestamp() - archive_after_days * 24 * 3600
        cutoff_dt = datetime.fromtimestamp(cutoff, tz=timezone.utc)

        query = {"created_dt": {"$lt": cutoff_dt}, "archived_at": {"$exists": False}}
        docs = list(self.collection.find(query, sort=[("seq", 1)]))
        if not docs:
            return {"archived": 0, "path": None}

        archive_dir = archive_dir or Path("logs") / "archive"
        archive_dir.mkdir(parents=True, exist_ok=True)
        lo, hi = docs[0]["seq"], docs[-1]["seq"]
        out = archive_dir / f"audit_mongo_{lo}_{hi}.jsonl.gz"
        with gzip.open(out, "wb") as f:
            for d in docs:
                d = {k: v for k, v in d.items() if k != "_id"}
                if isinstance(d.get("created_dt"), datetime):
                    d["created_dt"] = d["created_dt"].isoformat()
                f.write(json.dumps(d).encode("utf-8") + b"\n")
        archiver.archive(out)

        seqs = [d["seq"] for d in docs]
        self.collection.update_many(
            {"seq": {"$in": seqs}},
            {"$set": {"archived": True, "archived_at": now}},
        )
        logger.info(
            "Archived %d audit docs (seq %s..%s) -> %s", len(docs), lo, hi, out.name
        )
        return {"archived": len(docs), "path": str(out), "seq_range": [lo, hi]}

    # -- archive to a cold collection THEN expire from active ------------- #
    def archive_to_cold(
        self,
        cold: Collection,
        *,
        retention_days: int,
        now: datetime | None = None,
    ) -> dict:
        """Move docs older than `retention_days` to the `cold` collection and
        delete them from the active one. The current chain head (max seq) is
        NEVER archived, so the active collection never empties and the first
        remaining doc still anchors to the archived head (chain stays verifiable
        on both sides)."""
        now = now or datetime.now(timezone.utc)
        cutoff = datetime.fromtimestamp(
            now.timestamp() - retention_days * 24 * 3600, tz=timezone.utc
        )
        head = self.collection.find_one(sort=[("seq", -1)])
        head_seq = head["seq"] if head else None

        query: dict = {"created_dt": {"$lt": cutoff}}
        if head_seq is not None:
            query["seq"] = {"$ne": head_seq}  # preserve the live anchor
        docs = list(self.collection.find(query, sort=[("seq", 1)]))
        if not docs:
            return {"archived": 0, "seq_range": None, "anchor_hash": None}

        cold.create_index("seq", unique=True, name="uniq_seq")
        for d in docs:
            d = {k: v for k, v in d.items() if k != "_id"}
            try:
                cold.insert_one(d)
            except DuplicateKeyError:
                pass  # idempotent re-run

        seqs = [d["seq"] for d in docs]
        self.collection.delete_many({"seq": {"$in": seqs}})
        lo, hi = docs[0]["seq"], docs[-1]["seq"]
        logger.info(
            "Archived %d audit docs (seq %s..%s) -> %s", len(docs), lo, hi, cold.name
        )
        return {
            "archived": len(docs),
            "seq_range": [lo, hi],
            "anchor_seq": hi,
            "anchor_hash": docs[-1].get("entry_hash"),
        }
