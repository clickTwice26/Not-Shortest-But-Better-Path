from __future__ import annotations

from fastapi import APIRouter, HTTPException

from .. import cache, gemini, repository
from ..config import settings
from ..geo import LatLng
from ..modes import MODES
from ..planner import PlanRequest, plan
from ..schemas import ParsedQuery, ParseTextBody, PlanRequestBody, StationOut

router = APIRouter(prefix="/v1", tags=["planner"])


async def _resolve(point, text, places, field: str) -> tuple[LatLng, str]:
    if point is not None:
        return LatLng(lat=point.lat, lng=point.lng), text or f"{point.lat:.4f}, {point.lng:.4f}"
    if not text:
        raise HTTPException(422, f"{field} requires coordinates or text")
    match = repository.resolve_place(text, places)
    if match is None:
        raise HTTPException(404, f"could not resolve {field}: '{text}'")
    return match.point, match.canonical


@router.post("/plan")
async def create_plan(body: PlanRequestBody) -> dict:
    key = cache.plan_key(body.model_dump(mode="json"))
    cached = await cache.get_json(key)
    if cached is not None:
        cached["cached"] = True
        return cached

    places = await repository.load_places()
    origin, origin_name = await _resolve(body.origin, body.origin_text, places, "origin")
    dest, dest_name = await _resolve(body.destination, body.destination_text, places, "destination")

    unknown = [m for m in (*body.modes, *body.owns) if m not in MODES]
    if unknown:
        raise HTTPException(422, f"unknown modes: {', '.join(unknown)}")

    stations = await repository.load_stations()
    fares = await repository.load_farebook()

    result = plan(
        PlanRequest(
            origin=origin,
            origin_name=origin_name,
            destination=dest,
            destination_name=dest_name,
            vot_bdt_per_min=body.vot_bdt_per_min,
            modes=tuple(body.modes),
            owns=tuple(body.owns),
            surge=body.surge,
            max_duration_min=body.max_duration_min,
            max_cost_bdt=body.max_cost_bdt,
        ),
        fares,
        stations,
    )
    result["cached"] = False
    await cache.set_json(key, result, ttl=settings.cache_ttl_seconds)
    return result


@router.post("/parse-query", response_model=ParsedQuery)
async def parse_query(body: ParseTextBody) -> ParsedQuery:
    """Banglish -> structured plan request. The VOT slider, set by talking."""
    parsed = await gemini.parse_query(body.text)
    return ParsedQuery(**parsed)


@router.post("/plan/natural")
async def plan_natural(body: ParseTextBody) -> dict:
    """Parse free text, then plan. One call for the demo path."""
    parsed = await gemini.parse_query(body.text)
    if not parsed.get("origin_text") or not parsed.get("destination_text"):
        raise HTTPException(422, {"message": "could not find an origin and destination", "parsed": parsed})

    result = await create_plan(
        PlanRequestBody(
            origin_text=parsed["origin_text"],
            destination_text=parsed["destination_text"],
            vot_bdt_per_min=parsed["vot_bdt_per_min"],
            modes=parsed.get("modes") or [],
            max_duration_min=parsed.get("max_duration_min"),
            max_cost_bdt=parsed.get("max_cost_bdt"),
        )
    )
    result["parsed_query"] = parsed
    return result


@router.get("/stations", response_model=list[StationOut])
async def list_stations() -> list[StationOut]:
    stations = await repository.load_stations()
    return [
        StationOut(
            id=s.id,
            code=s.code,
            name=s.name,
            name_bn=s.name_bn,
            lat=s.lat,
            lng=s.lng,
            chainage_km=s.chainage_km,
            sequence=s.sequence,
            parkable_modes=list(s.parkable_modes),
            has_car_parking=s.has_car_parking,
        )
        for s in stations
    ]


@router.get("/places")
async def list_places(q: str | None = None, limit: int = 50) -> list[dict]:
    places = await repository.load_places()
    if q:
        low = q.strip().lower()
        places = [
            p for p in places
            if low in p.canonical.lower() or any(low in a.lower() for a in p.aliases)
        ]
    return [
        {"id": p.id, "name": p.canonical, "lat": p.lat, "lng": p.lng, "aliases": list(p.aliases)}
        for p in places[:limit]
    ]


@router.get("/modes")
async def list_modes() -> list[dict]:
    return [
        {
            "id": m.id,
            "label": m.label,
            "label_bn": m.label_bn,
            "icon": m.icon,
            "speed_kmh": m.speed_kmh,
            "requires_ownership": m.requires_ownership,
            "parkable_at_station": m.parkable_at_station,
            "confidence": m.confidence,
        }
        for m in MODES.values()
    ]
