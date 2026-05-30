"""
Tamper-evident hash chaining for the audit trail.

Each audit envelope line carries chain fields so the log becomes append-only
*and* tamper-evident:

    entry_hash = SHA256(prev_hash || seq || payload)

`prev_hash` links to the previous entry's `entry_hash`, forming a chain anchored
at GENESIS_HASH. Any edit, reorder, or deletion of a sealed line breaks either
the recomputed `entry_hash` or the `prev_hash` linkage — which `verify_chain`
reports, pinpointing the first broken sequence number.

This module is pure (hashlib/json/pathlib only) so it can be imported anywhere
without pulling in encryption or app state. The sealing/append side lives in
`src.services.audit.seal_and_append`, which uses these helpers.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

# 64 zero hex chars — the anchor for the very first entry in a fresh trail.
GENESIS_HASH = "0" * 64

# Unit separator between hashed fields so concatenation is unambiguous
# (prevents e.g. seq=1|payload="23" colliding with seq=12|payload="3").
_SEP = b"\x1f"


def compute_entry_hash(prev_hash: str, seq: int, payload: str) -> str:
    """Deterministic SHA-256 over (prev_hash, seq, payload)."""
    h = hashlib.sha256()
    h.update(prev_hash.encode("utf-8"))
    h.update(_SEP)
    h.update(str(seq).encode("utf-8"))
    h.update(_SEP)
    h.update(payload.encode("utf-8"))
    return h.hexdigest()


def is_sealed(env: object) -> bool:
    """True if an envelope dict carries the chain fields."""
    return (
        isinstance(env, dict)
        and "seq" in env
        and "prev_hash" in env
        and "entry_hash" in env
    )


def read_chain_head(audit_file: Path) -> tuple[int, str]:
    """
    Return (last_seq, last_entry_hash) for the sealed suffix of the trail.

    - empty/missing file              -> (0, GENESIS_HASH)
    - only legacy (unsealed) lines    -> (0, sha256(last_raw_line)) so the first
      sealed entry still cryptographically anchors to pre-existing history
    - ends in sealed lines            -> that line's (seq, entry_hash)
    """
    if not audit_file.exists():
        return 0, GENESIS_HASH

    last_sealed: dict | None = None
    last_raw: bytes | None = None
    with open(audit_file, "rb") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            last_raw = line
            try:
                env = json.loads(line)
            except Exception:
                continue
            if is_sealed(env):
                last_sealed = env

    if last_sealed is not None:
        return int(last_sealed["seq"]), str(last_sealed["entry_hash"])
    if last_raw is not None:
        return 0, hashlib.sha256(last_raw).hexdigest()
    return 0, GENESIS_HASH


def verify_chain(audit_file: Path) -> dict:
    """
    Verify the sealed suffix of the audit trail.

    Returns a report dict:
        status:    "ok" | "empty" | "no_chain" | "broken" | "corrupt"
        verified:  number of sealed entries validated
        legacy:    leading unsealed (pre-chain) lines skipped
        total:     total non-empty lines
        broken_at: seq (or line index) where verification failed, else None
        reason:    human-readable failure cause (when broken/corrupt)
        head_hash: entry_hash of the last verified entry (when ok)
    """
    if not audit_file.exists():
        return {
            "status": "empty",
            "verified": 0,
            "legacy": 0,
            "total": 0,
            "broken_at": None,
        }

    prev: str | None = None
    verified = 0
    legacy = 0
    total = 0
    chain_started = False

    def broken(seq, reason):
        return {
            "status": "broken",
            "verified": verified,
            "legacy": legacy,
            "total": total,
            "broken_at": seq,
            "reason": reason,
        }

    with open(audit_file, "rb") as f:
        for idx, raw in enumerate(f):
            raw = raw.strip()
            if not raw:
                continue
            total += 1
            try:
                env = json.loads(raw)
            except Exception:
                return {
                    "status": "corrupt",
                    "verified": verified,
                    "legacy": legacy,
                    "total": total,
                    "broken_at": idx,
                    "reason": "invalid JSON line",
                }

            if not is_sealed(env):
                if chain_started:
                    return broken(idx, "unsealed entry inside the sealed chain")
                # leading legacy line: becomes the anchor candidate
                legacy += 1
                prev = hashlib.sha256(raw).hexdigest()
                continue

            seq = env["seq"]
            ph = str(env["prev_hash"])
            eh = str(env["entry_hash"])
            payload = str(env.get("payload", ""))

            if not chain_started:
                chain_started = True
                # First sealed entry: accept its declared prev_hash as the anchor,
                # but validate the entry is self-consistent.
                if compute_entry_hash(ph, seq, payload) != eh:
                    return broken(seq, "entry_hash mismatch")
                prev = eh
                verified += 1
                continue

            if ph != prev:
                return broken(seq, "prev_hash linkage mismatch")
            if compute_entry_hash(ph, seq, payload) != eh:
                return broken(seq, "entry_hash mismatch")
            prev = eh
            verified += 1

    return {
        "status": "ok" if verified > 0 else "no_chain",
        "verified": verified,
        "legacy": legacy,
        "total": total,
        "broken_at": None,
        "head_hash": prev,
    }
