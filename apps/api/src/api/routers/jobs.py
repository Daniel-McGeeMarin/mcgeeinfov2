"""Jobs router — mounted at /api/jobs. All routes are private (Authelia at the proxy)."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from pydantic import BaseModel

from jobs.db import DB
from jobs.enrichment import run_enrichment_pass
from jobs.ingester import Ingester
from jobs.mappers import MAPPER_BY_ID

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

_db = DB(Path(os.environ.get("JOBS_DB_PATH", "./jobs.db")))
_ingester = Ingester(_db)

# ---------------------------------------------------------------------------
# Sources & refresh — defined before /{job_id} to avoid route capture
# ---------------------------------------------------------------------------

@router.get("/sources")
def list_sources():
    return {"sources": _ingester.sources()}


@router.post("/refresh")
def refresh_all(background_tasks: BackgroundTasks):
    background_tasks.add_task(_ingester.run_all)
    return {"status": "started"}


@router.post("/refresh/{source_id}")
def refresh_one(source_id: str, background_tasks: BackgroundTasks):
    if source_id not in MAPPER_BY_ID:
        raise HTTPException(404, f"Unknown source: {source_id!r}")
    background_tasks.add_task(_ingester.run_one, source_id)
    return {"status": "started", "source_id": source_id}


@router.post("/enrich")
def enrich(
    background_tasks: BackgroundTasks,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
):
    background_tasks.add_task(run_enrichment_pass, _db, limit)
    return {"status": "started"}


# ---------------------------------------------------------------------------
# Queue — also defined before /{job_id}
# ---------------------------------------------------------------------------

class QueueAddRequest(BaseModel):
    job_id: str
    priority: int = 3


class QueueUpdateRequest(BaseModel):
    status: str | None = None
    priority: int | None = None
    notes: str | None = None


@router.get("/queue")
def get_queue():
    return {"queue": _db.get_queue()}


@router.post("/queue")
def add_to_queue(req: QueueAddRequest):
    if not _db.get_job(req.job_id):
        raise HTTPException(404, "Job not found")
    _db.add_to_queue(req.job_id, req.priority)
    return {"ok": True}


@router.patch("/queue/{job_id}")
def update_queue(job_id: str, req: QueueUpdateRequest):
    _db.update_queue(job_id, req.model_dump(exclude_none=True))
    return {"ok": True}


@router.delete("/queue/{job_id}")
def remove_from_queue(job_id: str):
    _db.remove_from_queue(job_id)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Custom mappers
# ---------------------------------------------------------------------------

_CUSTOM_MAPPER_PROMPT = """\
You are helping create a job source mapping config for a personal job aggregator.

Analyze the GitHub README content provided and output ONLY a JSON object matching this schema:

{
  "source_id": "short_snake_case_id",
  "source_url": "https://raw.githubusercontent.com/org/repo/branch/FILE.md",
  "table_format": "markdown_pipe",
  "column_mapping": {
    "<exact header from table>": "<universal key>",
    ...
  },
  "extract_apply_url": "<regex to pull URL from the apply cell, or null>",
  "continuation_company": "<cell value meaning same company as above, or null>",
  "row_type": "summer",
  "date_formats": ["<strptime format>", ...],
  "tag_emoji_map": { "<emoji>": "<tag_id>", ... },
  "tag_source_columns": ["<column header>", ...]
}

Universal keys for column_mapping: company, role, location, apply_url, date_posted
Valid tag_ids: no_sponsorship, us_citizenship_required, closed, faang_plus, advanced_degree
Valid row_type values: summer, new_grad, offseason

Reference mapping (vanshb03/Summer2027-Internships):
{
  "source_id": "vanshb03_summer2027",
  "source_url": "https://raw.githubusercontent.com/vanshb03/Summer2027-Internships/dev/README.md",
  "table_format": "markdown_pipe",
  "column_mapping": {"Company":"company","Role":"role","Location":"location","Application/Link":"apply_url","Date Posted":"date_posted"},
  "extract_apply_url": "\\\\[Apply\\\\]\\\\((https?://[^)]+)\\\\)",
  "continuation_company": "↳",
  "row_type": "summer",
  "date_formats": ["%b %d", "%B %d", "%m/%d/%Y", "%Y-%m-%d"],
  "tag_emoji_map": {"🛂":"no_sponsorship","🇺🇸":"us_citizenship_required","🔒":"closed"},
  "tag_source_columns": ["Role"]
}

Output only valid JSON. No explanation, no markdown fence.
"""


@router.get("/custom-mapper-prompt")
def get_custom_mapper_prompt():
    return {"prompt": _CUSTOM_MAPPER_PROMPT}


class CustomMapperRequest(BaseModel):
    source_id: str
    config: dict


@router.post("/custom-mappers")
def save_custom_mapper(req: CustomMapperRequest):
    cfg = req.config
    missing = {"source_url", "column_mapping", "row_type"} - set(cfg.keys())
    if missing:
        raise HTTPException(400, f"Missing required config fields: {sorted(missing)}")
    cm = cfg.get("column_mapping") or {}
    if "company" not in cm.values() or "apply_url" not in cm.values():
        raise HTTPException(400, "column_mapping must include 'company' and 'apply_url' mappings")
    if cfg.get("row_type") not in ("summer", "new_grad", "offseason"):
        raise HTTPException(400, "row_type must be summer, new_grad, or offseason")
    _db.save_custom_mapper(req.source_id, cfg)
    return {"ok": True}


@router.get("/custom-mappers")
def list_custom_mappers():
    return {"custom_mappers": _db.get_custom_mappers()}


# ---------------------------------------------------------------------------
# Jobs list and detail — parametric route last
# ---------------------------------------------------------------------------

@router.get("")
def list_jobs(
    type: Annotated[str | None, Query()] = None,
    source: Annotated[str | None, Query()] = None,
    tag: Annotated[str | None, Query()] = None,
    q: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    jobs = _db.list_jobs(type, source, tag, q, limit, offset)
    queued = _db.queue_job_ids()
    for job in jobs:
        job["in_queue"] = job["id"] in queued
    return {"jobs": jobs, "total": _db.count_jobs()}


@router.get("/{job_id}")
def get_job(job_id: str):
    job = _db.get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job
