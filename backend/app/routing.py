"""Street routing.

Returns real on-road distance and geometry so legs can be drawn on a map
instead of as straight lines. Distances feed the fare model; durations do NOT
come from here — they come from the Dhaka-specific speeds in ``modes.py``,
because a generic router's speeds are wrong for this city by a wide margin.

Phase 1 replaces the OSRM call with self-hosted Valhalla (PLAN.md §6) — one
container, all modes, no third-party rate limits. The interface stays the same.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from . import cache
from .geo import LatLng, leg_geometry, road_km

log = logging.getLogger(__name__)

OSRM_URL = "https://router.project-osrm.org/route/v1/driving"
ROUTE_TTL = 60 * 60 * 24 * 7
USER_AGENT = "Poth/0.1 (Dhaka multimodal journey planner)"


@dataclass(frozen=True)
class RouteLeg:
    distance_km: float
    geometry: list[list[float]]
    source: str  # "osrm" | "estimate"


def _key(a: LatLng, b: LatLng) -> str:
    return f"poth:route:{a.lat:.4f},{a.lng:.4f}:{b.lat:.4f},{b.lng:.4f}"


def pair_key(a: LatLng, b: LatLng) -> tuple[float, float, float, float]:
    return (round(a.lat, 5), round(a.lng, 5), round(b.lat, 5), round(b.lng, 5))


def estimate(a: LatLng, b: LatLng) -> RouteLeg:
    return RouteLeg(distance_km=road_km(a, b), geometry=leg_geometry(a, b), source="estimate")


async def _fetch(a: LatLng, b: LatLng) -> RouteLeg:
    cached = await cache.get_json(_key(a, b))
    if cached is not None:
        return RouteLeg(cached["distance_km"], cached["geometry"], cached.get("source", "cache"))

    url = f"{OSRM_URL}/{a.lng},{a.lat};{b.lng},{b.lat}"
    params = {"overview": "full", "geometries": "geojson", "alternatives": "false", "steps": "false"}
    try:
        async with httpx.AsyncClient(timeout=8.0, headers={"User-Agent": USER_AGENT}) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        route = data["routes"][0]
        leg = RouteLeg(
            distance_km=route["distance"] / 1000.0,
            geometry=route["geometry"]["coordinates"],
            source="osrm",
        )
    except Exception as exc:  # noqa: BLE001 - a straight line beats no answer
        log.warning("osrm failed (%s); estimating", exc)
        return estimate(a, b)

    await cache.set_json(
        _key(a, b),
        {"distance_km": leg.distance_km, "geometry": leg.geometry, "source": leg.source},
        ttl=ROUTE_TTL,
    )
    return leg


async def route_matrix(pairs: list[tuple[LatLng, LatLng]]) -> dict[tuple, RouteLeg]:
    """Resolve every distinct origin/destination pair concurrently.

    The ellipse prune keeps this at 2k+1 calls, not k^2 (PLAN.md §2).
    """
    distinct: dict[tuple, tuple[LatLng, LatLng]] = {}
    for a, b in pairs:
        distinct.setdefault(pair_key(a, b), (a, b))

    keys = list(distinct.keys())
    legs = await asyncio.gather(*(_fetch(*distinct[k]) for k in keys), return_exceptions=True)

    out: dict[tuple, RouteLeg] = {}
    for k, leg in zip(keys, legs):
        a, b = distinct[k]
        out[k] = leg if isinstance(leg, RouteLeg) else estimate(a, b)
    return out
