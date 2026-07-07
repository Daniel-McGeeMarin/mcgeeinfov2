import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers.poker import router as poker_router
from api.routers.jobs import router as jobs_router, get_ingester

logger = logging.getLogger(__name__)

# Configurable via env var — default 1 hour. Set to 0 to disable.
_REFRESH_INTERVAL = int(os.environ.get("JOBS_REFRESH_INTERVAL_SECS", "3600"))


async def _ingest_cron():
    ingester = get_ingester()
    loop = asyncio.get_running_loop()
    while True:
        try:
            await loop.run_in_executor(None, ingester.run_all)
            logger.info("Jobs auto-refresh complete")
        except Exception:
            logger.exception("Jobs auto-refresh failed")
        await asyncio.sleep(_REFRESH_INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = None
    if _REFRESH_INTERVAL > 0:
        task = asyncio.create_task(_ingest_cron())
    yield
    if task:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="mcgeedan.com API",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)
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
