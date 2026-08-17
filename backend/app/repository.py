"""Reads reference data from Postgres, falling back to bundled seeds.

The fallback is deliberate: a demo that dies because the database is not seeded
is worse than one that answers from constants and says so.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from . import db
from .fares import FareBook, FareRule
from .geo import LatLng, haversine_km
from .network import STATIONS, Station
from .seed_data import FARE_RULES, LANDMARKS

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class Landmark:
    id: int
    canonical: str
    aliases: tuple[str, ...]
    lat: float
    lng: float

    @property
    def point(self) -> LatLng:
        return LatLng(lat=self.lat, lng=self.lng)


_SEED_LANDMARKS: list[Landmark] = [
    Landmark(i + 1, lm.canonical, lm.aliases, lm.lat, lm.lng) for i, lm in enumerate(LANDMARKS)
]

# Stations double as searchable places.
_STATION_PLACES: list[Landmark] = [
    Landmark(10_000 + s.id, f"{s.name} Metro Station", (s.name.lower(), s.code.lower()), s.lat, s.lng)
    for s in STATIONS
]


async def load_stations() -> list[Station]:
    p = db.pool()
    if p is None:
        return STATIONS
    try:
        rows = await p.fetch(
            """
            SELECT n.id, n.code, n.name, n.name_bn,
                   ST_Y(n.geom::geometry) AS lat, ST_X(n.geom::geometry) AS lng,
                   n.parkable_modes, n.has_car_parking, st.stop_sequence
              FROM transfer_nodes n
              JOIN transit_stop_times st ON st.station_id = n.id
             WHERE n.active AND n.kind = 'metro_station'
             ORDER BY st.stop_sequence
            """
        )
    except Exception as exc:  # noqa: BLE001
        log.warning("station query failed (%s); using seeds", exc)
        return STATIONS

    if not rows:
        return STATIONS

    # Chainage is computed the same way as the seed build, so DB-loaded and
    # bundled stations price identically.
    pts = [LatLng(r["lat"], r["lng"]) for r in rows]
    cum = [0.0]
    for a, b in zip(pts, pts[1:]):
        cum.append(cum[-1] + haversine_km(a, b))
    from .seed_data import MRT6_TOTAL_KM

    scale = MRT6_TOTAL_KM / cum[-1] if cum[-1] else 1.0

    return [
        Station(
            id=r["id"],
            code=r["code"],
            name=r["name"],
            name_bn=r["name_bn"] or "",
            lat=r["lat"],
            lng=r["lng"],
            chainage_km=round(cum[i] * scale, 3),
            sequence=r["stop_sequence"],
            parkable_modes=tuple(r["parkable_modes"] or ()),
            has_car_parking=r["has_car_parking"],
        )
        for i, r in enumerate(rows)
    ]


async def load_farebook(region: str = "dhaka_metro") -> FareBook:
    p = db.pool()
    if p is None:
        return FareBook([FareRule.from_seed(s) for s in FARE_RULES], region=region)
    try:
        rows = await p.fetch(
            """
            SELECT mode, region, base_fare, base_km, rate_per_km, min_fare, source
              FROM fare_rules
             WHERE effective_from <= CURRENT_DATE
               AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
             ORDER BY effective_from DESC
            """
        )
    except Exception as exc:  # noqa: BLE001
        log.warning("fare query failed (%s); using seeds", exc)
        rows = []

    if not rows:
        return FareBook([FareRule.from_seed(s) for s in FARE_RULES], region=region)

    return FareBook(
        [
            FareRule(
                mode=r["mode"],
                region=r["region"],
                base_fare=float(r["base_fare"]),
                base_km=float(r["base_km"]),
                rate_per_km=float(r["rate_per_km"]),
                min_fare=float(r["min_fare"]),
                source=r["source"] or "seed estimate",
            )
            for r in rows
        ],
        region=region,
    )


async def load_places() -> list[Landmark]:
    p = db.pool()
    seeded = _SEED_LANDMARKS + _STATION_PLACES
    if p is None:
        return seeded
    try:
        rows = await p.fetch(
            """
            SELECT id, canonical, aliases,
                   ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lng
              FROM landmarks
            """
        )
    except Exception:  # noqa: BLE001
        return seeded
    if not rows:
        return seeded
    return [
        Landmark(r["id"], r["canonical"], tuple(r["aliases"] or ()), r["lat"], r["lng"])
        for r in rows
    ] + _STATION_PLACES


def resolve_place(query: str, places: list[Landmark]) -> Landmark | None:
    """Exact, then alias, then substring. No fuzzy matching in Phase 0."""
    q = query.strip().lower()
    if not q:
        return None
    for lm in places:
        if lm.canonical.lower() == q:
            return lm
    for lm in places:
        if q in [a.lower() for a in lm.aliases]:
            return lm
    for lm in places:
        if q in lm.canonical.lower() or any(q in a.lower() for a in lm.aliases):
            return lm
    return None


async def insert_trip_log(payload: dict) -> int | None:
    p = db.pool()
    if p is None:
        return None
    row = await p.fetchrow(
        """
        INSERT INTO trip_logs (mode, origin_geom, dest_geom, distance_km, fare_paid,
                               duration_min, occurred_at, raw_text, confidence, notes)
        VALUES ($1,
                ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography,
                $6, $7, $8, COALESCE($9, NOW()), $10, $11, $12)
        RETURNING id
        """,
        payload["mode"],
        payload.get("origin_lng"),
        payload.get("origin_lat"),
        payload.get("dest_lng"),
        payload.get("dest_lat"),
        payload.get("distance_km"),
        payload["fare_paid"],
        payload.get("duration_min"),
        payload.get("occurred_at"),
        payload.get("raw_text"),
        payload.get("confidence"),
        payload.get("notes"),
    )
    return row["id"] if row else None
