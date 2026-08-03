"""Amazon Order History Report CSV parser.

Download from: https://www.amazon.com/gp/b2b/reports
Expected columns include: Order Date, Order ID, Title, Category, Item Total, ...
Amount is already positive (what you paid) — matches our expense convention.
"""
from __future__ import annotations

import csv
import io

from finance.parsers.base import make_tx_id, parse_amount, parse_date

_DATE_FMTS = ["%m/%d/%Y", "%Y-%m-%d"]


def parse(csv_text: str) -> list[dict]:
    reader = csv.DictReader(io.StringIO(csv_text))
    results = []
    seen_order_ids: set[str] = set()

    for row in reader:
        try:
            order_id = (row.get("Order ID") or "").strip()
            status = (row.get("Order Status") or "").strip().lower()
            if status in ("cancelled", "canceled"):
                continue

            date_raw = (row.get("Order Date") or "").strip()
            if not date_raw:
                continue
            date = parse_date(date_raw, _DATE_FMTS)

            title    = (row.get("Title") or "").strip()
            category = (row.get("Category") or "").strip() or None

            # Use Item Total if available, fall back to Purchase Price Per Unit * Quantity
            total_raw = (row.get("Item Total") or "").strip()
            if total_raw:
                amount = parse_amount(total_raw)
            else:
                price = parse_amount(row.get("Purchase Price Per Unit", "0"))
                qty   = float(row.get("Quantity", "1") or "1")
                amount = price * qty

            if amount == 0:
                continue

            description = f"Amazon: {title[:80]}" if title else f"Amazon order {order_id}"
            # Amazon rows can repeat for multi-item orders — use order_id+title as dedup key
            dedup_key = f"{order_id}|{title}"
            if dedup_key in seen_order_ids:
                continue
            seen_order_ids.add(dedup_key)

            results.append({
                "source": "amazon",
                "date": date,
                "description": description,
                "amount": round(amount, 2),
                "category": category,
                "raw": dict(row),
                "id": make_tx_id("amazon", date, amount, description),
            })
        except (KeyError, ValueError):
            continue
    return results
