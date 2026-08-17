"""Geocoding (PLAN.md §7 — the weakest link).

Three tiers, cheapest first:

    1. the local ``landmarks`` table   -- instant, curated, offline
    2. Redis                           -- recent remote lookups
    3. Photon (OSM), Nominatim backup  -- everything else

Anything resolved remotely is written back into ``landmarks``, so the local
table grows into a Dhaka gazetteer as people use the app. No Google — see
PLAN.md §5 for why that path is closed.

Gemini normalises informal phrasing on the way in, but never produces
coordinates: it would invent them confidently.
"""

from __future__ import annotations

import asyncio
import logging

import httpx

from . import cache
from .geo import LatLng

log = logging.getLogger(__name__)

PHOTON_URL = "https://photon.komoot.io/api/"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

# Greater Dhaka. Keeps "Banani" off Banani, Iran.
DHAKA_BBOX = (90.15, 23.55, 90.65, 24.00)
DHAKA_CENTER = LatLng(lat=23.7806, lng=90.4074)

# Nominatim's usage policy requires an identifying User-Agent.
USER_AGENT = "Poth/0.1 (Dhaka multimodal journey planner)"

GEOCODE_TTL = 60 * 60 * 24 * 30


class GeocodeResult:
    __slots__ = ("name", "lat", "lng", "source", "kind")

    def __init__(self, name: str, lat: float, lng: float, source: str, kind: str = "") -> None:
        self.name = name
        self.lat = lat
        self.lng = lng
        self.source = source
        self.kind = kind

    @property
    def point(self) -> LatLng:
        return LatLng(lat=self.lat, lng=self.lng)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "lat": self.lat,
            "lng": self.lng,
            "source": self.source,
            "kind": self.kind,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "GeocodeResult":
        return cls(d["name"], d["lat"], d["lng"], d.get("source", "cache"), d.get("kind", ""))


def _in_bbox(lat: float, lng: float) -> bool:
    min_lon, min_lat, max_lon, max_lat = DHAKA_BBOX
    return min_lat <= lat <= max_lat and min_lon <= lng <= max_lon


def _label(props: dict) -> str:
    """Readable label from a Photon feature: 'Name, District'."""
    parts = [props.get("name")]
    context = props.get("district") or props.get("suburb") or props.get("city")
    if context and context != props.get("name"):
        parts.append(context)
    return ", ".join(p for p in parts if p)


async def photon_search(query: str, limit: int = 8) -> list[GeocodeResult]:
    params = {
        "q": query,
        "limit": str(limit),
        "lang": "en",
        "lat": str(DHAKA_CENTER.lat),
        "lon": str(DHAKA_CENTER.lng),
        "bbox": ",".join(str(v) for v in DHAKA_BBOX),
    }
    try:
        async with httpx.AsyncClient(timeout=6.0, headers={"User-Agent": USER_AGENT}) as client:
            resp = await client.get(PHOTON_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:  # noqa: BLE001
        log.warning("photon failed for %r (%s)", query, exc)
        return []

    out: list[GeocodeResult] = []
    for feat in data.get("features", []):
        coords = feat.get("geometry", {}).get("coordinates") or []
        if len(coords) != 2:
            continue
        lng, lat = float(coords[0]), float(coords[1])
        if not _in_bbox(lat, lng):
            continue
        props = feat.get("properties", {})
        name = _label(props)
        if name:
            out.append(GeocodeResult(name, lat, lng, "photon", props.get("osm_value", "")))
    return out


async def nominatim_search(query: str, limit: int = 5) -> list[GeocodeResult]:
    """Backup only — the usage policy caps this at roughly one call a second."""
    min_lon, min_lat, max_lon, max_lat = DHAKA_BBOX
    params = {
        "q": query,
        "format": "jsonv2",
        "limit": str(limit),
        "countrycodes": "bd",
        "viewbox": f"{min_lon},{max_lat},{max_lon},{min_lat}",
        "bounded": "1",
    }
    try:
        async with httpx.AsyncClient(timeout=6.0, headers={"User-Agent": USER_AGENT}) as client:
            resp = await client.get(NOMINATIM_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:  # noqa: BLE001
        log.warning("nominatim failed for %r (%s)", query, exc)
        return []

    out: list[GeocodeResult] = []
    for row in data:
        lat, lng = float(row["lat"]), float(row["lon"])
        if not _in_bbox(lat, lng):
            continue
        name = row.get("display_name", "").split(",")[0] or query
        out.append(GeocodeResult(name, lat, lng, "nominatim", row.get("type", "")))
    return out


async def search(query: str, limit: int = 8) -> list[GeocodeResult]:
    """Remote suggestions for a partial query, Redis-cached."""
    q = query.strip().lower()
    if len(q) < 2:
        return []

    key = f"poth:geo:search:{q}:{limit}"
    hit = await cache.get_json(key)
    if hit is not None:
        return [GeocodeResult.from_dict(d) for d in hit]

    results = await photon_search(q, limit)
    if not results:
        results = await nominatim_search(q, limit)

    if results:
        await cache.set_json(key, [r.to_dict() for r in results], ttl=GEOCODE_TTL)
    return results


async def geocode(query: str) -> GeocodeResult | None:
    """Best single match for a full query."""
    results = await search(query, limit=5)
    return results[0] if results else None


async def search_many(queries: list[str], limit: int = 8) -> list[list[GeocodeResult]]:
    return list(await asyncio.gather(*(search(q, limit) for q in queries)))
