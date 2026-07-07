from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers.poker import router as poker_router
from api.routers.jobs import router as jobs_router

app = FastAPI(title="mcgeedan.com API", docs_url="/api/docs", openapi_url="/api/openapi.json")
app.include_router(poker_router)
app.include_router(jobs_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://mcgeedan.com",
        "http://localhost:5173",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}
