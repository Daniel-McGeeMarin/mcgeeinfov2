"""US Bank transaction CSV parser.

Expected columns: Date, Transaction, Name, Memo, Amount
Amount convention: negative = debit (spending), positive = credit (income).
We normalise to: positive = expense.
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
            date = parse_date(row["Date"], _DATE_FMTS)
            raw_amount = parse_amount(row["Amount"])
            # US Bank: negative = you spent money → normalise to positive expense
            amount = -raw_amount
            description = (row.get("Name") or row.get("Memo") or "").strip()
            if not description:
                continue
            results.append({
                "source": "us_bank",
                "date": date,
                "description": description,
                "amount": round(amount, 2),
                "category": None,
                "raw": dict(row),
                "id": make_tx_id("us_bank", date, amount, description),
            })
        except (KeyError, ValueError):
            continue
    return results
