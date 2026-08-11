"""Finance tracker router — mounted at /api/finance. All routes private (Authelia at proxy)."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, UploadFile
from pydantic import BaseModel

from finance import FinanceDB, detect_and_parse, label_transaction, plaid_client

router = APIRouter(prefix="/api/finance", tags=["finance"])

_db = FinanceDB(Path(os.environ.get("FINANCE_DB_PATH", "./finance.db")))


# ------------------------------------------------------------------
# Periods
# ------------------------------------------------------------------

class PeriodCreateRequest(BaseModel):
    opened_at: str       # ISO8601 date string — the cutoff; transactions before this are ignored
    balance_start: float | None = None
    notes: str | None = None


@router.get("/periods")
def list_periods():
    return {"periods": _db.list_periods()}


@router.get("/periods/active")
def get_active_period():
    period = _db.get_active_period()
    if period is None:
        raise HTTPException(404, "No active period — create one first")
    return period


@router.post("/periods", status_code=201)
def create_period(req: PeriodCreateRequest):
    period = _db.create_period(req.opened_at, req.balance_start, req.notes)
    # Assign any already-imported transactions that fall within this period
    _db.assign_period(period["id"], req.opened_at)
    return period


@router.get("/periods/{period_id}/summary")
def period_summary(period_id: str):
    period = _db.get_period(period_id)
    if period is None:
        raise HTTPException(404, "Period not found")
    summary = _db.get_period_summary(period_id)
    return {"period": period, **summary}


@router.post("/periods/{period_id}/lock")
def lock_period(period_id: str):
    period = _db.get_period(period_id)
    if period is None:
        raise HTTPException(404, "Period not found")
    if period["locked_at"] is not None:
        raise HTTPException(400, "Period is already locked")
    needs_review = _db.get_period_summary(period_id)["needs_review"]
    if needs_review > 0:
        raise HTTPException(
            400,
            f"{needs_review} transaction(s) still need review — resolve them before locking",
        )
    return _db.lock_period(period_id)


# ------------------------------------------------------------------
# Import
# ------------------------------------------------------------------

@router.post("/import")
async def import_csv(file: UploadFile):
    content = await file.read()
    try:
        csv_text = content.decode("utf-8-sig")  # strip BOM if present
    except UnicodeDecodeError:
        csv_text = content.decode("latin-1")

    try:
        source_id, rows = detect_and_parse(csv_text)
    except ValueError as e:
        raise HTTPException(400, str(e))

    active_period = _db.get_active_period()
    cutoff = active_period["opened_at"][:10] if active_period else None

    new_count = dupe_count = skipped_count = 0
    for row in rows:
        # Skip transactions before the active period cutoff
        if cutoff and row["date"] < cutoff:
            skipped_count += 1
            continue
        row["reimbursable"] = label_transaction(row["description"], row.get("category"), row["amount"])
        if active_period:
            row["period_id"] = active_period["id"]
        inserted = _db.upsert_transaction(row)
        if inserted:
            new_count += 1
        else:
            dupe_count += 1

    log = _db.log_import(source_id, file.filename, len(rows), new_count, dupe_count)
    return {
        "source": source_id,
        "total_in_file": len(rows),
        "new": new_count,
        "duplicates": dupe_count,
        "skipped_before_cutoff": skipped_count,
        "log": log,
    }


@router.get("/import/log")
def import_log(limit: Annotated[int, Query(ge=1, le=200)] = 50):
    return {"log": _db.list_import_log(limit)}


# ------------------------------------------------------------------
# Transactions
# ------------------------------------------------------------------

@router.get("/transactions")
def list_transactions(
    period_id: str | None = None,
    source: str | None = None,
    reimbursable: int | None = None,
    q: str | None = None,
    limit: Annotated[int, Query(ge=1, le=1000)] = 500,
    offset: int = 0,
):
    rows = _db.list_transactions(period_id=period_id, source=source,
                                 reimbursable=reimbursable, q=q,
                                 limit=limit, offset=offset)
    return {"transactions": rows, "count": len(rows)}


class TxPatchRequest(BaseModel):
    reimbursable: int  # 0=no, 1=yes, 2=needs_review


@router.patch("/transactions/{tx_id}")
def patch_transaction(tx_id: str, req: TxPatchRequest):
    if req.reimbursable not in (0, 1, 2):
        raise HTTPException(400, "reimbursable must be 0, 1, or 2")
    row = _db.update_transaction(tx_id, req.reimbursable)
    if row is None:
        raise HTTPException(404, "Transaction not found")
    return row


class BulkLabelItem(BaseModel):
    id: str
    reimbursable: int


class BulkLabelRequest(BaseModel):
    updates: list[BulkLabelItem]


@router.post("/transactions/bulk-label")
def bulk_label(req: BulkLabelRequest):
    updates = [u.model_dump() for u in req.updates]
    count = _db.bulk_update_transactions(updates)
    return {"updated": count}


# ------------------------------------------------------------------
# Plaid
# ------------------------------------------------------------------


@router.post("/plaid/link-token")
def plaid_link_token():
    try:
        token = plaid_client.create_link_token()
    except Exception as e:
        raise HTTPException(500, f"Plaid error: {e}")
    return {"link_token": token}


class PlaidExchangeRequest(BaseModel):
    public_token: str
    institution_id: str
    institution_name: str


@router.post("/plaid/exchange", status_code=201)
def plaid_exchange(req: PlaidExchangeRequest):
    try:
        result = plaid_client.exchange_public_token(req.public_token)
    except Exception as e:
        raise HTTPException(500, f"Plaid error: {e}")
    source_id = plaid_client.institution_to_source(req.institution_name)
    item = _db.upsert_plaid_item(
        item_id=result["item_id"],
        access_token=result["access_token"],
        institution_id=req.institution_id,
        institution_name=req.institution_name,
        source_id=source_id,
    )
    return {k: v for k, v in item.items() if k != "access_token"}


@router.post("/plaid/sync")
def plaid_sync(item_id: str | None = None):
    items = [_db.get_plaid_item(item_id)] if item_id else _db.list_plaid_items()
    if not items or items[0] is None:
        raise HTTPException(404, "Item not found")

    active_period = _db.get_active_period()
    results = []

    for item in items:
        try:
            data = plaid_client.sync_transactions(item["access_token"], item.get("cursor"))
        except Exception as e:
            results.append({"item_id": item["item_id"], "error": str(e)})
            continue

        new_count = dupe_count = removed_count = 0
        for tx in data["added"]:
            row = plaid_client.plaid_tx_to_row(tx, item["source_id"])
            row["reimbursable"] = label_transaction(row["description"], row.get("category"), row["amount"])
            if active_period and row["date"] >= active_period["opened_at"][:10]:
                row["period_id"] = active_period["id"]
            if _db.upsert_transaction(row):
                new_count += 1
            else:
                dupe_count += 1

        for tx_id in data["removed_ids"]:
            if _db.delete_transaction(tx_id):
                removed_count += 1

        _db.update_plaid_cursor(item["item_id"], data["next_cursor"])
        _db.log_import(item["source_id"], "plaid-sync", new_count + dupe_count, new_count, dupe_count)
        results.append({
            "item_id": item["item_id"],
            "institution_name": item["institution_name"],
            "new": new_count,
            "duplicates": dupe_count,
            "removed": removed_count,
        })

    return {"synced": results}


@router.get("/plaid/items")
def list_plaid_items():
    items = _db.list_plaid_items()
    return {"items": [{k: v for k, v in item.items() if k != "access_token"} for item in items]}


@router.delete("/plaid/items/{item_id}", status_code=204)
def delete_plaid_item(item_id: str):
    if not _db.delete_plaid_item(item_id):
        raise HTTPException(404, "Item not found")
