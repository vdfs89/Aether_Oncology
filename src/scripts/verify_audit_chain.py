"""
Verify the tamper-evidence hash-chain of the audit trail.

Usage:
    python -m src.scripts.verify_audit_chain [path/to/audit_trail.jsonl]

Exit code 0 if the sealed chain verifies, 1 otherwise — suitable for CI / cron
compliance checks. Does NOT need AUDIT_ENCRYPTION_KEY: the chain is computed over
the encrypted payloads, so integrity can be proven without decrypting PHI.
"""

import sys
from pathlib import Path

from src.services.audit import AUDIT_FILE
from src.services.audit_chain import verify_chain


def main(argv: list[str] | None = None) -> int:
    argv = argv if argv is not None else sys.argv[1:]
    target = Path(argv[0]) if argv else AUDIT_FILE

    report = verify_chain(target)
    status = report["status"]

    print(f"audit trail: {target}")
    print(f"status     : {status}")
    print(f"verified   : {report.get('verified', 0)} sealed entries")
    if report.get("legacy"):
        print(f"legacy     : {report['legacy']} pre-chain line(s) skipped")
    if report.get("head_hash"):
        print(f"head hash  : {report['head_hash']}")
    if status in ("broken", "corrupt"):
        print(
            f"BROKEN AT  : seq/line {report.get('broken_at')} — {report.get('reason')}"
        )

    return 0 if status in ("ok", "empty", "no_chain") else 1


if __name__ == "__main__":
    raise SystemExit(main())
