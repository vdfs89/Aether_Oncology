"""
Tamper-evident hash chaining for the audit trail.

Each audit envelope line carries chain fields so the log becomes append-only
*and* tamper-evident:

    entry_hash = SHA256(prev_hash || seq || payload)

`prev_hash` links to the previous entry's `entry_hash`, forming a chain anchored
at GENESIS_HASH. Any edit, reorder, or deletion of a sealed line breaks either
the recomputed `entry_hash` or the `prev_hash` linkage — which `verify_chain`
reports, pinpointing the first broken sequence number.

Chain of custody across rotation
--------------------------------
When the live file rotates, the new live file opens with a *segment header* that
carries the closing head (seq + hash) of the rotated segment. The first sealed
entry of the new file links to that head, so the chain stays unbroken even though
the storage is fragmented across files. `seq` is GLOBAL and monotonic across
every segment, so `verify_trail` can walk the whole history linearly.

This module is pure (hashlib/json/gzip/pathlib only) so it can be imported
anywhere without pulling in encryption or app state. The sealing/append side
lives in `src.services.audit.seal_and_append`; rotation in
`src.services.audit_rotation`.
"""

from __future__ import annotations

import gzip
import hashlib
import json
from pathlib import Path

# 64 zero hex chars — the anchor for the very first entry in a fresh trail.
GENESIS_HASH = "0" * 64

# Marks the first line of a rotated-into segment (chain-of-custody header).
SEGMENT_HEADER_TYPE = "segment_header"

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


def compute_header_hash(prev_head_hash: str, prev_seq: int, segment_index: int) -> str:
    """Deterministic SHA-256 binding a segment header to its parent's head."""
    h = hashlib.sha256()
    h.update(prev_head_hash.encode("utf-8"))
    h.update(_SEP)
    h.update(str(prev_seq).encode("utf-8"))
    h.update(_SEP)
    h.update(str(segment_index).encode("utf-8"))
    return h.hexdigest()


def is_sealed(env: object) -> bool:
    """True if an envelope dict carries the chain fields of a sealed entry."""
    return (
        isinstance(env, dict)
        and "seq" in env
        and "prev_hash" in env
        and "entry_hash" in env
        and env.get("type") != SEGMENT_HEADER_TYPE
    )


def is_segment_header(env: object) -> bool:
    """True if an envelope dict is a rotation segment header."""
    return isinstance(env, dict) and env.get("type") == SEGMENT_HEADER_TYPE


def _open_lines(path: Path):
    """Open a trail file for binary line iteration, transparently gunzipping
    `.gz` segments."""
    if str(path).endswith(".gz"):
        return gzip.open(path, "rb")
    return open(path, "rb")


def read_chain_head(audit_file: Path) -> tuple[int, str]:
    """
    Return (last_seq, last_entry_hash) for the chain head of a segment.

    - empty/missing file              -> (0, GENESIS_HASH)
    - ends in sealed lines            -> that line's (seq, entry_hash)
    - only a segment header (post-rotation, no entries yet)
                                      -> (header.prev_seq, header.prev_head_hash)
    - only legacy (unsealed) lines    -> (0, sha256(last_raw_line)) so the first
      sealed entry still cryptographically anchors to pre-existing history
    """
    if not audit_file.exists():
        return 0, GENESIS_HASH

    last_sealed: dict | None = None
    header: dict | None = None
    last_raw: bytes | None = None
    with _open_lines(audit_file) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                env = json.loads(line)
            except Exception:
                last_raw = line
                continue
            if is_segment_header(env) and header is None and last_sealed is None:
                header = env
            elif is_sealed(env):
                last_sealed = env
            last_raw = line

    if last_sealed is not None:
        return int(last_sealed["seq"]), str(last_sealed["entry_hash"])
    if header is not None:
        return int(header["prev_seq"]), str(header["prev_head_hash"])
    if last_raw is not None:
        return 0, hashlib.sha256(last_raw).hexdigest()
    return 0, GENESIS_HASH


def verify_chain(audit_file: Path) -> dict:
    """
    Verify the sealed suffix of a single trail segment.

    A leading segment header (if present) is validated and used as the required
    anchor for the first sealed entry, proving the segment links to its parent.

    Returns a report dict:
        status:    "ok" | "empty" | "no_chain" | "broken" | "corrupt"
        verified:  number of sealed entries validated
        legacy:    leading unsealed (pre-chain) lines skipped
        total:     total non-empty lines
        broken_at: seq (or line index) where verification failed, else None
        reason:    human-readable failure cause (when broken/corrupt)
        head_hash: entry_hash of the last verified entry (when ok)
        anchor:    parent head hash if the segment carried a header, else None
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
    anchor: str | None = None
    verified = 0
    legacy = 0
    total = 0
    chain_started = False
    anchored = False
    content_seen = False

    def broken(where, reason):
        return {
            "status": "broken",
            "verified": verified,
            "legacy": legacy,
            "total": total,
            "broken_at": where,
            "reason": reason,
            "anchor": anchor,
        }

    with _open_lines(audit_file) as f:
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
                    "anchor": anchor,
                }

            if is_segment_header(env):
                if content_seen:
                    return broken(
                        env.get("segment_index"), "segment header not at file start"
                    )
                ph0 = str(env.get("prev_head_hash", ""))
                ps0 = env.get("prev_seq")
                si = env.get("segment_index")
                if compute_header_hash(ph0, ps0, si) != env.get("header_hash"):
                    return broken(si, "segment header hash mismatch")
                anchor = ph0
                prev = ph0
                anchored = True
                continue

            content_seen = True

            if not is_sealed(env):
                if chain_started or anchored:
                    return broken(idx, "unsealed entry inside the sealed chain")
                # leading legacy line: anchor candidate for a pre-chain trail
                legacy += 1
                prev = hashlib.sha256(raw).hexdigest()
                continue

            seq = env["seq"]
            ph = str(env["prev_hash"])
            eh = str(env["entry_hash"])
            payload = str(env.get("payload", ""))

            if not chain_started:
                chain_started = True
                # A segment header makes the anchor mandatory; otherwise the first
                # sealed entry's declared prev_hash is accepted as the anchor.
                if anchored and ph != prev:
                    return broken(seq, "prev_hash linkage mismatch (segment anchor)")
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
        "anchor": anchor,
    }
