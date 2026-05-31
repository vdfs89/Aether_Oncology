"""
Generate an audit compliance report.

Usage:
    python -m src.scripts.compliance_report [--days N] [--format json|md] [--out PATH]

Reads the active store (MongoDB primary, JSONL fallback), aggregates audit
activity and the tamper-evidence integrity verdict. Defaults: all history, md.
"""

import json
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from src.services.compliance_report import (  # noqa: E402
    generate_report,
    render_markdown,
)


def main(argv: list[str] | None = None) -> int:
    argv = argv if argv is not None else sys.argv[1:]
    days = None
    fmt = "md"
    out = None
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--days":
            days = int(argv[i + 1])
            i += 2
        elif a == "--format":
            fmt = argv[i + 1]
            i += 2
        elif a == "--out":
            out = Path(argv[i + 1])
            i += 2
        else:
            i += 1

    report = generate_report(days=days)
    text = json.dumps(report, indent=2) if fmt == "json" else render_markdown(report)
    if out:
        out.write_text(text, encoding="utf-8")
        print(f"written: {out}")
    else:
        print(text)
    return 0 if report["integrity"]["status"] in ("ok", "empty") else 1


if __name__ == "__main__":
    raise SystemExit(main())
