"""SQLite persistence for the finance tracker."""
from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class FinanceDB:
    def __init__(self, path: str | Path):
        self._conn = sqlite3.connect(str(path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._init_schema()

    def _init_schema(self) -> None:
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS budget_periods (
                id                  TEXT PRIMARY KEY,
                opened_at           TEXT NOT NULL,
                locked_at           TEXT,
                balance_start       REAL,
                reimbursement_total REAL,
                notes               TEXT
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id                    TEXT PRIMARY KEY,
                period_id             TEXT REFERENCES budget_periods(id),
                source                TEXT NOT NULL,
                date                  TEXT NOT NULL,
                description           TEXT NOT NULL,
                amount                REAL NOT NULL,
                category              TEXT,
                reimbursable          INTEGER NOT NULL DEFAULT 2,
                reimbursable_reviewed INTEGER NOT NULL DEFAULT 0,
                raw_data              TEXT,
                imported_at           TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS import_log (
                id          TEXT PRIMARY KEY,
                source      TEXT NOT NULL,
                filename    TEXT,
                imported_at TEXT NOT NULL,
                row_count   INTEGER,
                new_count   INTEGER,
                dupe_count  INTEGER
            );

            CREATE TABLE IF NOT EXISTS plaid_items (
                item_id          TEXT PRIMARY KEY,
                access_token     TEXT NOT NULL,
                institution_id   TEXT NOT NULL,
                institution_name TEXT NOT NULL,
                source_id        TEXT NOT NULL,
                cursor           TEXT,
                linked_at        TEXT NOT NULL,
                last_synced_at   TEXT
            );
        """)
        self._conn.commit()

    # ------------------------------------------------------------------
    # Periods
    # ------------------------------------------------------------------

    def create_period(self, opened_at: str, balance_start: float | None = None, notes: str | None = None) -> dict:
        period_id = str(uuid.uuid4())
        self._conn.execute(
            "INSERT INTO budget_periods (id, opened_at, balance_start, notes) VALUES (?,?,?,?)",
            (period_id, opened_at, balance_start, notes),
        )
        self._conn.commit()
        return self.get_period(period_id)

    def get_period(self, period_id: str) -> dict | None:
        row = self._conn.execute(
            "SELECT * FROM budget_periods WHERE id=?", (period_id,)
        ).fetchone()
        return dict(row) if row else None

    def list_periods(self) -> list[dict]:
        rows = self._conn.execute(
            "SELECT * FROM budget_periods ORDER BY opened_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]

    def get_active_period(self) -> dict | None:
        row = self._conn.execute(
            "SELECT * FROM budget_periods WHERE locked_at IS NULL ORDER BY opened_at DESC LIMIT 1"
        ).fetchone()
        return dict(row) if row else None

    def lock_period(self, period_id: str) -> dict | None:
        total = self._conn.execute(
            "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE period_id=? AND reimbursable=1 AND amount > 0",
            (period_id,),
        ).fetchone()[0]
        self._conn.execute(
            "UPDATE budget_periods SET locked_at=?, reimbursement_total=? WHERE id=?",
            (_now(), round(total, 2), period_id),
        )
        self._conn.commit()
        return self.get_period(period_id)

    # ------------------------------------------------------------------
    # Transactions
    # ------------------------------------------------------------------

    def upsert_transaction(self, tx: dict[str, Any]) -> bool:
        """Returns True if inserted (new), False if already existed (dupe)."""
        existing = self._conn.execute(
            "SELECT id FROM transactions WHERE id=?", (tx["id"],)
        ).fetchone()
        if existing:
            return False
        self._conn.execute(
            """INSERT INTO transactions
               (id, period_id, source, date, description, amount, category,
                reimbursable, reimbursable_reviewed, raw_data, imported_at)
               VALUES (?,?,?,?,?,?,?,?,0,?,?)""",
            (
                tx["id"],
                tx.get("period_id"),
                tx["source"],
                tx["date"],
                tx["description"],
                tx["amount"],
                tx.get("category"),
                tx.get("reimbursable", 2),
                json.dumps(tx.get("raw", {})),
                _now(),
            ),
        )
        self._conn.commit()
        return True

    def list_transactions(
        self,
        period_id: str | None = None,
        source: str | None = None,
        reimbursable: int | None = None,
        q: str | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> list[dict]:
        clause = "WHERE 1=1"
        params: list[Any] = []
        if period_id is not None:
            clause += " AND period_id=?"
            params.append(period_id)
        if source is not None:
            clause += " AND source=?"
            params.append(source)
        if reimbursable is not None:
            clause += " AND reimbursable=?"
            params.append(reimbursable)
        if q:
            clause += " AND description LIKE ?"
            params.append(f"%{q}%")
        rows = self._conn.execute(
            f"SELECT * FROM transactions {clause} ORDER BY date DESC, imported_at DESC LIMIT ? OFFSET ?",
            params + [limit, offset],
        ).fetchall()
        return [dict(r) for r in rows]

    def update_transaction(self, tx_id: str, reimbursable: int) -> dict | None:
        self._conn.execute(
            "UPDATE transactions SET reimbursable=?, reimbursable_reviewed=1 WHERE id=?",
            (reimbursable, tx_id),
        )
        self._conn.commit()
        row = self._conn.execute("SELECT * FROM transactions WHERE id=?", (tx_id,)).fetchone()
        return dict(row) if row else None

    def bulk_update_transactions(self, updates: list[dict[str, Any]]) -> int:
        count = 0
        for u in updates:
            self._conn.execute(
                "UPDATE transactions SET reimbursable=?, reimbursable_reviewed=1 WHERE id=?",
                (u["reimbursable"], u["id"]),
            )
            count += 1
        self._conn.commit()
        return count

    def assign_period(self, period_id: str, opened_at: str) -> int:
        """Assign transactions dated >= opened_at and not yet in a period to this period."""
        cur = self._conn.execute(
            "UPDATE transactions SET period_id=? WHERE period_id IS NULL AND date >= ?",
            (period_id, opened_at[:10]),
        )
        self._conn.commit()
        return cur.rowcount

    def get_period_summary(self, period_id: str) -> dict:
        rows = self._conn.execute(
            """SELECT source,
                      COUNT(*) as total,
                      SUM(CASE WHEN reimbursable=1 AND amount > 0 THEN amount ELSE 0 END) as reimbursable_total,
                      SUM(CASE WHEN reimbursable=2 THEN 1 ELSE 0 END) as needs_review
               FROM transactions WHERE period_id=?
               GROUP BY source""",
            (period_id,),
        ).fetchall()
        by_source = [dict(r) for r in rows]
        totals = self._conn.execute(
            """SELECT COUNT(*) as total,
                      SUM(CASE WHEN reimbursable=1 AND amount > 0 THEN amount ELSE 0 END) as reimbursable_total,
                      SUM(CASE WHEN reimbursable=2 THEN 1 ELSE 0 END) as needs_review
               FROM transactions WHERE period_id=?""",
            (period_id,),
        ).fetchone()
        return {
            "by_source": by_source,
            "total": totals["total"],
            "reimbursable_total": round(totals["reimbursable_total"] or 0, 2),
            "needs_review": totals["needs_review"],
        }

    # ------------------------------------------------------------------
    # Import log
    # ------------------------------------------------------------------

    def log_import(self, source: str, filename: str | None, row_count: int, new_count: int, dupe_count: int) -> dict:
        log_id = str(uuid.uuid4())
        now = _now()
        self._conn.execute(
            "INSERT INTO import_log (id, source, filename, imported_at, row_count, new_count, dupe_count) VALUES (?,?,?,?,?,?,?)",
            (log_id, source, filename, now, row_count, new_count, dupe_count),
        )
        self._conn.commit()
        return {"id": log_id, "source": source, "filename": filename, "imported_at": now,
                "row_count": row_count, "new_count": new_count, "dupe_count": dupe_count}

    def list_import_log(self, limit: int = 50) -> list[dict]:
        rows = self._conn.execute(
            "SELECT * FROM import_log ORDER BY imported_at DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in rows]

    # ------------------------------------------------------------------
    # Plaid items
    # ------------------------------------------------------------------

    def upsert_plaid_item(
        self,
        item_id: str,
        access_token: str,
        institution_id: str,
        institution_name: str,
        source_id: str,
    ) -> dict:
        now = _now()
        self._conn.execute(
            """INSERT INTO plaid_items (item_id, access_token, institution_id, institution_name, source_id, linked_at)
               VALUES (?,?,?,?,?,?)
               ON CONFLICT(item_id) DO UPDATE SET
                   access_token=excluded.access_token,
                   institution_name=excluded.institution_name,
                   source_id=excluded.source_id""",
            (item_id, access_token, institution_id, institution_name, source_id, now),
        )
        self._conn.commit()
        return self.get_plaid_item(item_id)

    def get_plaid_item(self, item_id: str) -> dict | None:
        row = self._conn.execute("SELECT * FROM plaid_items WHERE item_id=?", (item_id,)).fetchone()
        return dict(row) if row else None

    def list_plaid_items(self) -> list[dict]:
        rows = self._conn.execute("SELECT * FROM plaid_items ORDER BY linked_at DESC").fetchall()
        return [dict(r) for r in rows]

    def delete_plaid_item(self, item_id: str) -> bool:
        cur = self._conn.execute("DELETE FROM plaid_items WHERE item_id=?", (item_id,))
        self._conn.commit()
        return cur.rowcount > 0

    def update_plaid_cursor(self, item_id: str, cursor: str) -> None:
        self._conn.execute(
            "UPDATE plaid_items SET cursor=?, last_synced_at=? WHERE item_id=?",
            (cursor, _now(), item_id),
        )
        self._conn.commit()

    def delete_transaction(self, tx_id: str) -> bool:
        cur = self._conn.execute("DELETE FROM transactions WHERE id=?", (tx_id,))
        self._conn.commit()
        return cur.rowcount > 0
