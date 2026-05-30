"""Tests for tamper-evident audit log hash-chaining."""

import json

import pytest

from src.services import audit
from src.services.audit import decrypt_entry, seal_and_append
from src.services.audit_chain import (
    GENESIS_HASH,
    compute_entry_hash,
    read_chain_head,
    verify_chain,
)


@pytest.fixture(autouse=True)
def _clear_chain_cache():
    """Each test starts with a clean in-process chain-head cache."""
    audit._chain_heads.clear()
    yield
    audit._chain_heads.clear()


def _read_lines(path):
    with open(path, "rb") as f:
        return [ln for ln in f.read().split(b"\n") if ln.strip()]


def _write_lines(path, lines):
    with open(path, "wb") as f:
        for ln in lines:
            f.write(ln + b"\n")


# --------------------------------------------------------------------------- #
#  Pure hash helpers                                                          #
# --------------------------------------------------------------------------- #
def test_compute_entry_hash_is_deterministic():
    a = compute_entry_hash(GENESIS_HASH, 1, "payload")
    b = compute_entry_hash(GENESIS_HASH, 1, "payload")
    assert a == b
    assert len(a) == 64


def test_compute_entry_hash_sensitive_to_each_field():
    base = compute_entry_hash(GENESIS_HASH, 1, "payload")
    assert base != compute_entry_hash("f" * 64, 1, "payload")  # prev_hash
    assert base != compute_entry_hash(GENESIS_HASH, 2, "payload")  # seq
    assert base != compute_entry_hash(GENESIS_HASH, 1, "payloaD")  # payload


def test_field_separator_prevents_collision():
    # seq=1|payload="23"  must not collide with seq=12|payload="3"
    assert compute_entry_hash(GENESIS_HASH, 1, "23") != compute_entry_hash(
        GENESIS_HASH, 12, "3"
    )


def test_read_chain_head_empty(tmp_path):
    assert read_chain_head(tmp_path / "missing.jsonl") == (0, GENESIS_HASH)


# --------------------------------------------------------------------------- #
#  Sealing + verification                                                     #
# --------------------------------------------------------------------------- #
def test_seal_and_append_builds_valid_chain(tmp_path):
    f = tmp_path / "audit.jsonl"
    for i in range(5):
        seal_and_append({"event": i}, f)

    report = verify_chain(f)
    assert report["status"] == "ok"
    assert report["verified"] == 5
    assert report["broken_at"] is None


def test_chain_links_and_increments(tmp_path):
    f = tmp_path / "audit.jsonl"
    e1 = seal_and_append({"event": 1}, f)
    e2 = seal_and_append({"event": 2}, f)

    assert e1["seq"] == 1 and e2["seq"] == 2
    assert e1["prev_hash"] == GENESIS_HASH
    assert e2["prev_hash"] == e1["entry_hash"]  # chained


def test_sealed_entry_still_decrypts(tmp_path):
    f = tmp_path / "audit.jsonl"
    seal_and_append({"event": "secret", "age": 42}, f)
    line = _read_lines(f)[0]
    decrypted = decrypt_entry(line)
    assert decrypted == {"event": "secret", "age": 42}


# --------------------------------------------------------------------------- #
#  Tamper detection                                                           #
# --------------------------------------------------------------------------- #
def test_detects_payload_tampering(tmp_path):
    f = tmp_path / "audit.jsonl"
    for i in range(4):
        seal_and_append({"event": i}, f)

    # Flip a character in the encrypted payload of entry #2 (seq=2)
    lines = _read_lines(f)
    env = json.loads(lines[1])
    env["payload"] = "X" + env["payload"][1:]
    lines[1] = json.dumps(env).encode("utf-8")
    _write_lines(f, lines)

    report = verify_chain(f)
    assert report["status"] == "broken"
    assert report["broken_at"] == 2


def test_detects_deleted_entry(tmp_path):
    f = tmp_path / "audit.jsonl"
    for i in range(4):
        seal_and_append({"event": i}, f)

    # Remove the 3rd line — the 4th's prev_hash no longer links
    lines = _read_lines(f)
    del lines[2]
    _write_lines(f, lines)

    report = verify_chain(f)
    assert report["status"] == "broken"
    assert report["reason"] == "prev_hash linkage mismatch"


def test_detects_reordered_entries(tmp_path):
    f = tmp_path / "audit.jsonl"
    for i in range(4):
        seal_and_append({"event": i}, f)

    lines = _read_lines(f)
    lines[1], lines[2] = lines[2], lines[1]
    _write_lines(f, lines)

    report = verify_chain(f)
    assert report["status"] == "broken"


def test_detects_corrupt_json(tmp_path):
    f = tmp_path / "audit.jsonl"
    seal_and_append({"event": 1}, f)
    lines = _read_lines(f)
    lines.append(b"{not-valid-json")
    _write_lines(f, lines)

    report = verify_chain(f)
    assert report["status"] in ("broken", "corrupt")


# --------------------------------------------------------------------------- #
#  Persistence across "restart"                                               #
# --------------------------------------------------------------------------- #
def test_chain_survives_process_restart(tmp_path):
    f = tmp_path / "audit.jsonl"
    seal_and_append({"event": 1}, f)
    seal_and_append({"event": 2}, f)

    # Simulate a restart: drop the in-memory head cache so the next append must
    # recover the chain head from disk.
    audit._chain_heads.clear()

    e3 = seal_and_append({"event": 3}, f)
    assert e3["seq"] == 3
    report = verify_chain(f)
    assert report["status"] == "ok"
    assert report["verified"] == 3


def test_first_sealed_entry_anchors_to_legacy_tail(tmp_path):
    """A legacy (unsealed) trail keeps working; new entries seal from there."""
    f = tmp_path / "audit.jsonl"
    # Pre-existing legacy line (no chain fields)
    legacy = {"key_version": "v1", "encrypted": True, "payload": "legacy"}
    _write_lines(f, [json.dumps(legacy).encode("utf-8")])

    seal_and_append({"event": "new"}, f)
    report = verify_chain(f)
    assert report["status"] == "ok"
    assert report["legacy"] == 1
    assert report["verified"] == 1
