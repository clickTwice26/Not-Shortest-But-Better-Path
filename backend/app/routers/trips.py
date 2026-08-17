"""Trip logs — the moat (PLAN.md §4, §7).

The whole point is that a user types one line of Banglish instead of filling a
six-field form.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from .. import gemini, repository
from ..geo import haversine_km, road_km
from ..schemas import ParsedTrip, ParseTextBody, TripLogBody

router = APIRouter(prefix="/v1/trips", tags=["trips"])


@router.post("/parse", response_model=ParsedTrip)
async def parse_trip(body: ParseTextBody) -> ParsedTrip:
    """Free text -> structured trip, for review before it is saved."""
    return ParsedTrip(**await gemini.parse_trip(body.text))


@router.post("")
async def create_trip(body: TripLogBody) -> dict:
    places = await repository.load_places()

    origin_pt = None
    dest_pt = None
    if body.origin:
        origin_pt = (body.origin.lat, body.origin.lng)
    elif body.origin_text:
        match = repository.resolve_place(body.origin_text, places)
        if match:
            origin_pt = (match.lat, match.lng)
    if body.destination:
        dest_pt = (body.destination.lat, body.destination.lng)
    elif body.dest_text:
        match = repository.resolve_place(body.dest_text, places)
        if match:
            dest_pt = (match.lat, match.lng)

    distance_km = None
    if origin_pt and dest_pt:
        from ..geo import LatLng

        a, b = LatLng(*origin_pt), LatLng(*dest_pt)
        distance_km = round(road_km(a, b), 2)

    payload = {
        "mode": body.mode,
        "origin_lat": origin_pt[0] if origin_pt else None,
        "origin_lng": origin_pt[1] if origin_pt else None,
        "dest_lat": dest_pt[0] if dest_pt else None,
        "dest_lng": dest_pt[1] if dest_pt else None,
        "distance_km": distance_km,
        "fare_paid": body.fare_paid,
        "duration_min": body.duration_min,
        "occurred_at": body.occurred_at,
        "raw_text": body.raw_text,
        "confidence": None,
        "notes": body.notes,
    }

    trip_id = await repository.insert_trip_log(payload)
    if trip_id is None:
        # No database in the demo path — accept it, say so, do not pretend.
        return {"stored": False, "reason": "database unavailable", "trip": payload}

    implied_rate = (
        round(body.fare_paid / distance_km, 2) if distance_km and distance_km > 0 else None
    )
    return {
        "stored": True,
        "id": trip_id,
        "distance_km": distance_km,
        "implied_rate_per_km": implied_rate,
    }


@router.post("/log-text")
async def log_from_text(body: ParseTextBody) -> dict:
    """Parse and store in one call."""
    parsed = await gemini.parse_trip(body.text)
    if not parsed.get("mode") or parsed.get("fare_paid") is None:
        raise HTTPException(422, {"message": "need at least a mode and a fare", "parsed": parsed})

    stored = await create_trip(
        TripLogBody(
            mode=parsed["mode"],
            fare_paid=float(parsed["fare_paid"]),
            origin_text=parsed.get("origin_text"),
            dest_text=parsed.get("dest_text"),
            duration_min=parsed.get("duration_min"),
            raw_text=body.text,
            notes=parsed.get("conditions"),
        )
    )
    stored["parsed"] = parsed
    return stored
