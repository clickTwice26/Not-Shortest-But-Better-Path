"""Cost model (PLAN.md §3).

Fare rules are versioned rows, never hardcoded constants — this module takes the
rule set as input so a crowdsourced correction changes prices with no code
change. Rickshaw is the exception: it is negotiated in distance bands, not a
linear rate, so it gets its own function.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from .seed_data import (
    METRO_MAX_FARE,
    METRO_MIN_FARE,
    METRO_RATE_PER_KM,
    SeedFareRule,
)


@dataclass(frozen=True)
class FareRule:
    mode: str
    region: str
    base_fare: float
    base_km: float
    rate_per_km: float
    min_fare: float
    source: str

    @classmethod
    def from_seed(cls, seed: SeedFareRule) -> "FareRule":
        return cls(
            mode=seed.mode,
            region=seed.region,
            base_fare=seed.base_fare,
            base_km=seed.base_km,
            rate_per_km=seed.rate_per_km,
            min_fare=seed.min_fare,
            source=seed.source,
        )


# Rickshaw fares are negotiated and round to notes, not to a per-km rate.
RICKSHAW_BANDS: list[tuple[float, float]] = [
    (1.0, 30.0),
    (2.0, 50.0),
    (3.0, 70.0),
    (4.0, 90.0),
    (5.0, 110.0),
    (6.0, 130.0),
]


def rickshaw_fare(distance_km: float) -> float:
    for limit, fare in RICKSHAW_BANDS:
        if distance_km <= limit:
            return fare
    return RICKSHAW_BANDS[-1][1]


def metro_fare(distance_km: float) -> float:
    """DMTCL structure: rate/km, floored at the minimum, rounded to BDT 10."""
    raw = METRO_RATE_PER_KM * distance_km
    rounded = round(raw / 10.0) * 10.0
    return min(METRO_MAX_FARE, max(METRO_MIN_FARE, rounded))


def linear_fare(rule: FareRule, distance_km: float) -> float:
    """base_fare covers base_km, then rate_per_km beyond it, floored at min_fare."""
    billable = max(0.0, distance_km - rule.base_km)
    fare = rule.base_fare + rule.rate_per_km * billable
    return max(rule.min_fare, fare)


class FareBook:
    """Fare rules indexed by mode, with the mode-specific quirks folded in."""

    def __init__(self, rules: list[FareRule], region: str = "dhaka_metro") -> None:
        self.region = region
        self._by_mode: dict[str, FareRule] = {}
        for rule in rules:
            if rule.region == region or rule.mode not in self._by_mode:
                self._by_mode[rule.mode] = rule

    def rule(self, mode_id: str) -> FareRule | None:
        return self._by_mode.get(mode_id)

    def source(self, mode_id: str) -> str:
        rule = self._by_mode.get(mode_id)
        if mode_id == "metro":
            return "DMTCL published fare table"
        return rule.source if rule else "seed estimate"

    def cost_bdt(self, mode_id: str, distance_km: float, *, surge: float = 1.0) -> float:
        if mode_id in ("walk", "bicycle"):
            return 0.0
        if mode_id == "metro":
            return metro_fare(distance_km)
        if mode_id == "rickshaw":
            return rickshaw_fare(distance_km)

        rule = self._by_mode.get(mode_id)
        if rule is None:
            return 0.0

        fare = linear_fare(rule, distance_km)
        if mode_id in ("car_hail", "bike_hail"):
            fare *= surge
        # Nobody quotes paisa. Round hailed/negotiated fares to BDT 5.
        if mode_id in ("cng", "car_hail", "bike_hail"):
            return math.ceil(fare / 5.0) * 5.0
        return round(fare, 2)


def default_farebook(seeds: list[SeedFareRule], region: str = "dhaka_metro") -> FareBook:
    return FareBook([FareRule.from_seed(s) for s in seeds], region=region)
