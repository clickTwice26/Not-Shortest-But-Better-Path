"""The transit network.

One metro line, 16 stations, one operator. That is two lists and a lookup — not
a reason to run OpenTripPlanner (PLAN.md §6). Chainage is derived from the
station coordinates and scaled to the published route length, so the fare matrix
stays self-consistent with whatever coordinates are loaded.
"""

from __future__ import annotations

from dataclasses import dataclass

from .fares import metro_fare
from .geo import LatLng, haversine_km
from .seed_data import (
    MRT6_AVG_SPEED_KMH,
    MRT6_HEADWAY_MIN,
    MRT6_STATIONS,
    MRT6_TOTAL_KM,
    SeedStation,
)

# Getting from the street to the platform, and back out again.
STATION_ENTRY_MIN = 3.0
STATION_EXIT_MIN = 2.0
# Headway-based service: expected wait is half the headway.
METRO_WAIT_MIN = MRT6_HEADWAY_MIN / 2.0
# Dwell time per intermediate station.
STATION_DWELL_MIN = 0.4


@dataclass(frozen=True)
class Station:
    id: int
    code: str
    name: str
    name_bn: str
    lat: float
    lng: float
    chainage_km: float
    sequence: int
    parkable_modes: tuple[str, ...]
    has_car_parking: bool
    kind: str = "metro_station"

    @property
    def point(self) -> LatLng:
        return LatLng(lat=self.lat, lng=self.lng)


def _build_stations(seeds: list[SeedStation]) -> list[Station]:
    raw: list[float] = [0.0]
    for prev, cur in zip(seeds, seeds[1:]):
        raw.append(raw[-1] + haversine_km(LatLng(prev.lat, prev.lng), LatLng(cur.lat, cur.lng)))

    # Straight-line chainage understates track length; scale to the published total.
    scale = MRT6_TOTAL_KM / raw[-1] if raw[-1] > 0 else 1.0

    return [
        Station(
            id=i + 1,
            code=s.code,
            name=s.name,
            name_bn=s.name_bn,
            lat=s.lat,
            lng=s.lng,
            chainage_km=round(raw[i] * scale, 3),
            sequence=i,
            parkable_modes=s.parkable_modes,
            has_car_parking=s.has_car_parking,
        )
        for i, s in enumerate(seeds)
    ]


STATIONS: list[Station] = _build_stations(MRT6_STATIONS)
STATIONS_BY_ID: dict[int, Station] = {s.id: s for s in STATIONS}
STATIONS_BY_CODE: dict[str, Station] = {s.code: s for s in STATIONS}


@dataclass(frozen=True)
class TransitLeg:
    from_station: Station
    to_station: Station
    distance_km: float
    ride_min: float
    wait_min: float
    access_min: float
    fare_bdt: float
    stops: int

    @property
    def duration_min(self) -> float:
        return self.ride_min + self.wait_min + self.access_min


def transit_lookup(entry: Station, exit_: Station) -> TransitLeg | None:
    """Price and time a metro ride. Returns None for a non-trip."""
    if entry.id == exit_.id:
        return None

    distance_km = abs(exit_.chainage_km - entry.chainage_km)
    stops = abs(exit_.sequence - entry.sequence)
    ride_min = (distance_km / MRT6_AVG_SPEED_KMH) * 60.0 + max(0, stops - 1) * STATION_DWELL_MIN

    return TransitLeg(
        from_station=entry,
        to_station=exit_,
        distance_km=round(distance_km, 2),
        ride_min=ride_min,
        wait_min=METRO_WAIT_MIN,
        access_min=STATION_ENTRY_MIN + STATION_EXIT_MIN,
        fare_bdt=metro_fare(distance_km),
        stops=stops,
    )


def fare_matrix() -> list[tuple[int, int, float]]:
    """Full 16x16 fare table, for seeding ``metro_fares``."""
    rows: list[tuple[int, int, float]] = []
    for a in STATIONS:
        for b in STATIONS:
            if a.id == b.id:
                continue
            rows.append((a.id, b.id, metro_fare(abs(b.chainage_km - a.chainage_km))))
    return rows
