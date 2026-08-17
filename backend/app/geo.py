"""Geometry helpers.

Phase 0 has no routing engine (PLAN.md §10): road distance is haversine with a
detour factor. Swapping in Valhalla means replacing ``road_km``/``leg_geometry``
only — nothing else in the planner touches coordinates.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

EARTH_RADIUS_KM = 6371.0088

# Dhaka street grid is dense and indirect; straight-line * 1.3 is the Phase 0
# stand-in for a real route call.
DETOUR_FACTOR = 1.30


@dataclass(frozen=True)
class LatLng:
    lat: float
    lng: float

    def as_tuple(self) -> tuple[float, float]:
        return (self.lat, self.lng)


def haversine_km(a: LatLng, b: LatLng) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, (a.lat, a.lng, b.lat, b.lng))
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(h))


def road_km(a: LatLng, b: LatLng) -> float:
    """Approximate on-road distance. Replace with Valhalla in Phase 1."""
    return haversine_km(a, b) * DETOUR_FACTOR


def leg_geometry(a: LatLng, b: LatLng) -> list[list[float]]:
    """Straight [lng, lat] pair — placeholder for a decoded route polyline."""
    return [[a.lng, a.lat], [b.lng, b.lat]]


def interpolate(a: LatLng, b: LatLng, t: float) -> LatLng:
    return LatLng(lat=a.lat + (b.lat - a.lat) * t, lng=a.lng + (b.lng - a.lng) * t)
