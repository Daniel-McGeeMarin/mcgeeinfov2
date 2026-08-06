from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/survey", tags=["survey"])

_DB_PATH = Path(os.environ.get("SURVEY_DB_PATH", "./survey.db"))


def _conn() -> sqlite3.Connection:
    con = sqlite3.connect(_DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def _init_db() -> None:
    with _conn() as con:
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS responses (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at   TEXT    NOT NULL,
                full_name    TEXT,
                uses_ai      INTEGER NOT NULL,
                drift_how    TEXT,
                drift_severity TEXT,
                wants_results INTEGER,
                email        TEXT
            )
            """
        )


_init_db()


class SurveyRequest(BaseModel):
    full_name: str | None = None
    uses_ai: bool
    drift_how: list[str] | None = None
    drift_severity: str | None = None
    wants_results: bool = False
    email: str | None = None


@router.post("", status_code=201)
def submit(req: SurveyRequest):
    now = datetime.now(timezone.utc).isoformat()
    with _conn() as con:
        con.execute(
            """
            INSERT INTO responses
                (created_at, full_name, uses_ai, drift_how, drift_severity, wants_results, email)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                now,
                req.full_name or None,
                int(req.uses_ai),
                json.dumps(req.drift_how) if req.drift_how else None,
                req.drift_severity,
                int(req.wants_results),
                req.email or None,
            ),
        )
    return {"status": "ok"}


@router.get("/results")
def results():
    with _conn() as con:
        rows = con.execute(
            "SELECT * FROM responses ORDER BY created_at DESC"
        ).fetchall()

    total = len(rows)
    uses_ai = sum(1 for r in rows if r["uses_ai"])
    no_ai = total - uses_ai

    drift_counts: dict[str, int] = {}
    severity_counts: dict[str, int] = {}
    want_results = []

    for r in rows:
        if r["drift_how"]:
            for val in json.loads(r["drift_how"]):
                drift_counts[val] = drift_counts.get(val, 0) + 1
        if r["drift_severity"]:
            severity_counts[r["drift_severity"]] = severity_counts.get(r["drift_severity"], 0) + 1
        if r["wants_results"] and r["email"]:
            want_results.append({"name": r["full_name"], "email": r["email"]})

    raw = [
        {
            "id": r["id"],
            "created_at": r["created_at"],
            "full_name": r["full_name"],
            "uses_ai": bool(r["uses_ai"]),
            "drift_how": json.loads(r["drift_how"]) if r["drift_how"] else None,
            "drift_severity": r["drift_severity"],
            "wants_results": bool(r["wants_results"]),
            "email": r["email"],
        }
        for r in rows
    ]

    return {
        "total": total,
        "uses_ai": uses_ai,
        "no_ai": no_ai,
        "drift_how_counts": drift_counts,
        "severity_counts": severity_counts,
        "want_results": want_results,
        "raw": raw,
    }
