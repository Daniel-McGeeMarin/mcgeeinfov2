from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from poker import simulate_equity

router = APIRouter(prefix="/api/poker", tags=["poker"])


class EquityRequest(BaseModel):
    hero: list[str] = Field(..., min_length=2, max_length=2)
    board: list[str] = Field(default_factory=list)
    opponents: int = Field(default=2, ge=1, le=8)
    trials: int = Field(default=4000, ge=500, le=10000)


class EquityResponse(BaseModel):
    equities: list[float]


@router.post("/equity", response_model=EquityResponse)
def equity(req: EquityRequest):
    if len(req.board) not in (0, 3, 4, 5):
        raise HTTPException(400, "board must have 0, 3, 4, or 5 cards")

    try:
        equities = simulate_equity(req.hero, req.board, req.opponents, req.trials)
    except ValueError as e:
        raise HTTPException(400, str(e))

    return EquityResponse(equities=equities)
