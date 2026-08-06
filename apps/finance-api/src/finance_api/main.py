from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from finance_api.routers.finance import router as finance_router

app = FastAPI(
    title="Finance API",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)
app.include_router(finance_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://finances.mcgeedan.com",
        "http://localhost:5174",
    ],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}
