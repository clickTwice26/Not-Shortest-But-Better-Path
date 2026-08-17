"""Postgres pool. The API degrades to bundled seed data if the DB is down."""

from __future__ import annotations

import logging

import asyncpg

from .config import settings

log = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


async def connect() -> asyncpg.Pool | None:
    global _pool
    if _pool is not None:
        return _pool
    try:
        _pool = await asyncpg.create_pool(
            settings.database_url, min_size=1, max_size=10, command_timeout=10
        )
        log.info("postgres connected")
    except Exception as exc:  # noqa: BLE001 - startup must not hard-fail
        log.warning("postgres unavailable (%s); using bundled seed data", exc)
        _pool = None
    return _pool


async def disconnect() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def pool() -> asyncpg.Pool | None:
    return _pool
