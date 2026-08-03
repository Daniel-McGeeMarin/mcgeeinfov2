"""Discover card transaction CSV parser.

Expected columns: Trans. Date, Post Date, Description, Amount, Category
Amount convention: positive = charge (expense), negative = credit/refund.
Already normalised to our convention — positive = expense.
"""
from __future__ import annotations

import csv
import io

from finance.parsers.base import make_tx_id, parse_amount, parse_date

_DATE_FMTS = ["%m/%d/%Y", "%Y-%m-%d"]


def parse(csv_text: str) -> list[dict]:
    reader = csv.DictReader(io.StringIO(csv_text))
    results = []
    for row in reader:
        try:
            date = parse_date(row.get("Trans. Date", row.get("Transaction Date", "")), _DATE_FMTS)
            description = (row.get("Description") or "").strip()
            if not description:
                continue
            amount   = parse_amount(row["Amount"])  # positive = expense, already correct
            category = (row.get("Category") or "").strip() or None
            results.append({
                "source": "discover",
                "date": date,
                "description": description,
                "amount": round(amount, 2),
                "category": category,
                "raw": dict(row),
                "id": make_tx_id("discover", date, amount, description),
            })
        except (KeyError, ValueError):
            continue
    return results
