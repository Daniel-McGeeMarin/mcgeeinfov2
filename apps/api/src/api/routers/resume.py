import importlib.resources
import subprocess
import tempfile

import yaml
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response

from resume import build_resume

router = APIRouter(prefix="/api/resume", tags=["resume"])


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
