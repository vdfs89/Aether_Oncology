"""Tests for audit-trail rotation, compression, archival and cross-segment
chain-of-custody verification."""

import gzip
import json

import pytest

from src.services import audit, audit_rotation
from src.services.audit import seal_and_append
from src.services.audit_chain import compute_entry_hash, read_chain_head, verify_chain
from src.services.audit_rotation import (
    LoggingArchiver,
    RotationPolicy,
    list_segments,
    next_segment_index,
    should_rotate,
    verify_trail,
)


@pytest.fixture(autouse=True)
def _clear_chain_cache():
    audit._chain_heads.clear()
    yield
    audit._chain_heads.clear()


@pytest.fixture
def archiver(monkeypatch):
    """Swap the module archiver for a fresh inspectable stub."""
    arc = LoggingArchiver()
    monkeypatch.setattr(audit, "_archiver", arc)
    return arc


def _read_gz_lines(path):
    with gzip.open(path, "rb") as f:
        return [ln for ln in f.read().split(b"\n") if ln.strip()]


# --------------------------------------------------------------------------- #
#  Trigger                                                                     #
# --------------------------------------------------------------------------- #
def test_should_rotate_by_size(tmp_path):
    f = tmp_path / "audit_trail.jsonl"
    f.write_bytes(b"x" * 500)
    assert should_rotate(f, RotationPolicy(max_bytes=400))
    assert not should_rotate(f, RotationPolicy(max_bytes=1000))


def test_should_rotate_disabled(tmp_path):
    f = tmp_path / "audit_trail.jsonl"
    f.write_bytes(b"x" * 500)
    assert not should_rotate(f, RotationPolicy(max_bytes=10, enabled=False))


def test_should_rotate_by_age(tmp_path):
    f = tmp_path / "audit_trail.jsonl"
    # Craft a live file opened in the distant past via its segment header.
    header = audit_rotation.make_segment_header(
        prev_segment="audit_trail.1.jsonl",
        prev_seq=3,
        prev_head_hash="a" * 64,
        segment_index=1,
        opened_at="2000-01-01T00:00:00+00:00",
    )
    f.write_bytes(json.dumps(header).encode() + b"\n")
    pol = RotationPolicy(max_bytes=None, max_age_seconds=60)
    assert should_rotate(f, pol)


# --------------------------------------------------------------------------- #
#  Segment discovery                                                          #
# --------------------------------------------------------------------------- #
def test_next_index_and_listing(tmp_path):
    (tmp_path / "audit_trail.1.jsonl.gz").write_bytes(b"")
    (tmp_path / "audit_trail.2.jsonl").write_bytes(b"")
    (tmp_path / "audit_trail.jsonl").write_bytes(b"")
    assert next_segment_index(tmp_path, "audit_trail") == 3
    names = [p.name for p in list_segments(tmp_path, "audit_trail")]
    assert names == [
        "audit_trail.1.jsonl.gz",
        "audit_trail.2.jsonl",
        "audit_trail.jsonl",
    ]


# --------------------------------------------------------------------------- #
#  Rotation preserves the chain                                               #
# --------------------------------------------------------------------------- #
def test_rotation_compresses_and_archives(tmp_path, archiver):
    f = tmp_path / "audit_trail.jsonl"
    pol = RotationPolicy(max_bytes=200, compress=True)

    for i in range(4):
        seal_and_append({"event": i}, f, policy=pol)

    # The rotated segment is gzipped (original .jsonl gone) and archived.
    assert (tmp_path / "audit_trail.1.jsonl.gz").exists()
    assert not (tmp_path / "audit_trail.1.jsonl").exists()
    assert any(p.name == "audit_trail.1.jsonl.gz" for p in archiver.archived)


def test_chain_survives_rotation(tmp_path, archiver):
    f = tmp_path / "audit_trail.jsonl"
    pol = RotationPolicy(max_bytes=200, compress=True)
    for i in range(6):
        seal_and_append({"event": i}, f, policy=pol)

    report = verify_trail(tmp_path, "audit_trail")
    assert report["status"] == "ok"
    assert report["verified"] == 6
    assert report["segments"] >= 2  # at least one rotation happened


def test_seq_is_global_monotonic_across_rotation(tmp_path, archiver):
    f = tmp_path / "audit_trail.jsonl"
    pol = RotationPolicy(max_bytes=200, compress=False)
    seqs = [seal_and_append({"event": i}, f, policy=pol)["seq"] for i in range(5)]
    assert seqs == [1, 2, 3, 4, 5]  # never resets per file


def test_new_segment_header_anchors_to_rotated_head(tmp_path, archiver):
    f = tmp_path / "audit_trail.jsonl"
    # Large cap so exactly one rotation happens (entry 2 trips it).
    pol = RotationPolicy(max_bytes=200, compress=False)
    seal_and_append({"event": 0}, f, policy=pol)  # fills past the cap
    seal_and_append({"event": 1}, f, policy=pol)  # triggers the single rotation

    # The live file opens with a header whose prev_head_hash equals the rotated
    # segment's true closing head.
    rotated = tmp_path / "audit_trail.1.jsonl"
    rotated_head = verify_chain(rotated)["head_hash"]
    live_first = json.loads(
        (tmp_path / "audit_trail.jsonl").read_bytes().splitlines()[0]
    )
    assert live_first["type"] == "segment_header"
    assert live_first["prev_head_hash"] == rotated_head


def test_head_recovered_from_segment_header_after_restart(tmp_path, archiver):
    f = tmp_path / "audit_trail.jsonl"
    pol = RotationPolicy(max_bytes=200, compress=False)
    for i in range(3):
        seal_and_append({"event": i}, f, policy=pol)

    last_seq, last_hash = audit._chain_heads[str(f)]
    audit._chain_heads.clear()  # simulate restart
    assert read_chain_head(f) == (last_seq, last_hash)


# --------------------------------------------------------------------------- #
#  Cross-segment tamper detection                                             #
# --------------------------------------------------------------------------- #
def test_verify_trail_detects_tampering_in_gz_segment(tmp_path, archiver):
    f = tmp_path / "audit_trail.jsonl"
    pol = RotationPolicy(max_bytes=200, compress=True)
    for i in range(6):
        seal_and_append({"event": i}, f, policy=pol)

    gz = sorted(tmp_path.glob("audit_trail.*.jsonl.gz"))[0]
    lines = _read_gz_lines(gz)
    env = json.loads(lines[0])
    env["payload"] = "TAMPERED" + env["payload"][8:]
    lines[0] = json.dumps(env).encode()
    with gzip.open(gz, "wb") as out:
        out.write(b"\n".join(lines) + b"\n")

    report = verify_trail(tmp_path, "audit_trail")
    assert report["status"] == "broken"


def test_verify_trail_detects_resigned_segment_via_anchor(tmp_path, archiver):
    """Re-signing a tampered entry within a rotated segment keeps that segment
    internally valid, but the cross-segment anchor still catches it."""
    f = tmp_path / "audit_trail.jsonl"
    pol = RotationPolicy(max_bytes=200, compress=False)
    for i in range(4):
        seal_and_append({"event": i}, f, policy=pol)

    rotated = sorted(tmp_path.glob("audit_trail.*.jsonl"))[0]
    lines = [ln for ln in rotated.read_bytes().split(b"\n") if ln.strip()]
    env = json.loads(lines[-1])
    # Tamper the payload AND re-sign so the segment verifies on its own.
    env["payload"] = "RESIGNED" + env["payload"][8:]
    env["entry_hash"] = compute_entry_hash(env["prev_hash"], env["seq"], env["payload"])
    lines[-1] = json.dumps(env).encode()
    rotated.write_bytes(b"\n".join(lines) + b"\n")

    # The rotated segment now verifies internally...
    assert verify_chain(rotated)["status"] == "ok"
    # ...but the live segment's header still anchors to the ORIGINAL head.
    report = verify_trail(tmp_path, "audit_trail")
    assert report["status"] == "broken"
    assert "anchor" in report["reason"]
