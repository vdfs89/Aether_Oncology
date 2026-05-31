"""
Audit-trail rotation, compression and archival.

Caps the append-only audit log so it never grows unbounded (disk pressure, slow
I/O, slow head-cache warmup). Rotation is *chain-of-custody preserving*: the new
live segment opens with a `segment_header` that signs the closing head of the
rotated segment, so the tamper-evident hash chain stays unbroken across files
(see `audit_chain`). `seq` is global and monotonic across all segments.

Pipeline per rotation:
    audit_trail.jsonl  --(rename)-->  audit_trail.<N>.jsonl
    new audit_trail.jsonl  <-- starts with a segment_header anchoring segment N
    audit_trail.<N>.jsonl  --(gzip)-->  audit_trail.<N>.jsonl.gz
    archiver(audit_trail.<N>.jsonl.gz)   # cold-storage hook (S3 Glacier stub)

Trigger is hybrid: max size (default 10 MB) OR max age (optional).
"""

from __future__ import annotations

import gzip
import json
import logging
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Protocol

from src.services import audit_chain

logger = logging.getLogger(__name__)

DEFAULT_MAX_BYTES = 10 * 1024 * 1024  # 10 MB


# --------------------------------------------------------------------------- #
#  Policy                                                                      #
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class RotationPolicy:
    """Hybrid rotation trigger: by size and/or by age."""

    max_bytes: int | None = DEFAULT_MAX_BYTES
    max_age_seconds: int | None = None
    compress: bool = True
    enabled: bool = True

    @classmethod
    def from_env(cls) -> RotationPolicy:
        """Build a policy from environment variables.

        AUDIT_ROTATION_ENABLED  (default "true")
        AUDIT_MAX_BYTES         (default 10485760 = 10 MB; 0 disables size cap)
        AUDIT_MAX_AGE_HOURS     (optional; rotate when the segment is older)
        AUDIT_ROTATION_COMPRESS (default "true")
        """
        enabled = os.getenv("AUDIT_ROTATION_ENABLED", "true").lower() != "false"
        max_bytes = int(os.getenv("AUDIT_MAX_BYTES", str(DEFAULT_MAX_BYTES)))
        age_hours = os.getenv("AUDIT_MAX_AGE_HOURS")
        max_age = int(float(age_hours) * 3600) if age_hours else None
        compress = os.getenv("AUDIT_ROTATION_COMPRESS", "true").lower() != "false"
        return cls(
            max_bytes=max_bytes or None,
            max_age_seconds=max_age,
            compress=compress,
            enabled=enabled,
        )


# --------------------------------------------------------------------------- #
#  Archival hook (cold storage)                                               #
# --------------------------------------------------------------------------- #
class Archiver(Protocol):
    """A destination for compressed, rotated segments (e.g. S3 Glacier)."""

    def archive(self, path: Path) -> None: ...


class LoggingArchiver:
    """Default archiver stub: records intent without an external dependency.

    Swap for an S3/Glacier implementation in production. Kept as a stub so the
    rotation pipeline is fully exercised (and testable) without cloud creds.
    """

    def __init__(self, destination: str = "cold-storage://audit-archive"):
        self.destination = destination
        self.archived: list[Path] = []

    def archive(self, path: Path) -> None:
        self.archived.append(path)
        logger.info(
            "ARCHIVE: %s -> %s (%d bytes) [stub — wire to S3 Glacier in prod]",
            path.name,
            self.destination,
            path.stat().st_size if path.exists() else -1,
        )


# --------------------------------------------------------------------------- #
#  Segment discovery / naming                                                 #
# --------------------------------------------------------------------------- #
def _segment_re(stem: str) -> re.Pattern:
    return re.compile(rf"^{re.escape(stem)}\.(\d+)\.jsonl(\.gz)?$")


def next_segment_index(log_dir: Path, stem: str) -> int:
    """Lowest unused 1-based rotation index (counts both .jsonl and .jsonl.gz)."""
    rx = _segment_re(stem)
    indices = [
        int(m.group(1))
        for p in log_dir.glob(f"{stem}.*.jsonl*")
        if (m := rx.match(p.name))
    ]
    return (max(indices) + 1) if indices else 1


def list_segments(log_dir: Path, stem: str) -> list[Path]:
    """All trail segments oldest -> newest: rotated .1..N (gz or plain) then the
    live file (if it exists)."""
    rx = _segment_re(stem)
    rotated = sorted(
        (p for p in log_dir.glob(f"{stem}.*.jsonl*") if rx.match(p.name)),
        key=lambda p: int(rx.match(p.name).group(1)),
    )
    live = log_dir / f"{stem}.jsonl"
    return rotated + ([live] if live.exists() else [])


# --------------------------------------------------------------------------- #
#  Segment header (chain of custody)                                          #
# --------------------------------------------------------------------------- #
def make_segment_header(
    *,
    prev_segment: str,
    prev_seq: int,
    prev_head_hash: str,
    segment_index: int,
    opened_at: str,
) -> dict:
    """Build the signed header that opens a rotated-into live segment."""
    return {
        "type": audit_chain.SEGMENT_HEADER_TYPE,
        "segment_index": segment_index,
        "prev_segment": prev_segment,
        "prev_seq": prev_seq,
        "prev_head_hash": prev_head_hash,
        "opened_at": opened_at,
        "header_hash": audit_chain.compute_header_hash(
            prev_head_hash, prev_seq, segment_index
        ),
    }


def _segment_opened_at(live_file: Path) -> datetime | None:
    """Best-effort open time of the current live segment: the header's opened_at
    if present, else the file mtime."""
    try:
        with open(live_file, "rb") as f:
            first = f.readline().strip()
        if first:
            env = json.loads(first)
            if audit_chain.is_segment_header(env) and env.get("opened_at"):
                return datetime.fromisoformat(env["opened_at"])
    except Exception:
        pass
    try:
        return datetime.fromtimestamp(live_file.stat().st_mtime, tz=timezone.utc)
    except OSError:
        return None


# --------------------------------------------------------------------------- #
#  Trigger                                                                     #
# --------------------------------------------------------------------------- #
def should_rotate(
    live_file: Path, policy: RotationPolicy, now: datetime | None = None
) -> bool:
    if not policy.enabled or not live_file.exists():
        return False
    if policy.max_bytes and live_file.stat().st_size >= policy.max_bytes:
        return True
    if policy.max_age_seconds:
        opened = _segment_opened_at(live_file)
        now = now or datetime.now(timezone.utc)
        if opened is not None:
            if opened.tzinfo is None:
                opened = opened.replace(tzinfo=timezone.utc)
            if (now - opened).total_seconds() >= policy.max_age_seconds:
                return True
    return False


# --------------------------------------------------------------------------- #
#  Rotate                                                                      #
# --------------------------------------------------------------------------- #
def rotate(
    live_file: Path,
    *,
    head_seq: int,
    head_hash: str,
    policy: RotationPolicy | None = None,
    archiver: Archiver | None = None,
    now_iso: str | None = None,
) -> dict:
    """
    Rotate the live file, preserving the hash chain across the split.

    Returns metadata: {segment_index, rotated_path, compressed, archived, header}.
    Caller holds the append lock and passes the current chain head
    (head_seq/head_hash) so the new segment can sign its parent's close.
    """
    policy = policy or RotationPolicy.from_env()
    log_dir = live_file.parent
    stem = live_file.stem  # "audit_trail"
    idx = next_segment_index(log_dir, stem)

    rotated_path = log_dir / f"{stem}.{idx}.jsonl"
    live_file.rename(rotated_path)

    # New live segment opens with a header signing the rotated segment's close.
    opened_at = now_iso or datetime.now(timezone.utc).isoformat()
    header = make_segment_header(
        prev_segment=rotated_path.name,
        prev_seq=head_seq,
        prev_head_hash=head_hash,
        segment_index=idx,
        opened_at=opened_at,
    )
    with open(live_file, "wb") as f:
        f.write(json.dumps(header).encode("utf-8") + b"\n")
        f.flush()
        os.fsync(f.fileno())

    # Compress the rotated segment and hand it to the archiver.
    final_path = rotated_path
    compressed = False
    if policy.compress:
        final_path = _gzip_file(rotated_path)
        compressed = True

    archived = False
    if archiver is not None:
        archiver.archive(final_path)
        archived = True

    logger.info(
        "ROTATE: live -> %s (seq head=%d, compressed=%s, archived=%s)",
        final_path.name,
        head_seq,
        compressed,
        archived,
    )
    return {
        "segment_index": idx,
        "rotated_path": str(final_path),
        "compressed": compressed,
        "archived": archived,
        "header": header,
    }


def _gzip_file(path: Path) -> Path:
    """Gzip `path` to `path.gz`, removing the original. Returns the .gz path."""
    gz_path = path.with_suffix(path.suffix + ".gz")
    with open(path, "rb") as src, gzip.open(gz_path, "wb") as dst:
        dst.writelines(src)
    path.unlink()
    return gz_path


# --------------------------------------------------------------------------- #
#  Whole-history verification                                                 #
# --------------------------------------------------------------------------- #
def verify_trail(log_dir: Path, stem: str = "audit_trail") -> dict:
    """
    Verify the entire chain of custody across every segment, oldest to newest.

    Checks each segment internally (`audit_chain.verify_chain`) AND that each
    rotated-into segment's header anchors to the *actual* closing head of the
    previous segment — so fragmenting the log cannot hide tampering.

    Returns: {status, segments, verified, broken_at, reason}.
    """
    segments = list_segments(log_dir, stem)
    if not segments:
        return {"status": "empty", "segments": 0, "verified": 0, "broken_at": None}

    prev_head: str | None = None
    total_verified = 0
    for seg in segments:
        report = audit_chain.verify_chain(seg)
        if report["status"] in ("broken", "corrupt"):
            return {
                "status": report["status"],
                "segments": len(segments),
                "verified": total_verified,
                "broken_at": f"{seg.name}:{report.get('broken_at')}",
                "reason": report.get("reason"),
            }
        # Cross-segment custody: this segment's anchor must equal the previous
        # segment's real closing head.
        anchor = report.get("anchor")
        if prev_head is not None and anchor is not None and anchor != prev_head:
            return {
                "status": "broken",
                "segments": len(segments),
                "verified": total_verified,
                "broken_at": seg.name,
                "reason": "segment anchor does not match previous segment head",
            }
        total_verified += report.get("verified", 0)
        # Carry this segment's head (fall back to the prior head for empty ones).
        prev_head = report.get("head_hash") or prev_head

    return {
        "status": "ok",
        "segments": len(segments),
        "verified": total_verified,
        "broken_at": None,
        "head_hash": prev_head,
    }
