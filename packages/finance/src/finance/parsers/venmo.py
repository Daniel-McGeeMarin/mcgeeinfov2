"""Venmo statement CSV parser.

Venmo exports include several metadata rows before the actual header. The real
header contains: ID, Datetime, Type, Status, Note, From, To, Amount (total), ...

Amount (total) format: "+ $25.00" (received) or "- $25.00" (sent).
We normalise to: positive = expense (you sent money).
"""
from __future__ import annotations

import csv
import io
import re

from finance.parsers.base import make_tx_id, parse_date

_DATE_FMTS = ["%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%m/%d/%Y %H:%M:%S", "%Y-%m-%d"]
_AMOUNT_RE = re.compile(r"([+-])\s*\$?([\d,]+\.?\d*)")


def _parse_venmo_amount(raw: str) -> float | None:
    m = _AMOUNT_RE.search(raw.strip())
    if not m:
        return None
    sign, digits = m.groups()
    value = float(digits.replace(",", ""))
    return value if sign == "-" else -value  # sent = positive expense, received = negative


def _find_header_line(lines: list[str]) -> int | None:
    for i, line in enumerate(lines):
        cols = {c.strip().lower().strip('"') for c in line.split(",")}
        if "amount (total)" in cols and "from" in cols:
            return i
    return None


def parse(csv_text: str) -> list[dict]:
    lines = csv_text.splitlines()
    header_idx = _find_header_line(lines)
    if header_idx is None:
        return []

    body = "\n".join(lines[header_idx:])
    reader = csv.DictReader(io.StringIO(body))
    results = []
    for row in reader:
        try:
            status = (row.get("Status") or "").strip().lower()
            if status not in ("complete", "completed", ""):
                continue

            raw_date = (row.get("Datetime") or "").strip()
            if not raw_date:
                continue
            # Venmo datetimes can be "2026-07-15T14:32:00" or "2026-07-15 14:32:00"
            raw_date_clean = raw_date.replace("T", " ").split("+")[0].strip()
            date = parse_date(raw_date_clean, _DATE_FMTS)

            amount_raw = (row.get("Amount (total)") or "").strip()
            amount = _parse_venmo_amount(amount_raw)
            if amount is None:
                continue

            note = (row.get("Note") or "").strip()
            to   = (row.get("To") or "").strip()
            frm  = (row.get("From") or "").strip()
            description = note or (f"Venmo to {to}" if amount > 0 else f"Venmo from {frm}") or "Venmo"

            results.append({
                "source": "venmo",
                "date": date,
                "description": description,
                "amount": round(amount, 2),
                "category": None,
                "raw": dict(row),
                "id": make_tx_id("venmo", date, amount, description),
            })
        except (KeyError, ValueError):
            continue
    return results
