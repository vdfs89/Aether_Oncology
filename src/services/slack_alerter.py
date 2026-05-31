"""
Real-time Slack alerting for the audit trail.

`send_alert(level, title, details)` posts to SLACK_WEBHOOK_URL fire-and-forget:
it never blocks the caller and never raises — a failed alert must not break the
main flow. Works from sync OR async code (schedules an asyncio task if a loop is
running, else a daemon thread). No webhook configured => no-op (CI/tests stay
silent).

Trigger helpers (wired at their real call sites):
  - alert_chain_status()    T1: verify_chain/verify failure -> CRITICAL
  - send_alert(... judge)   T2: judge fail-open -> CRITICAL (see judge_provider)
  - evaluate_volume()       T3: 0 entries in usage hours / >10x spike -> WARNING
  - record_decrypt_result() T4: 3+ consecutive decrypt errors -> WARNING
"""

from __future__ import annotations

import logging
import os
import threading
import time

import requests

logger = logging.getLogger(__name__)

CRITICAL = "critical"
WARNING = "warning"

_COLORS = {CRITICAL: "#D7263D", WARNING: "#E9A23B"}
_EMOJI = {CRITICAL: "🚨", WARNING: "⚠️"}

# anti-spam: per (level,title) cooldown
_lock = threading.Lock()
_last_sent: dict[tuple[str, str], float] = {}
_consec_decrypt_fail = 0


def _cooldown_sec() -> int:
    return int(os.getenv("AUDIT_ALERT_COOLDOWN_SEC", "60"))


def _post(url: str, payload: dict) -> None:
    try:
        requests.post(url, json=payload, timeout=5)
    except Exception as e:  # noqa: BLE001 - alert delivery must never raise
        logger.warning("Slack alert delivery failed: %s", e)


def _deliver(url: str, payload: dict) -> None:
    """Dispatch without blocking: asyncio task if a loop runs, else a thread."""
    try:
        import asyncio

        loop = asyncio.get_running_loop()
        loop.create_task(asyncio.to_thread(_post, url, payload))
    except RuntimeError:
        threading.Thread(target=_post, args=(url, payload), daemon=True).start()


def send_alert(level: str, title: str, details: str = "") -> bool:
    """Fire-and-forget Slack alert. Returns False if suppressed (no webhook or
    within cooldown)."""
    url = os.getenv("SLACK_WEBHOOK_URL")
    if not url:
        logger.debug("Slack alert suppressed (no SLACK_WEBHOOK_URL): %s", title)
        return False

    key = (level, title)
    now = time.time()
    with _lock:
        last = _last_sent.get(key, 0.0)
        if now - last < _cooldown_sec():
            return False
        _last_sent[key] = now

    payload = {
        "attachments": [
            {
                "color": _COLORS.get(level, "#999999"),
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"{_EMOJI.get(level, '')} *{title}*\n{details}",
                        },
                    }
                ],
            }
        ]
    }
    _deliver(url, payload)
    return True


# --------------------------------------------------------------------------- #
#  T1 — chain integrity                                                       #
# --------------------------------------------------------------------------- #
def alert_chain_status(report: dict, source: str) -> bool:
    """Alert CRITICAL if a verify report is broken/corrupt."""
    if report.get("status") in ("broken", "corrupt"):
        return send_alert(
            CRITICAL,
            "Audit chain integrity FAILED",
            f"source=`{source}` status=`{report['status']}` "
            f"broken_at=`{report.get('broken_at')}` reason=`{report.get('reason')}`",
        )
    return False


# --------------------------------------------------------------------------- #
#  T4 — recurring decrypt errors                                              #
# --------------------------------------------------------------------------- #
def _decrypt_threshold() -> int:
    return int(os.getenv("AUDIT_DECRYPT_ALERT_THRESHOLD", "3"))


def record_decrypt_result(ok: bool) -> None:
    """Track consecutive decrypt outcomes; alert WARNING at the threshold."""
    global _consec_decrypt_fail
    with _lock:
        if ok:
            _consec_decrypt_fail = 0
            return
        _consec_decrypt_fail += 1
        hit = _consec_decrypt_fail >= _decrypt_threshold()
        if hit:
            _consec_decrypt_fail = 0
    if not ok and hit:
        send_alert(
            WARNING,
            "Recurring audit decrypt errors",
            f"{_decrypt_threshold()}+ consecutive decrypt failures — possible key "
            "mismatch or corruption.",
        )


# --------------------------------------------------------------------------- #
#  T3 — volume anomaly                                                        #
# --------------------------------------------------------------------------- #
def _usage_hours() -> tuple[int, int]:
    raw = os.getenv("AUDIT_USAGE_HOURS", "8-20")
    try:
        a, b = raw.split("-")
        return int(a), int(b)
    except ValueError:
        return 8, 20


def evaluate_volume(last_hour: int, mean_hourly: float, hour_utc: int) -> dict | None:
    """Pure threshold logic. Returns an alert dict or None.

    - 0 entries in the last hour DURING usage hours (and there is a baseline) ->
      possible outage.
    - last hour > 10x the 24h mean (with a real baseline) -> spike.
    """
    lo, hi = _usage_hours()
    in_hours = lo <= hour_utc < hi
    if in_hours and last_hour == 0 and mean_hourly >= 1.0:
        return {
            "level": WARNING,
            "title": "Audit volume anomaly — silence",
            "details": f"0 audit entries in the last hour (usage hours, "
            f"baseline ~{mean_hourly:.1f}/h). Possible outage.",
        }
    if mean_hourly >= 1.0 and last_hour > 10 * mean_hourly:
        return {
            "level": WARNING,
            "title": "Audit volume anomaly — spike",
            "details": f"{last_hour} entries in the last hour vs "
            f"~{mean_hourly:.1f}/h mean (>10x).",
        }
    return None


def reset() -> None:
    """Clear alert state (tests)."""
    global _consec_decrypt_fail
    with _lock:
        _last_sent.clear()
        _consec_decrypt_fail = 0
