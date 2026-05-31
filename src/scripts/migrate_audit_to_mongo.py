"""
One-shot migration: import the existing JSONL audit trail into MongoDB.

Reads every segment (live + rotated .gz) oldest-first and inserts each sealed
envelope into the Mongo audit collection, preserving seq / prev_hash / entry_hash
so the tamper-evident chain is identical. Idempotent on `seq` — safe to re-run.

Usage:
    python -m src.scripts.migrate_audit_to_mongo [log_dir]

Requires MONGODB_URI (and working Atlas auth). Verifies the chain after import.
"""

import json
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from src.services import audit_chain, mongo  # noqa: E402
from src.services.audit import AUDIT_FILE  # noqa: E402
from src.services.audit_rotation import list_segments  # noqa: E402
from src.services.audit_store_mongo import MongoAuditStore  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    argv = argv if argv is not None else sys.argv[1:]
    log_dir = Path(argv[0]) if argv else AUDIT_FILE.parent

    coll = mongo.get_audit_collection()
    if coll is None:
        print("ERROR: MongoDB unavailable (check MONGODB_URI / Atlas auth).")
        return 1

    store = MongoAuditStore(coll)
    store.ensure_indexes()

    segments = list_segments(log_dir, AUDIT_FILE.stem)
    imported = skipped = 0
    for seg in segments:
        with audit_chain._open_lines(seg) as f:
            for raw in f:
                raw = raw.strip()
                if not raw:
                    continue
                try:
                    env = json.loads(raw)
                except Exception:
                    skipped += 1
                    continue
                if audit_chain.is_sealed(env):
                    before = store.count()
                    store.append(env)
                    imported += store.count() - before
                else:
                    skipped += 1  # segment headers / legacy lines

    report = store.verify()
    print(f"segments scanned : {len(segments)}")
    print(f"imported         : {imported}")
    print(f"skipped          : {skipped} (headers / legacy / unparseable)")
    print(f"mongo total      : {store.count()}")
    print(f"chain verify     : {report['status']} (verified={report['verified']})")
    return 0 if report["status"] in ("ok", "empty") else 1


if __name__ == "__main__":
    raise SystemExit(main())
