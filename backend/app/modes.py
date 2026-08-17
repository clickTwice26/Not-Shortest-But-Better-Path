"""Mode table (PLAN.md §3).

Two flags carry the real weight:

``requires_ownership`` — an owned vehicle can only appear BEFORE a transit leg,
because it is parked at the station. Getting this wrong emits nonsense like
"own car to station, metro, own car to destination".

``parkable_at_station`` — motorcycles and bicycles yes, cars NO. MRT-6 stations
have no meaningful car parking, so ``car_own`` is kiss-and-ride only and cannot
open a park-and-ride itinerary.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

ModeId = Literal[
    "walk",
    "bicycle",
    "bike_own",
    "bike_hail",
    "rickshaw",
    "cng",
    "car_own",
    "car_hail",
    "bus",
    "metro",
]

Confidence = Literal["official", "estimated", "crowdsourced"]


MAX_COMFORT = 5.0


@dataclass(frozen=True)
class Mode:
    id: str
    label: str
    label_bn: str
    icon: str
    speed_kmh: float
    requires_ownership: bool = False
    parkable_at_station: bool = False
    # Time spent finding/hailing the vehicle before it moves.
    wait_min: float = 0.0
    # Sanity envelope — nobody walks 9 km or takes a rickshaw across Dhaka.
    min_km: float = 0.0
    max_km: float = 1e9
    confidence: Confidence = "estimated"
    # 1 = standing in a packed non-AC bus, 5 = seated in AC.
    # Without this the planner always lands on the bus, because the bus is
    # always cheapest and money alone cannot express why people avoid it.
    comfort: float = 3.0
    comfort_note: str = ""

    @property
    def discomfort(self) -> float:
        """0 (best) to 1 (worst), for the generalized-cost penalty."""
        return (MAX_COMFORT - self.comfort) / (MAX_COMFORT - 1.0)


MODES: dict[str, Mode] = {
    "walk": Mode(
        id="walk", label="Walk", label_bn="হাঁটা", icon="walk",
        speed_kmh=4.5, max_km=3.0, confidence="official",
    ),
    "bicycle": Mode(
        id="bicycle", label="Bicycle", label_bn="সাইকেল", icon="bike",
        speed_kmh=12.0, requires_ownership=True, parkable_at_station=True,
        max_km=15.0, confidence="official",
    ),
    "bike_own": Mode(
        id="bike_own", label="Own motorbike", label_bn="নিজের বাইক", icon="motorbike",
        speed_kmh=25.0, requires_ownership=True, parkable_at_station=True,
        wait_min=2.0, max_km=40.0,
    ),
    "bike_hail": Mode(
        id="bike_hail", label="Bike (Pathao/Uber)", label_bn="বাইক", icon="motorbike",
        speed_kmh=24.0, wait_min=5.0, min_km=0.8, max_km=40.0,
    ),
    "rickshaw": Mode(
        id="rickshaw", label="Rickshaw", label_bn="রিকশা", icon="rickshaw",
        speed_kmh=8.0, wait_min=3.0, min_km=0.3, max_km=6.0,
    ),
    "cng": Mode(
        id="cng", label="CNG auto-rickshaw", label_bn="সিএনজি", icon="auto",
        speed_kmh=16.0, wait_min=6.0, min_km=1.0, max_km=30.0,
    ),
    "car_own": Mode(
        id="car_own", label="Own car", label_bn="নিজের গাড়ি", icon="car",
        speed_kmh=17.0, requires_ownership=True, parkable_at_station=False,
        wait_min=3.0, max_km=60.0,
    ),
    "car_hail": Mode(
        id="car_hail", label="Car (Uber/Pathao)", label_bn="কার", icon="car",
        speed_kmh=16.0, wait_min=7.0, min_km=1.0, max_km=60.0,
    ),
    "bus": Mode(
        id="bus", label="Bus", label_bn="বাস", icon="bus",
        speed_kmh=11.0, wait_min=8.0, min_km=1.5, max_km=40.0, confidence="official",
    ),
    "metro": Mode(
        id="metro", label="Metro (MRT-6)", label_bn="মেট্রোরেল", icon="metro",
        speed_kmh=35.0, confidence="official",
    ),
}

# Modes a user can be routed on outside a transit leg.
STREET_MODES: tuple[str, ...] = (
    "walk", "bicycle", "bike_own", "bike_hail", "rickshaw", "cng", "car_own", "car_hail", "bus",
)

DEFAULT_MODES: tuple[str, ...] = ("walk", "rickshaw", "cng", "bike_hail", "car_hail", "bus", "metro")


def get_mode(mode_id: str) -> Mode:
    try:
        return MODES[mode_id]
    except KeyError as exc:  # pragma: no cover - guarded at the API boundary
        raise ValueError(f"unknown mode: {mode_id}") from exc


def is_usable(mode_id: str, distance_km: float) -> bool:
    mode = get_mode(mode_id)
    return mode.min_km <= distance_km <= mode.max_km


def duration_min(mode_id: str, distance_km: float) -> float:
    mode = get_mode(mode_id)
    return (distance_km / mode.speed_kmh) * 60.0
