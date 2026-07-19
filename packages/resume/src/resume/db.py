"""SQLite persistence for saved resume versions."""
from __future__ import annotations

import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ResumeDB:
    def __init__(self, path: str | Path):
        self._conn = sqlite3.connect(str(path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS resumes (
                id         TEXT PRIMARY KEY,
                name       TEXT NOT NULL,
                yaml       TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)
        self._conn.commit()

    def list_resumes(self) -> list[dict]:
        rows = self._conn.execute(
            "SELECT id, name, created_at, updated_at FROM resumes ORDER BY updated_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]

    def get_resume(self, resume_id: str) -> dict | None:
        row = self._conn.execute(
            "SELECT * FROM resumes WHERE id=?", (resume_id,)
        ).fetchone()
        return dict(row) if row else None

    def create_resume(self, name: str, yaml: str) -> dict:
        now = _now()
        resume_id = str(uuid.uuid4())
        self._conn.execute(
            "INSERT INTO resumes (id, name, yaml, created_at, updated_at) VALUES (?,?,?,?,?)",
            (resume_id, name, yaml, now, now),
        )
        self._conn.commit()
        return {"id": resume_id, "name": name, "created_at": now, "updated_at": now}

    def update_resume(self, resume_id: str, name: str | None, yaml: str | None) -> dict | None:
        row = self.get_resume(resume_id)
        if row is None:
            return None
        now = _now()
        new_name = name if name is not None else row["name"]
        new_yaml = yaml if yaml is not None else row["yaml"]
        self._conn.execute(
            "UPDATE resumes SET name=?, yaml=?, updated_at=? WHERE id=?",
            (new_name, new_yaml, now, resume_id),
        )
        self._conn.commit()
        return {"id": resume_id, "name": new_name, "yaml": new_yaml,
                "created_at": row["created_at"], "updated_at": now}

    def delete_resume(self, resume_id: str) -> bool:
        cur = self._conn.execute("DELETE FROM resumes WHERE id=?", (resume_id,))
        self._conn.commit()
        return cur.rowcount > 0
