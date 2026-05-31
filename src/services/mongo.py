"""
MongoDB (Atlas) connection for the audit trail.

Lazy, fail-fast and *degrading*: if MONGODB_URI is unset, the driver can't reach
the cluster, or auth fails, `get_audit_collection()` returns None and the caller
falls back to the local JSONL trail — the audit log is never lost.

Sync PyMongo (not Motor) on purpose: the audit write path
(`audit.seal_and_append`) is synchronous, so a sync, thread-safe, pooled client
is the natural fit and avoids event-loop juggling.

Env:
    MONGODB_URI               Atlas connection string (required to enable Mongo)
    AUDIT_MONGO_ENABLED       "false" disables Mongo even if URI is set (tests)
    AUDIT_MONGO_DB            database name   (default "aether_audit")
    AUDIT_MONGO_COLLECTION    collection name (default "audit_trail")
"""

from __future__ import annotations

import logging
import os

from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.errors import PyMongoError

logger = logging.getLogger(__name__)

_client: MongoClient | None = None
_collection: Collection | None = None
_init_failed = False


def is_enabled() -> bool:
    return (
        bool(os.getenv("MONGODB_URI"))
        and os.getenv("AUDIT_MONGO_ENABLED", "true").lower() != "false"
    )


def get_audit_collection() -> Collection | None:
    """Return the audit collection, or None if Mongo is unavailable.

    The first call pings the cluster (fail-fast); on any failure Mongo is marked
    unavailable for the process so subsequent audit writes don't pay the timeout
    and fall straight through to the JSONL trail.
    """
    global _client, _collection, _init_failed
    if _collection is not None:
        return _collection
    if _init_failed or not is_enabled():
        return None

    uri = os.getenv("MONGODB_URI")
    db_name = os.getenv("AUDIT_MONGO_DB", "aether_audit")
    coll_name = os.getenv("AUDIT_MONGO_COLLECTION", "audit_trail")
    try:
        client = MongoClient(
            uri,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=10000,
            appname="aether-oncology-audit",
        )
        client.admin.command("ping")  # fail fast on bad auth / network
        _client = client
        _collection = client[db_name][coll_name]
        logger.info("Mongo audit store connected: %s.%s", db_name, coll_name)
        return _collection
    except PyMongoError as e:
        _init_failed = True
        logger.warning("Mongo unavailable (%s) — audit trail falls back to JSONL.", e)
        return None


def get_archive_collection() -> Collection | None:
    """Cold collection for archived audit docs (same cluster/db). None if Mongo
    is unavailable."""
    if get_audit_collection() is None:
        return None
    db_name = os.getenv("AUDIT_MONGO_DB", "aether_audit")
    coll_name = os.getenv("AUDIT_MONGO_ARCHIVE_COLLECTION", "audit_trail_archive")
    return _client[db_name][coll_name]


def reset() -> None:
    """Drop cached connection state (used by tests / after config changes)."""
    global _client, _collection, _init_failed
    if _client is not None:
        try:
            _client.close()
        except PyMongoError:
            pass
    _client = None
    _collection = None
    _init_failed = False
