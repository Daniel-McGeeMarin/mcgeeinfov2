import importlib.resources

import yaml
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response

from resume import build_resume

router = APIRouter(prefix="/api/resume", tags=["resume"])


@router.post("/build")
async def build(request: Request):
    body = await request.body()
    try:
        data = yaml.safe_load(body.decode("utf-8"))
        if not isinstance(data, dict):
            raise ValueError("YAML must be a mapping at the top level")
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


@router.get("/default")
def get_default():
    text = (importlib.resources.files("resume") / "default.yaml").read_text(encoding="utf-8")
    return Response(content=text, media_type="text/plain; charset=utf-8")
