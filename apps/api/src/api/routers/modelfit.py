from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from modelfit import get_challenge, get_test_actuals, get_session, init_db, list_challenges, save_session

router = APIRouter(prefix="/api/modelfit", tags=["modelfit"])

init_db()


class ScoreRequest(BaseModel):
    challenge_id: str
    predictions: dict[str, list[float]]


class SessionSaveRequest(BaseModel):
    student_name: str | None = None
    challenge_id: str
    state: dict


@router.get("/challenges")
def challenges():
    return list_challenges()


@router.get("/challenge/{challenge_id}")
def challenge(challenge_id: str):
    data = get_challenge(challenge_id)
    if not data:
        raise HTTPException(404, f"Challenge '{challenge_id}' not found")
    return data


@router.post("/score")
def score(req: ScoreRequest):
    actuals = get_test_actuals(req.challenge_id)
    if actuals is None:
        raise HTTPException(404, f"Challenge '{req.challenge_id}' not found")

    n = len(actuals)
    results: dict[str, dict] = {}
    for model_type, preds in req.predictions.items():
        if len(preds) != n:
            raise HTTPException(
                400, f"Expected {n} predictions for '{model_type}', got {len(preds)}"
            )
        results[model_type] = _score(preds, actuals)

    challenge_data = get_challenge(req.challenge_id)
    test_points = [
        {"x": x, "y": y} for x, y in zip(challenge_data["test_x"], actuals)
    ]
    best = max(results, key=lambda k: results[k]["r2"])

    return {"scores": results, "best_model": best, "test_points": test_points}


@router.post("/session")
def session_save(req: SessionSaveRequest):
    session_id = save_session(req.student_name, req.challenge_id, req.state)
    return {"session_id": session_id}


@router.get("/session/{session_id}")
def session_get(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    return session


def _score(predictions: list[float], actuals: list[float]) -> dict:
    n = len(actuals)
    mean_a = sum(actuals) / n
    ss_tot = sum((a - mean_a) ** 2 for a in actuals)
    ss_res = sum((p - a) ** 2 for p, a in zip(predictions, actuals))
    mse = ss_res / n
    r2 = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
    return {
        "mse": round(mse, 4),
        "r2": round(r2, 4),
        "grade": _grade(max(0.0, r2)),
    }


def _grade(r2: float) -> str:
    if r2 >= 0.95: return "A"
    if r2 >= 0.85: return "B"
    if r2 >= 0.70: return "C"
    if r2 >= 0.50: return "D"
    return "F"
