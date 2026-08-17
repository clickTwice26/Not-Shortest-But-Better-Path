from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import cache, db
from .config import settings
from .routers import plan, trips

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    await cache.connect()
    yield
    await cache.disconnect()
    await db.disconnect()


app = FastAPI(
    title="Poth",
    description="Multimodal cost-aware journey planner for Dhaka.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(plan.router)
app.include_router(trips.router)


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "postgres": db.pool() is not None,
        "redis": cache._client is not None,  # noqa: SLF001
        "gemini": bool(settings.gemini_api_key),
    }
