"""Capital One transaction CSV parser.

Expected columns: Transaction Date, Posted Date, Card No., Description, Category, Debit, Credit
Debit = money you spent (positive number).
Credit = payment or refund (positive number, but money coming in).
We normalise to: positive = expense.
"""
from __future__ import annotations

import csv
import io

from finance.parsers.base import make_tx_id, parse_amount, parse_date

_DATE_FMTS = ["%Y-%m-%d", "%m/%d/%Y"]


def parse(csv_text: str) -> list[dict]:
    reader = csv.DictReader(io.StringIO(csv_text))
    results = []
    for row in reader:
        try:
            date = parse_date(row.get("Transaction Date", row.get("Posted Date", "")), _DATE_FMTS)
            description = (row.get("Description") or "").strip()
            if not description:
                continue

            debit_raw  = (row.get("Debit")  or "").strip()
            credit_raw = (row.get("Credit") or "").strip()

            if debit_raw:
                amount = parse_amount(debit_raw)   # positive = expense
            elif credit_raw:
                amount = -parse_amount(credit_raw) # negative = refund/payment
            else:
                continue

            category = (row.get("Category") or "").strip() or None
            results.append({
                "source": "capital_one",
                "date": date,
                "description": description,
                "amount": round(amount, 2),
                "category": category,
                "raw": dict(row),
                "id": make_tx_id("capital_one", date, amount, description),
            })
        except (KeyError, ValueError):
            continue
    return results
