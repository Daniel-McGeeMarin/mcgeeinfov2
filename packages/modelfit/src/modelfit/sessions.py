import json
import os
import sqlite3
import uuid
from pathlib import Path

_DB_PATH = Path(os.environ.get("MODELFIT_DB", "/tmp/modelfit_sessions.db"))


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(_DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id           TEXT PRIMARY KEY,
                created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                student_name TEXT,
                challenge_id TEXT NOT NULL,
                state        TEXT NOT NULL
            )
        """)


def save_session(student_name: str | None, challenge_id: str, state: dict) -> str:
    session_id = uuid.uuid4().hex[:8]
    with _conn() as conn:
        conn.execute(
            "INSERT INTO sessions (id, student_name, challenge_id, state) VALUES (?, ?, ?, ?)",
            (session_id, student_name, challenge_id, json.dumps(state)),
        )
    return session_id


def get_session(session_id: str) -> dict | None:
    with _conn() as conn:
        row = conn.execute(
            "SELECT * FROM sessions WHERE id = ?", (session_id,)
        ).fetchone()
    if not row:
        return None
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "student_name": row["student_name"],
        "challenge_id": row["challenge_id"],
        "state": json.loads(row["state"]),
    }
