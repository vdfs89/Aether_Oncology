#!/usr/bin/env python
import json
import os
from pathlib import Path

from cryptography.fernet import Fernet


def load_env():
    """Manually parse .env to avoid external dependencies."""
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key.strip()] = value.strip()


def main():
    load_env()

    key = os.getenv("AUDIT_ENCRYPTION_KEY")
    if not key:
        print(
            "ERROR: AUDIT_ENCRYPTION_KEY environment variable not found in .env or system environment."
        )
        return

    try:
        fernet = Fernet(key.encode())
    except Exception as e:
        print(f"ERROR: Invalid AUDIT_ENCRYPTION_KEY format: {e}")
        return

    root_dir = Path(__file__).resolve().parents[2]
    audit_file = root_dir / "logs" / "audit_trail.jsonl"

    if not audit_file.exists():
        print(f"INFO: Audit log file not found at {audit_file}. Nothing to migrate.")
        return

    print(f"INFO: Starting migration of audit logs at {audit_file}...")

    migrated_count = 0
    already_encrypted_count = 0
    corrupted_count = 0
    new_lines = []

    with open(audit_file, "rb") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            # Check if line is already encrypted envelope
            try:
                data = json.loads(line.decode("utf-8"))
                if isinstance(data, dict) and data.get("encrypted") is True:
                    # Validate it can be decrypted
                    payload = data.get("payload", "")
                    fernet.decrypt(payload.encode("utf-8"))
                    new_lines.append(line)
                    already_encrypted_count += 1
                    continue
            except Exception:
                # Not an encrypted envelope or decryption failed
                pass

            # If not already encrypted, try to parse as plaintext JSON to encrypt it
            try:
                plaintext_data = json.loads(line.decode("utf-8"))
                # Encrypt and wrap in envelope
                encrypted_bytes = fernet.encrypt(
                    json.dumps(plaintext_data).encode("utf-8")
                )
                envelope = {
                    "key_version": "v1",
                    "algorithm": "fernet",
                    "encrypted": True,
                    "payload": encrypted_bytes.decode("utf-8"),
                }
                new_lines.append(json.dumps(envelope).encode("utf-8"))
                migrated_count += 1
            except Exception as e:
                # Truly corrupted or unparseable line
                print(f"WARNING: Skipping unparseable/corrupted line: {e}")
                corrupted_count += 1

    if migrated_count > 0:
        # Write back migrated logs
        with open(audit_file, "wb") as f:
            for line in new_lines:
                f.write(line + b"\n")
        print(
            f"SUCCESS: Migration completed. Migrated: {migrated_count}, Already encrypted: {already_encrypted_count}, Corrupted skipped: {corrupted_count}"
        )
    else:
        print(
            f"INFO: No migration needed. All {already_encrypted_count} entries were already encrypted."
        )


if __name__ == "__main__":
    main()
