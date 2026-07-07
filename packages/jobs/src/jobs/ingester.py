"""
Ingester: runs all registered mappers and upserts results into the DB.
Mappers are pre-registered (no runtime CRUD); just run and refresh.
"""
from __future__ import annotations

from .db import DB
from .mappers import MAPPER_BY_ID, MAPPERS


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
            self._db.upsert_job(row)
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
