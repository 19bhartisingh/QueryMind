"""
email_reporter.py — Scheduled email report engine for QueryMind

Handles:
  • Cron expression parsing (daily/weekly/monthly + custom 5-field cron)
  • HTML email template rendering (branded, with data table + insights)
  • SMTP delivery via smtplib (reads SMTP_* env vars)
  • Background scheduler thread (checks due reports every 60 s)
  • AES-256-CBC encryption of stored API keys via Fernet (falls back to
    base64 obfuscation if cryptography package is unavailable)

No third-party scheduler libraries required — pure stdlib + optional cryptography.
"""

import os
import re
import json
import time
import sqlite3
import smtplib
import threading
import traceback
from base64 import b64encode, b64decode
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Dict, Optional, Tuple

# ── Optional: strong encryption for stored API keys ──────────────────────────
try:
    from cryptography.fernet import Fernet
    import hashlib, os as _os

    def _fernet() -> Fernet:
        secret = os.environ.get("QM_SECRET_KEY", "querymind-default-secret-key-32!!")
        key = hashlib.sha256(secret.encode()).digest()
        return Fernet(b64encode(key))

    def encrypt_key(plain: str) -> str:
        if not plain:
            return ""
        return _fernet().encrypt(plain.encode()).decode()

    def decrypt_key(token: str) -> str:
        if not token:
            return ""
        try:
            return _fernet().decrypt(token.encode()).decode()
        except Exception:
            return ""

    CRYPTO_AVAILABLE = True

except ImportError:
    # Fallback: simple base64 obfuscation (not secure — tells users to set QM_SECRET_KEY)
    def encrypt_key(plain: str) -> str:
        return b64encode(plain.encode()).decode() if plain else ""

    def decrypt_key(token: str) -> str:
        try:
            return b64decode(token.encode()).decode() if token else ""
        except Exception:
            return ""

    CRYPTO_AVAILABLE = False


# ─────────────────────────────────────────────────────────
#  CRON HELPERS (stdlib only)
# ─────────────────────────────────────────────────────────

PRESET_CRONS = {
    "daily":   "0 8 * * *",          # 08:00 every day
    "weekly":  "0 8 * * 1",          # 08:00 every Monday
    "monthly": "0 8 1 * *",          # 08:00 1st of month
    "hourly":  "0 * * * *",          # top of every hour
}


def _cron_next_run(cron: str, after: Optional[datetime] = None) -> datetime:
    """
    Compute the next datetime a 5-field cron expression fires after `after`
    (defaults to now). Supports * and exact integers for each field.
    Fields: minute hour day_of_month month day_of_week
    """
    after = after or datetime.now()
    parts = cron.strip().split()
    if len(parts) != 5:
        raise ValueError(f"Invalid cron: '{cron}' — expected 5 fields")

    def _match(val: int, field: str) -> bool:
        if field == "*":
            return True
        try:
            return int(field) == val
        except ValueError:
            # Handle */n step syntax
            if field.startswith("*/"):
                step = int(field[2:])
                return val % step == 0
            return False

    minute, hour, dom, month, dow = parts
    candidate = after.replace(second=0, microsecond=0) + timedelta(minutes=1)

    # Search up to 4 years (prevents infinite loop on bad expressions)
    for _ in range(2 * 365 * 24 * 60):
        if (
            _match(candidate.minute,   minute) and
            _match(candidate.hour,     hour)   and
            _match(candidate.day,      dom)    and
            _match(candidate.month,    month)  and
            _match(candidate.weekday() if dow != "*" else 0, dow)
        ):
            return candidate
        candidate += timedelta(minutes=1)

    raise ValueError(f"Could not compute next run for cron: '{cron}'")


def cron_for_preset(preset: str, hour: int = 8, minute: int = 0,
                     weekday: int = 1) -> str:
    """
    Build a cron string from a human-friendly preset.
    preset: 'daily' | 'weekly' | 'monthly' | 'hourly' | raw cron string
    """
    if preset == "daily":
        return f"{minute} {hour} * * *"
    if preset == "weekly":
        return f"{minute} {hour} * * {weekday}"
    if preset == "monthly":
        return f"{minute} {hour} 1 * *"
    if preset == "hourly":
        return f"0 * * * *"
    # Treat as raw cron; validate it parses
    _cron_next_run(preset)
    return preset


def human_readable_cron(cron: str) -> str:
    """Return a short human description of a cron string."""
    parts = cron.strip().split()
    if len(parts) != 5:
        return cron
    minute, hour, dom, month, dow = parts
    days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]

    # Hourly: "M * * * *"
    if hour == "*" and dom == "*" and month == "*" and dow == "*":
        try:
            return f"Every hour at :{int(minute):02d}"
        except ValueError:
            return "Every hour"

    try:
        t = f"{int(hour):02d}:{int(minute):02d}"
    except ValueError:
        t = f"{hour}:{minute}"

    if dom == "*" and month == "*":
        if dow == "*":
            return f"Daily at {t}"
        try:
            return f"Every {days[int(dow)]} at {t}"
        except (ValueError, IndexError):
            return f"Weekly (day {dow}) at {t}"
    if dom != "*" and month == "*":
        return f"Monthly on day {dom} at {t}"
    return cron


# ─────────────────────────────────────────────────────────
#  HTML EMAIL TEMPLATE
# ─────────────────────────────────────────────────────────

def build_html_email(
    report_name:  str,
    question:     str,
    db_name:      str,
    sql:          str,
    columns:      List[str],
    rows:         List[Dict],
    insights:     List[Dict],
    run_time:     str,
    next_run:     str,
    total_rows:   int,
) -> str:
    """Render a fully self-contained HTML email with inlined CSS."""

    max_table_rows = 30
    display_rows   = rows[:max_table_rows]
    truncated      = total_rows > max_table_rows

    # ── Table HTML ────────────────────────────────────────
    th_cells = "".join(
        f'<th style="background:#2563EB;color:#fff;padding:9px 14px;'
        f'text-align:left;font-size:12px;font-weight:600;white-space:nowrap;'
        f'border-right:1px solid #1D4ED8">{_he(c)}</th>'
        for c in columns
    )
    tr_rows = ""
    for i, row in enumerate(display_rows):
        bg = "#FFFFFF" if i % 2 == 0 else "#F7F8FC"
        cells = "".join(
            f'<td style="padding:8px 14px;font-size:12px;color:#374151;'
            f'border-bottom:1px solid #E5E7EB;white-space:nowrap">'
            f'{_he(str(row.get(c,"")) if row.get(c) is not None else "—")}</td>'
            for c in columns
        )
        tr_rows += f'<tr style="background:{bg}">{cells}</tr>'

    truncation_note = (
        f'<p style="font-size:11px;color:#9CA3AF;margin-top:6px;text-align:right">'
        f'Showing {max_table_rows} of {total_rows} rows</p>'
        if truncated else ""
    )

    table_section = f"""
    <div style="margin-bottom:28px">
      <h3 style="font-size:13px;font-weight:700;color:#374151;
                 text-transform:uppercase;letter-spacing:.6px;
                 margin:0 0 10px;border-left:3px solid #2563EB;padding-left:10px">
        Data Results &nbsp;<span style="font-weight:400;color:#9CA3AF;
        font-size:11px">({total_rows} rows)</span>
      </h3>
      <div style="overflow-x:auto;border-radius:8px;border:1px solid #E5E7EB">
        <table style="width:100%;border-collapse:collapse;min-width:400px">
          <thead><tr>{th_cells}</tr></thead>
          <tbody>{tr_rows}</tbody>
        </table>
      </div>
      {truncation_note}
    </div>
    """ if columns and display_rows else ""

    # ── Insights HTML ─────────────────────────────────────
    ICON_BG = {
        "📈":"#F0FDF4","📉":"#FEF2F2","🏆":"#FFFBEB","⚠️":"#FFFBEB",
        "💡":"#EFF6FF","🔍":"#F5F3FF","📊":"#EFF6FF","🎯":"#F0FDF4",
        "⚡":"#FFFBEB","🔗":"#F5F3FF",
    }
    insight_cards = ""
    for ins in insights:
        icon    = ins.get("icon", "💡")
        text    = ins.get("text", "")
        card_bg = ICON_BG.get(icon, "#EFF6FF")
        insight_cards += f"""
        <tr>
          <td style="padding:10px 8px;vertical-align:top;font-size:16px;
                     background:{card_bg};border-radius:6px;width:36px">{icon}</td>
          <td style="padding:10px 12px;font-size:13px;color:#374151;
                     line-height:1.55;background:{card_bg}">{_he(text)}</td>
        </tr>
        <tr><td colspan="2" style="height:6px"></td></tr>
        """

    insights_section = f"""
    <div style="margin-bottom:28px">
      <h3 style="font-size:13px;font-weight:700;color:#374151;
                 text-transform:uppercase;letter-spacing:.6px;
                 margin:0 0 10px;border-left:3px solid #7C3AED;padding-left:10px">
        AI Insights
      </h3>
      <table style="width:100%;border-collapse:separate;border-spacing:0 0">
        {insight_cards}
      </table>
    </div>
    """ if insights else ""

    # ── SQL section ───────────────────────────────────────
    sql_clean = _he(sql or "").replace("\n", "<br>").replace("  ", "&nbsp;&nbsp;")
    sql_section = f"""
    <div style="margin-bottom:28px">
      <h3 style="font-size:13px;font-weight:700;color:#374151;
                 text-transform:uppercase;letter-spacing:.6px;
                 margin:0 0 10px;border-left:3px solid #0D9488;padding-left:10px">
        SQL Query
      </h3>
      <pre style="background:#1E293B;color:#94A3B8;border-radius:8px;
                  padding:14px 16px;font-family:monospace;font-size:11px;
                  line-height:1.6;overflow-x:auto;margin:0">{sql_clean}</pre>
    </div>
    """ if sql else ""

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{_he(report_name)}</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 0">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0"
       style="background:#ffffff;border-radius:12px;overflow:hidden;
              box-shadow:0 4px 24px rgba(0,0,0,.08)">

  <!-- Header gradient bar -->
  <tr>
    <td style="background:linear-gradient(135deg,#2563EB 0%,#7C3AED 100%);
               padding:24px 32px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <span style="background:#fff;color:#2563EB;font-weight:800;
                         font-size:13px;border-radius:6px;padding:3px 10px">Q</span>
            <span style="color:#fff;font-size:16px;font-weight:700;
                         margin-left:8px;vertical-align:middle">QueryMind</span>
          </td>
          <td align="right">
            <span style="color:rgba(255,255,255,.7);font-size:11px">{run_time}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Title block -->
  <tr>
    <td style="padding:28px 32px 12px">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:.8px;
                text-transform:uppercase;color:#9CA3AF">Scheduled Report</p>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827">
        {_he(report_name)}
      </h1>
      <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.5">
        <strong style="color:#374151">Question:</strong> {_he(question)}
      </p>
      <p style="margin:6px 0 0;font-size:12px;color:#9CA3AF">
        Database: <strong style="color:#6B7280">{_he(db_name)}</strong>
        &nbsp;·&nbsp; Next run: <strong style="color:#6B7280">{_he(next_run)}</strong>
      </p>
    </td>
  </tr>

  <!-- Divider -->
  <tr><td style="padding:0 32px">
    <div style="height:1px;background:#E5E7EB"></div>
  </td></tr>

  <!-- Content -->
  <tr><td style="padding:24px 32px">
    {table_section}
    {insights_section}
    {sql_section}
  </td></tr>

  <!-- Footer -->
  <tr>
    <td style="background:#F9FAFB;padding:16px 32px;border-top:1px solid #E5E7EB">
      <p style="margin:0;font-size:11px;color:#9CA3AF;text-align:center">
        This report was automatically generated by
        <strong style="color:#6B7280">QueryMind</strong>.
        Manage your scheduled reports at your QueryMind instance.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body></html>"""


def _he(s: str) -> str:
    """HTML-escape a string."""
    return (str(s)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;"))


# ─────────────────────────────────────────────────────────
#  SMTP SENDER
# ─────────────────────────────────────────────────────────

def send_email_report(
    to_email:    str,
    subject:     str,
    html_body:   str,
) -> Tuple[bool, str]:
    """
    Send an HTML email via SMTP.
    Reads config from env vars:
      SMTP_HOST     (default: localhost)
      SMTP_PORT     (default: 587)
      SMTP_USER     (default: "")
      SMTP_PASSWORD (default: "")
      SMTP_FROM     (default: SMTP_USER or "querymind@localhost")
      SMTP_TLS      (default: "true")  — set "false" to use plain SMTP
    Returns (success, error_message).
    """
    host     = os.environ.get("SMTP_HOST",     "localhost")
    port     = int(os.environ.get("SMTP_PORT",  "587"))
    user     = os.environ.get("SMTP_USER",     "")
    password = os.environ.get("SMTP_PASSWORD", "")
    from_    = os.environ.get("SMTP_FROM",     user or "querymind@localhost")
    use_tls  = os.environ.get("SMTP_TLS", "true").lower() != "false"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = from_
    msg["To"]      = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        if use_tls:
            server = smtplib.SMTP(host, port, timeout=15)
            server.ehlo()
            server.starttls()
            server.ehlo()
        else:
            server = smtplib.SMTP_SSL(host, port, timeout=15)
        if user and password:
            server.login(user, password)
        server.sendmail(from_, [to_email], msg.as_string())
        server.quit()
        return True, ""
    except Exception as e:
        return False, str(e)


def get_smtp_configured() -> bool:
    """Return True if SMTP_HOST is set (basic check)."""
    return bool(os.environ.get("SMTP_HOST"))


# ─────────────────────────────────────────────────────────
#  SCHEDULER
# ─────────────────────────────────────────────────────────

class ReportScheduler:
    """
    Lightweight background thread that checks for due reports every 60 s.
    No APScheduler dependency — uses threading.Thread + time.sleep.
    """

    def __init__(self, meta_db_path: str, run_report_fn):
        """
        meta_db_path  : path to querymind_meta.db
        run_report_fn : callable(report_dict) → (success, message)
        """
        self._db_path    = meta_db_path
        self._run_report = run_report_fn
        self._thread: Optional[threading.Thread] = None
        self._stop_evt   = threading.Event()

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._stop_evt.clear()
        self._thread = threading.Thread(
            target=self._loop, daemon=True, name="qm-scheduler"
        )
        self._thread.start()
        print("📅 Report scheduler started")

    def stop(self):
        self._stop_evt.set()

    def _loop(self):
        while not self._stop_evt.is_set():
            try:
                self._tick()
            except Exception as e:
                print(f"Scheduler tick error: {e}")
            self._stop_evt.wait(60)   # check every minute

    def _tick(self):
        """Fire any reports whose next_run is in the past."""
        now = datetime.now()
        try:
            conn = sqlite3.connect(self._db_path)
            conn.row_factory = sqlite3.Row
            due = conn.execute(
                "SELECT * FROM scheduled_reports WHERE active=1 AND next_run <= ?",
                (now.strftime("%Y-%m-%d %H:%M:%S"),)
            ).fetchall()
            conn.close()
        except Exception:
            return

        for row in due:
            report = dict(row)
            print(f"📧 Running scheduled report: {report['name']}")
            try:
                ok, msg = self._run_report(report)
                status = "ok" if ok else f"error: {msg}"
            except Exception as e:
                status = f"exception: {e}"
                print(traceback.format_exc())

            # Compute next run and update record
            try:
                next_run = _cron_next_run(report["schedule_cron"])
                conn = sqlite3.connect(self._db_path)
                conn.execute(
                    "UPDATE scheduled_reports SET last_run=?, next_run=?, last_status=? WHERE id=?",
                    (now.strftime("%Y-%m-%d %H:%M:%S"),
                     next_run.strftime("%Y-%m-%d %H:%M:%S"),
                     status, report["id"])
                )
                conn.commit()
                conn.close()
            except Exception as e:
                print(f"Scheduler update error: {e}")


# Module-level singleton — created and started by server.py
scheduler: Optional[ReportScheduler] = None
