"""
Ingester: runs all registered mappers and upserts results into the DB.
Mappers are pre-registered (no runtime CRUD); just run and refresh.
"""
from __future__ import annotations

from .db import DB
from .enrichment import detect_apply_type, detect_workday
from .mappers import MAPPER_BY_ID, MAPPERS


def _apply_url_tags(row: dict) -> dict:
    """Tag fast_apply and workday from the URL at ingest time — no network needed."""
    url = row.get("apply_url") or ""
    tags: list[str] = list(row.get("tags") or [])
    apply_type = detect_apply_type(url)
    if apply_type == "fast_apply" and "fast_apply" not in tags:
        tags.append("fast_apply")
    if detect_workday(url) and "workday" not in tags:
        tags.append("workday")
    row["tags"] = tags
    return row


class Ingester:
    def __init__(self, db: DB):
        self._db = db

    def run_all(self) -> dict[str, int | str]:
        results: dict[str, int | str] = {}
        for mapper in MAPPERS:
            try:
                results[mapper.SOURCE_ID] = self._run_mapper(mapper)
            except Exception as e:
                results[mapper.SOURCE_ID] = f"error: {e}"
        return results

    def run_one(self, source_id: str) -> int:
        mapper = MAPPER_BY_ID.get(source_id)
        if not mapper:
            raise ValueError(f"Unknown source: {source_id!r}")
        return self._run_mapper(mapper)

    def _run_mapper(self, mapper) -> int:
        rows = mapper.run()
        for row in rows:
            self._db.upsert_job(_apply_url_tags(row))
        self._db.set_ingester_last_run(mapper.SOURCE_ID)
        return len(rows)

    def sources(self) -> list[dict]:
        state = self._db.get_ingester_state()
        return [
            {
                "source_id":   m.SOURCE_ID,
                "source_url":  m.SOURCE_URL,
                "last_run_at": state.get(m.SOURCE_ID),
            }
            for m in MAPPERS
        ]
