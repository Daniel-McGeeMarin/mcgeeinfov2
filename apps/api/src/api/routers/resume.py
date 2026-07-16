import importlib.resources
import os
import time
import uuid
import xml.etree.ElementTree as ET
from urllib.parse import urlparse, urlunparse

import httpx
import yaml
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response

from resume import build_resume

router = APIRouter(prefix="/api/resume", tags=["resume"])

# OnlyOffice Document Server reachable from inside the site-api container.
# On the shared Podman network (Netavark/Aardvark DNS, NixOS 25.11+) the
# container name resolves directly. Override via env var if needed.
_ONLYOFFICE = os.environ.get("ONLYOFFICE_URL", "http://onlyoffice")

# URL base that the OnlyOffice container uses to download the temp DOCX from us.
# Must be reachable from inside the onlyoffice container.
_SELF_URL = os.environ.get("SITE_API_URL", "http://site-api:8000")

# In-memory temp store: key → (docx_bytes, created_at).
# OnlyOffice fetches the DOCX from /api/resume/tmp/{key} during conversion.
_tmp: dict[str, tuple[bytes, float]] = {}
_TTL = 120


def _purge():
    cutoff = time.time() - _TTL
    for k in [k for k, (_, ts) in _tmp.items() if ts < cutoff]:
        del _tmp[k]


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
    """Build DOCX from YAML, convert to PDF via OnlyOffice, return PDF bytes."""
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

    _purge()
    key = str(uuid.uuid4())
    _tmp[key] = (docx_bytes, time.time())

    # OnlyOffice key: alphanumeric only, ≤128 chars
    oo_key = key.replace("-", "")
    file_url = f"{_SELF_URL}/api/resume/tmp/{key}"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            conv = await client.post(
                f"{_ONLYOFFICE}/ConvertService.ashx",
                json={
                    "async": False,
                    "filetype": "docx",
                    "key": oo_key,
                    "outputtype": "pdf",
                    "title": "resume.docx",
                    "url": file_url,
                },
            )
            if conv.status_code != 200:
                raise HTTPException(502, f"OnlyOffice returned {conv.status_code}")
            # ConvertService always responds with XML regardless of request content-type
            root = ET.fromstring(conv.text)
            error_el = root.find("Error")
            if error_el is not None:
                raise HTTPException(502, f"OnlyOffice error code {error_el.text}")
            pdf_url = root.findtext("FileUrl")
            if not pdf_url:
                raise HTTPException(502, "OnlyOffice did not return FileUrl")

            # OnlyOffice returns fileUrl as http://localhost:<host-port>/cache/...
            # Rewrite the host to reach it from inside this container instead.
            oo = urlparse(_ONLYOFFICE)
            pdf_url = urlunparse(urlparse(pdf_url)._replace(scheme=oo.scheme, netloc=oo.netloc))

            pdf = await client.get(pdf_url)
            if pdf.status_code != 200:
                raise HTTPException(502, f"Failed to fetch PDF: {pdf.status_code}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, f"Conversion error: {e}")
    finally:
        _tmp.pop(key, None)

    return Response(
        content=pdf.content,
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="resume.pdf"'},
    )


@router.get("/tmp/{key}")
async def serve_tmp(key: str):
    """Temporary DOCX endpoint polled by OnlyOffice during conversion."""
    entry = _tmp.get(key)
    if not entry:
        raise HTTPException(404, "Not found or expired")
    docx_bytes, _ = entry
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


@router.get("/default")
def get_default():
    text = (importlib.resources.files("resume") / "default.yaml").read_text(encoding="utf-8")
    return Response(content=text, media_type="text/plain; charset=utf-8")
