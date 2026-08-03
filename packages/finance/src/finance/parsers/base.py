"""Shared utilities for CSV parsers."""
from __future__ import annotations

import hashlib
import re
from datetime import datetime


def make_tx_id(source: str, date: str, amount: float, description: str) -> str:
    key = f"{source}|{date}|{amount:.2f}|{description.lower().strip()}"
    return hashlib.sha256(key.encode()).hexdigest()[:16]


def parse_amount(raw: str) -> float:
    """Strip currency symbols, commas, parentheses, and parse to float."""
    cleaned = re.sub(r"[,$\s]", "", raw.strip().strip('"'))
    cleaned = cleaned.replace("(", "-").replace(")", "")
    return float(cleaned)


def parse_date(raw: str, fmts: list[str]) -> str:
    """Try each format; return ISO8601 date string."""
    for fmt in fmts:
        try:
            return datetime.strptime(raw.strip(), fmt).date().isoformat()
        except ValueError:
            continue
    raise ValueError(f"Cannot parse date: {raw!r}")
