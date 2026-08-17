"""The planner (PLAN.md §2).

    1. candidate transfer nodes   -- ellipse prune, O and D as foci
    2. direct baselines           -- one itinerary per single mode
    3. multimodal combinations    -- access mode x transit x egress mode
    4. score                      -- taka and minutes
    5. Pareto filter              -- drop anything dominated on BOTH
    6. rank and label             -- Fastest / Best Value / Cheapest

Deterministic arithmetic, microseconds, same answer every time. This is
explicitly NOT a job for an LLM (PLAN.md §7).
"""

from __future__ import annotations

import itertools
from dataclasses import dataclass, field

from .fares import FareBook
from .geo import LatLng, road_km
from .modes import STREET_MODES, get_mode, is_usable
from .modes import duration_min as mode_duration_min
from .network import STATIONS, Station, transit_lookup
from .routing import RouteLeg, estimate, pair_key, route_matrix

# Cost of a mode change beyond the vehicle's own wait: finding the stand,
# crossing the road, the general friction of switching.
TRANSFER_PENALTY_MIN = 2.0


@dataclass
class Leg:
    mode: str
    from_name: str
    to_name: str
    from_point: LatLng
    to_point: LatLng
    distance_km: float
    duration_min: float
    wait_min: float
    cost_bdt: float
    cost_source: str
    geometry: list[list[float]] = field(default_factory=list)

    def to_dict(self) -> dict:
        mode = get_mode(self.mode)
        return {
            "mode": self.mode,
            "mode_label": mode.label,
            "mode_label_bn": mode.label_bn,
            "icon": mode.icon,
            "from_name": self.from_name,
            "to_name": self.to_name,
            "from_point": {"lat": self.from_point.lat, "lng": self.from_point.lng},
            "to_point": {"lat": self.to_point.lat, "lng": self.to_point.lng},
            "distance_km": round(self.distance_km, 2),
            "duration_min": round(self.duration_min),
            "wait_min": round(self.wait_min),
            "cost_bdt": round(self.cost_bdt),
            "cost_source": self.cost_source,
            "geometry": self.geometry,
        }


@dataclass
class Itinerary:
    id: str
    legs: list[Leg]
    cost_bdt: float
    duration_min: float
    transfers: int
    kind: str  # "direct" | "multimodal"
    label: str | None = None
    generalized_cost: float = 0.0
    savings_vs_fastest: float = 0.0
    minutes_vs_fastest: float = 0.0

    @property
    def confidence(self) -> str:
        sources = {leg.cost_source for leg in self.legs if leg.cost_bdt > 0}
        if not sources:
            return "official"
        if all("estimate" not in s.lower() for s in sources):
            return "official"
        if any("crowdsourced" in s.lower() for s in sources):
            return "crowdsourced"
        return "estimated"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "label": self.label,
            "kind": self.kind,
            "cost_bdt": round(self.cost_bdt),
            "duration_min": round(self.duration_min),
            "transfers": self.transfers,
            "generalized_cost": round(self.generalized_cost, 1),
            "savings_vs_fastest": round(self.savings_vs_fastest),
            "minutes_vs_fastest": round(self.minutes_vs_fastest),
            "cost_confidence": self.confidence,
            "summary": " → ".join(get_mode(leg.mode).label for leg in self.legs),
            "legs": [leg.to_dict() for leg in self.legs],
        }


@dataclass
class PlanRequest:
    origin: LatLng
    origin_name: str
    destination: LatLng
    destination_name: str
    vot_bdt_per_min: float = 2.0
    modes: tuple[str, ...] = ()
    owns: tuple[str, ...] = ()
    surge: float = 1.0
    max_duration_min: float | None = None
    max_cost_bdt: float | None = None


# ---------------------------------------------------------------------------
# 1. Candidate transfer nodes
# ---------------------------------------------------------------------------


def candidate_nodes(
    req: PlanRequest,
    stations: list[Station],
    *,
    ellipse_factor: float = 1.4,
    max_entry: int = 3,
    max_exit: int = 3,
) -> tuple[list[Station], list[Station]]:
    """Ellipse prune with O and D as foci, then keep the k best on each side.

    Gives 2k routing calls instead of k^2. In Postgres this is the ST_Distance
    query in PLAN.md §8; here it is the same arithmetic in memory.
    """
    od = road_km(req.origin, req.destination)
    if od <= 0:
        return [], []

    budget = ellipse_factor * od
    viable: list[tuple[Station, float, float]] = []
    for st in stations:
        d_o = road_km(req.origin, st.point)
        d_d = road_km(st.point, req.destination)
        if d_o + d_d <= budget:
            viable.append((st, d_o, d_d))

    entries = [s for s, _, _ in sorted(viable, key=lambda x: x[1])[:max_entry]]
    exits = [s for s, _, _ in sorted(viable, key=lambda x: x[2])[:max_exit]]
    return entries, exits


# ---------------------------------------------------------------------------
# 2 & 3. Build itineraries
# ---------------------------------------------------------------------------


Routes = dict[tuple, RouteLeg]


def _street_leg(
    mode_id: str,
    a: LatLng,
    b: LatLng,
    a_name: str,
    b_name: str,
    fares: FareBook,
    surge: float,
    routes: Routes | None = None,
) -> Leg | None:
    route = (routes or {}).get(pair_key(a, b)) or estimate(a, b)
    distance = route.distance_km
    if not is_usable(mode_id, distance):
        return None

    mode = get_mode(mode_id)
    # Distance comes from the router; duration does not — a generic router's
    # speeds are badly wrong for Dhaka.
    ride = mode_duration_min(mode_id, distance)
    return Leg(
        mode=mode_id,
        from_name=a_name,
        to_name=b_name,
        from_point=a,
        to_point=b,
        distance_km=distance,
        duration_min=ride + mode.wait_min,
        wait_min=mode.wait_min,
        cost_bdt=fares.cost_bdt(mode_id, distance, surge=surge),
        cost_source=fares.source(mode_id),
        geometry=route.geometry,
    )


def _metro_geometry(entry: Station, exit_: Station, stations: list[Station]) -> list[list[float]]:
    """Trace the line through every station actually passed through."""
    lo, hi = sorted((entry.sequence, exit_.sequence))
    span = [s for s in stations if lo <= s.sequence <= hi]
    span.sort(key=lambda s: s.sequence, reverse=entry.sequence > exit_.sequence)
    return [[s.lng, s.lat] for s in span]


def _transit_leg(
    entry: Station, exit_: Station, fares: FareBook, stations: list[Station]
) -> Leg | None:
    ride = transit_lookup(entry, exit_)
    if ride is None:
        return None
    return Leg(
        mode="metro",
        from_name=entry.name,
        to_name=exit_.name,
        from_point=entry.point,
        to_point=exit_.point,
        distance_km=ride.distance_km,
        duration_min=ride.duration_min,
        wait_min=ride.wait_min,
        cost_bdt=ride.fare_bdt,
        cost_source=fares.source("metro"),
        geometry=_metro_geometry(entry, exit_, stations),
    )


def _assemble(legs: list[Leg], kind: str, idx: int) -> Itinerary:
    cost = sum(leg.cost_bdt for leg in legs)
    transfers = max(0, len(legs) - 1)
    duration = sum(leg.duration_min for leg in legs) + transfers * TRANSFER_PENALTY_MIN
    signature = "-".join(leg.mode for leg in legs)
    return Itinerary(
        id=f"{signature}-{idx}",
        legs=legs,
        cost_bdt=cost,
        duration_min=duration,
        transfers=transfers,
        kind=kind,
    )


def build_itineraries(
    req: PlanRequest,
    fares: FareBook,
    stations: list[Station],
    routes: Routes | None = None,
) -> list[Itinerary]:
    allowed = set(req.modes) if req.modes else set(STREET_MODES) | {"metro"}
    owns = set(req.owns)
    out: list[Itinerary] = []
    counter = itertools.count()

    def usable_street(mode_id: str) -> bool:
        if mode_id not in allowed:
            return False
        mode = get_mode(mode_id)
        # You cannot ride a motorbike you do not own.
        return not mode.requires_ownership or mode_id in owns

    # --- 2. direct baselines -------------------------------------------------
    for mode_id in STREET_MODES:
        if not usable_street(mode_id):
            continue
        leg = _street_leg(
            mode_id, req.origin, req.destination,
            req.origin_name, req.destination_name, fares, req.surge, routes,
        )
        if leg:
            out.append(_assemble([leg], "direct", next(counter)))

    # --- 3. multimodal combinations -----------------------------------------
    if "metro" in allowed:
        entries, exits = candidate_nodes(req, stations)
        access_modes = [m for m in STREET_MODES if usable_street(m)]
        # An owned vehicle is parked at the entry station, so egress must be
        # something you do not have to own.
        egress_modes = [
            m for m in access_modes if not get_mode(m).requires_ownership
        ]

        for entry, exit_ in itertools.product(entries, exits):
            if entry.id == exit_.id:
                continue
            transit = _transit_leg(entry, exit_, fares, stations)
            if transit is None:
                continue

            for access_id, egress_id in itertools.product(access_modes, egress_modes):
                access_mode = get_mode(access_id)
                if access_mode.requires_ownership:
                    # Can this vehicle actually be left at the station?
                    if not access_mode.parkable_at_station:
                        continue
                    if access_id not in entry.parkable_modes:
                        continue

                access = _street_leg(
                    access_id, req.origin, entry.point,
                    req.origin_name, entry.name, fares, req.surge, routes,
                )
                if access is None:
                    continue
                egress = _street_leg(
                    egress_id, exit_.point, req.destination,
                    exit_.name, req.destination_name, fares, req.surge, routes,
                )
                if egress is None:
                    continue

                out.append(_assemble([access, transit, egress], "multimodal", next(counter)))

    return out


# ---------------------------------------------------------------------------
# 5. Pareto filter
# ---------------------------------------------------------------------------


def pareto_front(itineraries: list[Itinerary]) -> list[Itinerary]:
    """Keep only itineraries not beaten on cost AND time simultaneously."""
    front: list[Itinerary] = []
    for cand in itineraries:
        dominated = False
        for other in itineraries:
            if other is cand:
                continue
            cheaper_or_equal = other.cost_bdt <= cand.cost_bdt
            faster_or_equal = other.duration_min <= cand.duration_min
            strictly_better = other.cost_bdt < cand.cost_bdt or other.duration_min < cand.duration_min
            if cheaper_or_equal and faster_or_equal and strictly_better:
                dominated = True
                break
        if not dominated:
            front.append(cand)

    # Two options with identical cost and time add nothing; keep the simpler one.
    seen: dict[tuple[int, int], Itinerary] = {}
    for it in front:
        key = (round(it.cost_bdt), round(it.duration_min))
        if key not in seen or len(it.legs) < len(seen[key].legs):
            seen[key] = it
    return sorted(seen.values(), key=lambda i: i.duration_min)


# ---------------------------------------------------------------------------
# 6. Rank and label
# ---------------------------------------------------------------------------


def rank_and_label(front: list[Itinerary], vot: float) -> list[Itinerary]:
    if not front:
        return []

    for it in front:
        it.generalized_cost = it.cost_bdt + vot * it.duration_min

    fastest = min(front, key=lambda i: i.duration_min)
    cheapest = min(front, key=lambda i: i.cost_bdt)

    for it in front:
        it.savings_vs_fastest = fastest.cost_bdt - it.cost_bdt
        it.minutes_vs_fastest = it.duration_min - fastest.duration_min

    # Assign in priority order so one itinerary never takes two badges.
    fastest.label = "fastest"
    if cheapest.label is None:
        cheapest.label = "cheapest"

    # "Best value" is the one in between — the option people actually want. If
    # the lowest generalized cost is already the fastest or the cheapest, that
    # badge would vanish, so pick the best of what is left instead.
    remaining = [i for i in front if i.label is None]
    if remaining:
        min(remaining, key=lambda i: i.generalized_cost).label = "best_value"

    return sorted(front, key=lambda i: i.generalized_cost)


async def plan(req: PlanRequest, fares: FareBook, stations: list[Station] | None = None) -> dict:
    stations = stations if stations is not None else STATIONS

    # Prune with cheap haversine first, then fetch real routes only for the
    # pairs that survived: 2k + 1 calls, not k^2.
    entries, exits = candidate_nodes(req, stations)
    pairs: list[tuple[LatLng, LatLng]] = [(req.origin, req.destination)]
    pairs += [(req.origin, st.point) for st in entries]
    pairs += [(st.point, req.destination) for st in exits]
    routes = await route_matrix(pairs)

    all_itineraries = build_itineraries(req, fares, stations, routes)
    front = pareto_front(all_itineraries)

    if req.max_duration_min is not None:
        within = [i for i in front if i.duration_min <= req.max_duration_min]
        # A hard filter that empties the board is worse than no filter.
        front = within or front
    if req.max_cost_bdt is not None:
        within = [i for i in front if i.cost_bdt <= req.max_cost_bdt]
        front = within or front

    ranked = rank_and_label(front, req.vot_bdt_per_min)

    # Labels collapse when one itinerary is both cheapest and best value. Always
    # offer three cards, topping up from the ranking — the mixed-mode option
    # sitting just behind the winner is the whole reason this app exists.
    recommended = [i for i in ranked if i.label]
    for it in ranked:
        if len(recommended) >= 3:
            break
        if it not in recommended:
            recommended.append(it)

    confidences = {i.confidence for i in ranked}
    overall = "official" if confidences == {"official"} else "estimated"

    return {
        "origin": {"name": req.origin_name, "lat": req.origin.lat, "lng": req.origin.lng},
        "destination": {
            "name": req.destination_name,
            "lat": req.destination.lat,
            "lng": req.destination.lng,
        },
        "vot_bdt_per_min": req.vot_bdt_per_min,
        "itineraries": [i.to_dict() for i in sorted(recommended, key=lambda x: x.generalized_cost)],
        "pareto_front": [i.to_dict() for i in ranked],
        "considered": len(all_itineraries),
        "cost_confidence": overall,
        "geometry_source": (
            "osrm" if any(r.source == "osrm" for r in routes.values()) else "estimate"
        ),
        "disclaimer": (
            "Metro and bus use published rates. CNG, rickshaw and ride-hail fares are "
            "seed estimates corrected by user trip logs."
        ),
    }
