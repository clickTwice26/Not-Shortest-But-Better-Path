"""Redis leg/plan cache (PLAN.md §6).

Keys are coarse on purpose: rounding coordinates to ~110 m and bucketing time to
the hour makes near-identical queries share an entry. Same idea as the H3 res-9
key in the plan, without the extra dependency.
"""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

import redis.asyncio as aioredis

from .config import settings

log = logging.getLogger(__name__)

_client: aioredis.Redis | None = None


async def connect() -> aioredis.Redis | None:
    global _client
    if _client is not None:
        return _client
    try:
        client = aioredis.from_url(settings.redis_url, decode_responses=True)
        await client.ping()
        _client = client
        log.info("redis connected")
    except Exception as exc:  # noqa: BLE001 - cache is optional
        log.warning("redis unavailable (%s); running uncached", exc)
        _client = None
    return _client


async def disconnect() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


def plan_key(payload: dict[str, Any]) -> str:
    """Coordinates to 3dp (~110 m), everything else verbatim."""

    def snap(value: Any) -> Any:
        if isinstance(value, float):
            return round(value, 3)
        if isinstance(value, dict):
            return {k: snap(v) for k, v in sorted(value.items())}
        if isinstance(value, (list, tuple)):
            return [snap(v) for v in value]
        return value

    blob = json.dumps(snap(payload), sort_keys=True, default=str)
    return "poth:plan:" + hashlib.sha1(blob.encode()).hexdigest()  # noqa: S324


async def get_json(key: str) -> Any | None:
    if _client is None:
        return None
    try:
        raw = await _client.get(key)
        return json.loads(raw) if raw else None
    except Exception:  # noqa: BLE001
        return None


async def set_json(key: str, value: Any, ttl: int | None = None) -> None:
    if _client is None:
        return
    try:
        await _client.set(key, json.dumps(value, default=str), ex=ttl or settings.cache_ttl_seconds)
    except Exception:  # noqa: BLE001
        pass
