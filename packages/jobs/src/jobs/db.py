"""SQLite persistence layer. One row per unique job (keyed by canonical apply URL hash)."""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class DB:
    def __init__(self, path: str | Path):
        self._path = str(path)
        self._conn = sqlite3.connect(self._path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._init_schema()

    def _init_schema(self) -> None:
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS jobs (
                id                  TEXT PRIMARY KEY,
                company             TEXT,
                role                TEXT,
                location            TEXT,
                apply_url           TEXT,
                date_posted         TEXT,
                type                TEXT,
                source_ids          TEXT DEFAULT '[]',
                tags                TEXT DEFAULT '[]',
                first_seen_at       TEXT,
                last_seen_at        TEXT,
                skills              TEXT,
                experience          TEXT,
                apply_type          TEXT,
                salary_range        TEXT,
                enriched_at         TEXT,
                enrichment_status   TEXT
            );

            CREATE TABLE IF NOT EXISTS queue (
                job_id      TEXT PRIMARY KEY REFERENCES jobs(id),
                status      TEXT DEFAULT 'saved',
                priority    INTEGER DEFAULT 3,
                notes       TEXT DEFAULT '',
                added_at    TEXT,
                updated_at  TEXT
            );

            CREATE TABLE IF NOT EXISTS ingester_state (
                source_id   TEXT PRIMARY KEY,
                last_run_at TEXT
            );

            CREATE TABLE IF NOT EXISTS custom_mappers (
                source_id   TEXT PRIMARY KEY,
                config      TEXT
            );
        """)
        self._conn.commit()

    # ------------------------------------------------------------------
    # Jobs
    # ------------------------------------------------------------------

    def upsert_job(self, row: dict[str, Any]) -> None:
        """Insert or merge a job row. Never deletes; accumulates source_ids and tags."""
        now = _now()
        job_id = row["id"]
        existing = self.get_job(job_id)

        def _as_list(val: Any) -> list:
            if isinstance(val, list):
                return val
            if isinstance(val, str):
                try:
                    return json.loads(val)
                except Exception:
                    return []
            return []

        def _prefer(new_val: Any, old_val: Any) -> Any:
            return new_val if new_val else old_val

        if existing:
            merged_sources = json.dumps(sorted(set(_as_list(existing["source_ids"])) | set(_as_list(row.get("source_ids")))))
            merged_tags = json.dumps(sorted(set(_as_list(existing["tags"])) | set(_as_list(row.get("tags")))))
            self._conn.execute("""
                UPDATE jobs SET
                    company=?, role=?, location=?, apply_url=?, date_posted=?, type=?,
                    source_ids=?, tags=?, last_seen_at=?
                WHERE id=?
            """, (
                _prefer(row.get("company"),     existing["company"]),
                _prefer(row.get("role"),         existing["role"]),
                _prefer(row.get("location"),     existing["location"]),
                _prefer(row.get("apply_url"),    existing["apply_url"]),
                _prefer(row.get("date_posted"),  existing["date_posted"]),
                _prefer(row.get("type"),         existing["type"]),
                merged_sources, merged_tags, now, job_id,
            ))
        else:
            self._conn.execute("""
                INSERT INTO jobs (
                    id, company, role, location, apply_url, date_posted, type,
                    source_ids, tags, first_seen_at, last_seen_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """, (
                job_id,
                row.get("company"),
                row.get("role"),
                row.get("location"),
                row.get("apply_url"),
                row.get("date_posted"),
                row.get("type"),
                json.dumps(sorted(_as_list(row.get("source_ids")))),
                json.dumps(sorted(_as_list(row.get("tags")))),
                now, now,
            ))
        self._conn.commit()

    def get_job(self, job_id: str) -> dict | None:
        row = self._conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
        return self._deser_job(dict(row)) if row else None

    def list_jobs(
        self,
        type_filter: str | None = None,
        source_filter: str | None = None,
        tag_filter: str | None = None,
        q: str | None = None,
        limit: int = 200,
        offset: int = 0,
    ) -> list[dict]:
        clause = "WHERE 1=1"
        params: list[Any] = []
        if type_filter:
            clause += " AND type=?"
            params.append(type_filter)
        if q:
            clause += " AND (company LIKE ? OR role LIKE ? OR location LIKE ?)"
            like = f"%{q}%"
            params.extend([like, like, like])
        rows = self._conn.execute(
            f"SELECT * FROM jobs {clause} ORDER BY date_posted DESC, last_seen_at DESC LIMIT ? OFFSET ?",
            params + [limit, offset],
        ).fetchall()
        results = [self._deser_job(dict(r)) for r in rows]
        if source_filter:
            results = [r for r in results if source_filter in (r.get("source_ids") or [])]
        if tag_filter:
            results = [r for r in results if tag_filter in (r.get("tags") or [])]
        return results

    def count_jobs(self) -> int:
        return self._conn.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]

    def _deser_job(self, row: dict) -> dict:
        for field in ("source_ids", "tags", "skills"):
            if isinstance(row.get(field), str):
                try:
                    row[field] = json.loads(row[field])
                except Exception:
                    row[field] = []
            elif row.get(field) is None:
                row[field] = []
        return row

    # ------------------------------------------------------------------
    # Enrichment
    # ------------------------------------------------------------------

    def get_unenriched_jobs(self, limit: int = 50) -> list[dict]:
        rows = self._conn.execute(
            "SELECT * FROM jobs WHERE enrichment_status IS NULL AND apply_url IS NOT NULL LIMIT ?",
            (limit,),
        ).fetchall()
        return [self._deser_job(dict(r)) for r in rows]

    def update_enrichment(self, job_id: str, data: dict) -> None:
        now = _now()
        self._conn.execute("""
            UPDATE jobs SET
                skills=?, experience=?, apply_type=?, salary_range=?,
                enriched_at=?, enrichment_status=?
            WHERE id=?
        """, (
            json.dumps(data.get("skills") or []),
            data.get("experience"),
            data.get("apply_type"),
            data.get("salary_range"),
            now,
            data.get("enrichment_status", "done"),
            job_id,
        ))
        if data.get("new_tags"):
            row = self.get_job(job_id)
            if row:
                merged = set(row.get("tags") or []) | set(data["new_tags"])
                self._conn.execute(
                    "UPDATE jobs SET tags=? WHERE id=?",
                    (json.dumps(sorted(merged)), job_id),
                )
        self._conn.commit()

    # ------------------------------------------------------------------
    # Queue
    # ------------------------------------------------------------------

    def get_queue(self) -> list[dict]:
        rows = self._conn.execute("""
            SELECT q.*, j.company, j.role, j.location, j.apply_url,
                   j.date_posted, j.type, j.tags, j.source_ids
            FROM queue q JOIN jobs j ON q.job_id = j.id
            ORDER BY q.priority DESC, q.updated_at DESC
        """).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            for field in ("tags", "source_ids"):
                if isinstance(d.get(field), str):
                    try:
                        d[field] = json.loads(d[field])
                    except Exception:
                        d[field] = []
            result.append(d)
        return result

    def add_to_queue(self, job_id: str, priority: int = 3) -> None:
        now = _now()
        self._conn.execute("""
            INSERT INTO queue (job_id, status, priority, notes, added_at, updated_at)
            VALUES (?, 'saved', ?, '', ?, ?)
            ON CONFLICT(job_id) DO NOTHING
        """, (job_id, priority, now, now))
        self._conn.commit()

    def update_queue(self, job_id: str, data: dict) -> None:
        allowed = {k: v for k, v in data.items() if k in ("status", "priority", "notes")}
        if not allowed:
            return
        set_clause = ", ".join(f"{k}=?" for k in allowed)
        self._conn.execute(
            f"UPDATE queue SET {set_clause}, updated_at=? WHERE job_id=?",
            list(allowed.values()) + [_now(), job_id],
        )
        self._conn.commit()

    def remove_from_queue(self, job_id: str) -> None:
        self._conn.execute("DELETE FROM queue WHERE job_id=?", (job_id,))
        self._conn.commit()

    def queue_job_ids(self) -> set[str]:
        rows = self._conn.execute("SELECT job_id FROM queue").fetchall()
        return {r["job_id"] for r in rows}

    # ------------------------------------------------------------------
    # Ingester state
    # ------------------------------------------------------------------

    def get_ingester_state(self) -> dict[str, str]:
        rows = self._conn.execute("SELECT source_id, last_run_at FROM ingester_state").fetchall()
        return {r["source_id"]: r["last_run_at"] for r in rows}

    def set_ingester_last_run(self, source_id: str, ts: str | None = None) -> None:
        self._conn.execute("""
            INSERT INTO ingester_state (source_id, last_run_at) VALUES (?, ?)
            ON CONFLICT(source_id) DO UPDATE SET last_run_at=excluded.last_run_at
        """, (source_id, ts or _now()))
        self._conn.commit()

    # ------------------------------------------------------------------
    # Custom mappers
    # ------------------------------------------------------------------

    def get_custom_mappers(self) -> list[dict]:
        rows = self._conn.execute("SELECT source_id, config FROM custom_mappers").fetchall()
        result = []
        for r in rows:
            try:
                result.append({"source_id": r["source_id"], "config": json.loads(r["config"])})
            except Exception:
                pass
        return result

    def save_custom_mapper(self, source_id: str, config: dict) -> None:
        self._conn.execute("""
            INSERT INTO custom_mappers (source_id, config) VALUES (?, ?)
            ON CONFLICT(source_id) DO UPDATE SET config=excluded.config
        """, (source_id, json.dumps(config)))
        self._conn.commit()
