import importlib.resources
import os
import subprocess
import tempfile
from pathlib import Path

import yaml
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel

from resume import build_resume
from resume.db import ResumeDB

router = APIRouter(prefix="/api/resume", tags=["resume"])

_db = ResumeDB(Path(os.environ.get("RESUME_DB_PATH", "./resume.db")))


# ---------------------------------------------------------------------------
# Build / preview
# ---------------------------------------------------------------------------

@router.post("/build")
async def build(request: Request):
    """Return the generated DOCX directly."""
    body = await request.body()
    try:
        data = yaml.safe_load(body.decode("utf-8"))
        if not isinstance(data, dict):
            raise ValueError("YAML must be a mapping")
        docx_bytes = build_resume(data)
    except yaml.YAMLError as e:
        raise HTTPException(400, f"Invalid YAML: {e}")
    except (KeyError, TypeError) as e:
        raise HTTPException(422, f"Missing or invalid field: {e}")
    except Exception as e:
        raise HTTPException(500, str(e))
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": 'attachment; filename="resume.docx"'},
    )


@router.post("/preview")
async def preview(request: Request):
    """Build DOCX from YAML, convert to PDF via LibreOffice, return PDF bytes."""
    body = await request.body()
    try:
        data = yaml.safe_load(body.decode("utf-8"))
        if not isinstance(data, dict):
            raise ValueError("YAML must be a mapping")
        docx_bytes = build_resume(data)
    except yaml.YAMLError as e:
        raise HTTPException(400, f"Invalid YAML: {e}")
    except (KeyError, TypeError) as e:
        raise HTTPException(422, f"Missing or invalid field: {e}")
    except Exception as e:
        raise HTTPException(500, str(e))

    with tempfile.TemporaryDirectory() as tmpdir:
        docx_path = f"{tmpdir}/resume.docx"
        pdf_path = f"{tmpdir}/resume.pdf"
        with open(docx_path, "wb") as f:
            f.write(docx_bytes)
        result = subprocess.run(
            [
                "soffice", "--headless", "--convert-to", "pdf",
                "--outdir", tmpdir, docx_path,
            ],
            capture_output=True,
            timeout=60,
        )
        if result.returncode != 0:
            raise HTTPException(500, f"Conversion failed: {result.stderr.decode()}")
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="resume.pdf"'},
    )


@router.get("/default")
def get_default():
    text = (importlib.resources.files("resume") / "default.yaml").read_text(encoding="utf-8")
    return Response(content=text, media_type="text/plain; charset=utf-8")


# ---------------------------------------------------------------------------
# Saved resumes (auth-gated at Caddy — /api/resume/saved/*)
# ---------------------------------------------------------------------------

class SaveBody(BaseModel):
    name: str
    yaml: str


class PatchBody(BaseModel):
    name: str | None = None
    yaml: str | None = None


@router.get("/saved")
def list_saved():
    return _db.list_resumes()


@router.get("/saved/{resume_id}")
def get_saved(resume_id: str):
    row = _db.get_resume(resume_id)
    if row is None:
        raise HTTPException(404, "Not found")
    return row


@router.post("/saved", status_code=201)
def create_saved(body: SaveBody):
    return _db.create_resume(body.name, body.yaml)


@router.patch("/saved/{resume_id}")
def update_saved(resume_id: str, body: PatchBody):
    row = _db.update_resume(resume_id, body.name, body.yaml)
    if row is None:
        raise HTTPException(404, "Not found")
    return row


@router.delete("/saved/{resume_id}", status_code=204)
def delete_saved(resume_id: str):
    if not _db.delete_resume(resume_id):
        raise HTTPException(404, "Not found")
