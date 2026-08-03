"""Finance tracker router — mounted at /api/finance. All routes private (Authelia at proxy)."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, UploadFile
from pydantic import BaseModel

from finance import FinanceDB, detect_and_parse, label_transaction

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
