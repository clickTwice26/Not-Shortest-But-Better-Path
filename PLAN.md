# Poth — Multimodal Cost-Aware Journey Planner for Dhaka

> Working name. `পথ` = path.

**One line:** Google Maps tells you the fastest way. Poth tells you that CNG to Farmgate then metro saves you ৳270 and costs you 9 minutes.

---

## 1. The Problem

Google's Routes API accepts exactly **one** `travelMode` per request — `DRIVE`, `WALK`, `BICYCLE`, `TWO_WHEELER`, or `TRANSIT`. The `TRANSIT` mode chains walking and transit internally, but that is the only mix it will ever produce. There is no "drive to the station, then take the metro," and no money dimension beyond a raw transit fare field.

So a Dhaka commuter never sees:

```
Pathao to Farmgate (৳95) → Metro to Uttara North (৳60) → Rickshaw (৳40)
= ৳195, 48 min
vs. Pathao all the way = ৳420, 71 min
```

Both cheaper *and* faster, and invisible in every existing app.

### Why nobody has built it

Not a routing problem. A **local cost-data problem**. Google can't scale "what does a rickshaw from Dhanmondi 27 to Kalabagan actually cost at 6pm" to 200 countries. That gap is the entire product.

---

## 2. Core Concept

**You are not building a routing engine.** Routing is a commodity — Valhalla does it. You are building:

1. A **transfer-point search** — which handoff points make sense for this O→D pair
2. A **cost model** — what each leg actually costs in taka
3. A **Pareto ranking** — surfacing the money/time trade-off instead of hiding it

### Algorithm

```
plan(origin O, destination D, departure_time t, vot):

  1. CANDIDATE TRANSFER NODES
     Query PostGIS for transfer nodes T where:
       dist(O,T) + dist(T,D) < 1.4 * dist(O,D)     -- ellipse, O and D as foci
     Prune to k=3 entry nodes (best access from O)
              k=3 exit nodes  (best egress to D)

  2. DIRECT BASELINES
     For each mode m in {car, bike, cng, rickshaw, bus, bicycle, walk}:
       leg = route(O, D, m)
       emit Itinerary([leg])

  3. MULTIMODAL COMBINATIONS
     For each (entry, exit) pair:
       For each access mode a, egress mode e:
         if a.requires_ownership and not entry.parkable[a]: skip
         if e.requires_ownership: skip          -- vehicle is parked at entry
         legs = [route(O, entry, a),
                 transit_lookup(entry, exit, t),
                 route(exit, D, e)]
         emit Itinerary(legs)

  4. SCORE
     For each itinerary:
       cost_bdt = sum(fare(leg) for leg in legs)
       duration = sum(leg.duration) + transfer_penalties + wait_time

  5. PARETO FILTER
     Drop any itinerary dominated on BOTH cost and duration.

  6. RANK & LABEL
     generalized_cost = cost_bdt + vot * duration_minutes
     Label: Fastest / Best Value / Cheapest
```

### Why the pruning matters

`2k` routing calls, not `k²`. With k=3 that's 6 access/egress route calls plus 9 transit lookups (pure SQL, no API). MRT-6 has 16 stations, so the ellipse filter usually leaves 4–6 candidates before k-selection.

### Complexity beyond v1

For a real multi-line network, the enumeration approach breaks down. The proper algorithm is **MCR (Multimodal Multicriteria RAPTOR)** — Delling, Dibbelt, Pajor, Wagner. Not needed until you have buses + 3 metro lines.

---

## 3. Modes & Cost Model

### Mode table

| Mode | Speed (Dhaka) | Cost model | Owned | Parkable at station |
|---|---|---|---|---|
| `walk` | 4.5 km/h | ৳0 | — | — |
| `bicycle` | 12 km/h | ৳0 | yes | yes |
| `bike_own` | 25 km/h | ~৳2.7/km fuel | yes | yes |
| `bike_hail` | 24 km/h | ~৳25 + ~৳11/km | no | — |
| `rickshaw` | 8 km/h | negotiated, distance-banded | no | — |
| `cng` | 16 km/h | ~৳40 base (2km) + ~৳12/km | no | — |
| `car_own` | 17 km/h | fuel + tolls + parking | yes | **no** |
| `car_hail` | 16 km/h | ~৳60 + ~৳24/km + surge | no | — |
| `bus` | 11 km/h | **official rate, see below** | no | — |
| `metro` | 35 km/h | published DMTCL fare table | no | — |

> ⚠️ All speeds and non-official fares are **seed estimates**. Verify against real trips before launch. Fuel: octane ~৳128/L, bike ~45 kmpl, car ~12 kmpl — **confirm current prices.**

### Two critical flags

```python
requires_ownership: bool   # own bike/car — can only appear BEFORE transit leg
parkable_at_station: bool  # bike/bicycle yes, car NO
```

**`car_own` cannot do park-and-ride in Dhaka** — MRT-6 stations lack meaningful car parking. Cars are kiss-and-ride only (drop-off). **Motorcycles can park**, which makes `bike_own → metro` the one genuine park-and-ride pattern in the city. Verify current station parking before claiming it publicly.

Getting `requires_ownership` wrong produces nonsense itineraries like "own car to station, metro, own car to destination."

### Bus — official gazetted rates

| Region | Rate/km | Min fare |
|---|---|---|
| Dhaka & Chattogram Metropolitan | ৳2.56 | ৳10 |
| DTCA areas | ৳2.43 | ৳10 |
| Inter-district (standard) | ৳2.23 | ৳8 |

```
fare = max(min_fare, rate_per_km × distance_km)
```

**Caveat:** these are a **floor, not reality.** Counter-based services (BRTC, Nagar Paribahan) stay near them. Local buses and "sitting service" routinely charge above, and conductors price by *stage*, rounding up. Treat as lower bound; let trip logs pull it upward per route.

**Key insight:** bus fares are pure distance math. You can price a bus leg **without knowing any bus routes**. Good enough for demo and v1.

### Value of time

```
generalized_cost = cost_bdt + vot_bdt_per_min × duration_min
```

Expose as a slider: *"I'm in a hurry"* ↔ *"I'm on a budget."* Typical range ৳0.5–৳8/min.

**This slider is the product.** Drag it and the recommendation flips from Pathao to CNG→metro→rickshaw. That's the thing Google structurally won't build.

---

## 4. Data Sources

### Available now, free

| Resource | Source | Note |
|---|---|---|
| OSM Bangladesh extract | Geofabrik `.pbf` | Roads, station coords |
| Valhalla | Official Docker image | Tiles build in minutes for BD |
| MapLibre GL JS | npm | Map renderer |
| Protomaps | Build `.pmtiles` from the extract | Single file on R2 |
| MRT-6 fare table | DMTCL (`dmtcl.gov.bd`) | Published, distance-based |
| Bus rates | BRTA gazette | Above — **pin the notice date** |

### Must create yourself

| Gap | Effort | Note |
|---|---|---|
| **Dhaka GTFS feed** | ~1 afternoon | **Does not exist.** Not in Mobility Database or any catalog. But MRT-6 is only 16 stations / 20.1 km / one operator — trivial to author. |
| **CNG, rickshaw, ride-hail fares** | Ongoing | No API, no dataset, nothing. Seed estimates → correct with user trip logs. |
| **Bus routes** | Large | v2. Not needed for pricing. |
| **Landmark table** | Ongoing | Fills the geocoding gap (§7) |

> **The fare data is the moat.** It's the one thing Google can't replicate at scale, and the reason this product can exist at all.

---

## 5. Legal Constraints — read before writing code

### Do not use Google Maps

Two clauses in the Maps Platform ToS make the Google path unworkable:

1. **No creating content from Maps Content.** The listed examples include building an index of tree locations from Street View imagery, and using Maps Content to train, test, validate or fine-tune ML models.
2. **No caching** beyond a narrow allowance — which breaks the Redis leg-cache that makes the k-candidate fan-out affordable.

Also: no displaying Google data on a non-Google map, and no downloading Street View tiles for storage.

Since you're doing 8–20 routing calls per query, caching is mandatory. **Go fully non-Google.** You lose Places autocomplete quality (real cost — see §7) and gain zero marginal cost, unlimited caching, and no compliance risk.

### The CV idea — parked

Vehicle detection on Street View to infer available modes: technically easy, **legally prohibited** (both clauses above), and the wrong signal anyway — imagery is months to years old, and vehicle *presence* ≠ mode *availability*. Road class from OSM gets you 90% of it in a day.

**Legal version for v3:** your own dashcam/phone footage, or Mapillary/KartaView (CC BY-SA). Fine-tune YOLO on **Poribohon-BD** or the **Dhaka-AI** dataset — local classes (rickshaw, CNG, leguna, human hauler) that COCO-trained models get badly wrong. *Verify current availability and licenses.*

---

## 6. Stack

| Layer | Choice | Why |
|---|---|---|
| Routing | **Valhalla** (Docker) | One instance, all modes (`auto`/`pedestrian`/`bicycle`/`motor_scooter`). OSRM would need 3 containers. Has a matrix endpoint for the fan-out. |
| Transit | **Just Postgres** | Do NOT run OTP for one metro line. 16 stations = two tables + a SQL lookup. Author GTFS anyway, load it into PG. |
| API | **FastAPI** | `httpx.AsyncClient` + `asyncio.gather` for the leg fan-out — difference between 400ms and 4s |
| DB | **Postgres + PostGIS** | Transfer nodes, GTFS, fare rules, trip logs |
| Cache | **Redis** | Legs keyed `(h3_origin, h3_dest, mode, time_bucket)`, h3 res 9 ≈ 170m |
| Jobs | **ARQ** | Redis-backed, async-native, lighter than Celery |
| Frontend | **Next.js 15** | |
| Map | **MapLibre GL JS** | Not Google, per §5 |
| Tiles | **Protomaps `.pmtiles` on R2** | Single file, range requests, no tile server, no egress fees |
| Geocoding | **Photon** self-hosted + own landmark table | Weakest link — see §7 |
| Deploy | **CapRover on Contabo** | 5 containers: `planner`, `valhalla`, `postgres`, `redis`, `web` |

### Explicitly skipped

- **pgRouting** — you're calling a graph, not building one
- **OpenTripPlanner** — until buses exist
- **Any CV pipeline** — v3 at earliest
- **Native mobile** — ship a PWA, wrap in Expo later

The Pareto filter is ~30 lines of plain Python. No library.

---

## 7. Gemini Integration

**Rule: Gemini at the edges — parsing messy input. Deterministic code in the middle.**

### ✅ Trip log extraction — load-bearing

Your moat depends on users logging trips. Nobody fills a 6-field form. They'll type:

> `cng e dhanmondi 27 theke farmgate 150 nilo, jam chilo tai beshi`

→ `{mode: cng, origin: "Dhanmondi 27", dest: "Farmgate", fare: 150, conditions: heavy_traffic}`

Structured output mode, one schema, batched nightly. Turns data collection from "users won't bother" into "users type one line." **Without this, crowdsourcing never reaches critical mass.**

### ✅ Banglish query parsing — best demo value

> `Farmgate theke Uttara, taka bachate chai but 40 min er beshi na`

→ `{origin, destination, vot_weight: 0.3, max_duration_min: 40}`

The user sets the VOT slider *by talking*. Code-mixed Bengali-Latin is something Gemini handles well and regex never will. Cache parsed queries in Redis on normalized text.

### ✅ Address normalization — fills the geocoding gap

Dhaka addresses are informal: *"Mirpur 10 golchottor er pashe"*, *"Bashundhara R/A block D road 5"*. Photon/Nominatim choke.

Pipeline: **Gemini normalizes informal → canonical landmark → geocode canonical against your own landmark table.**

> **Never let Gemini output coordinates.** It will confidently invent them. Translation layer, not geocoder.

### ❌ Never as the planner

Don't hand it stations and ask for the best route. It will hallucinate fares, take 2 seconds, and give different answers to identical queries. Your enumeration + Pareto filter is deterministic math in microseconds. Same for fare estimation — plausible taka numbers that are wrong, and you can't tell which.

---

## 8. Database Schema

```sql
CREATE EXTENSION postgis;

-- Transfer points: metro stations, bus terminals, major junctions
CREATE TABLE transfer_nodes (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    name_bn         TEXT,
    kind            TEXT NOT NULL,          -- metro_station | bus_terminal | junction
    geom            GEOGRAPHY(POINT, 4326) NOT NULL,
    parkable_modes  TEXT[] DEFAULT '{}',    -- {bike_own, bicycle}
    has_car_parking BOOLEAN DEFAULT FALSE,
    active          BOOLEAN DEFAULT TRUE
);
CREATE INDEX idx_nodes_geom ON transfer_nodes USING GIST (geom);

-- Versioned fare rules — NEVER hardcode these
CREATE TABLE fare_rules (
    id              SERIAL PRIMARY KEY,
    mode            TEXT NOT NULL,
    region          TEXT NOT NULL,          -- dhaka_metro | dtca | inter_district
    base_fare       NUMERIC(8,2) DEFAULT 0,
    base_km         NUMERIC(6,2) DEFAULT 0,
    rate_per_km     NUMERIC(8,3) NOT NULL,
    min_fare        NUMERIC(8,2) DEFAULT 0,
    surge_multiplier NUMERIC(4,2) DEFAULT 1.0,
    source          TEXT,                   -- 'BRTA gazette 2025-xx' | 'crowdsourced'
    effective_from  DATE NOT NULL,
    effective_to    DATE
);

-- Metro: distance-based table, not a formula
CREATE TABLE metro_fares (
    from_station_id INT REFERENCES transfer_nodes(id),
    to_station_id   INT REFERENCES transfer_nodes(id),
    fare_bdt        NUMERIC(8,2) NOT NULL,
    PRIMARY KEY (from_station_id, to_station_id)
);

-- Minimal GTFS
CREATE TABLE transit_routes (
    id          SERIAL PRIMARY KEY,
    short_name  TEXT,              -- 'MRT-6'
    long_name   TEXT,
    mode        TEXT               -- metro | bus
);

CREATE TABLE transit_stop_times (
    route_id        INT REFERENCES transit_routes(id),
    station_id      INT REFERENCES transfer_nodes(id),
    stop_sequence   INT,
    headway_seconds INT,           -- MRT-6 is headway-based, not timetabled
    service_start   TIME,
    service_end     TIME,
    PRIMARY KEY (route_id, station_id)
);

-- Ground truth. This is the moat.
CREATE TABLE trip_logs (
    id              SERIAL PRIMARY KEY,
    user_id         UUID,
    mode            TEXT NOT NULL,
    origin_geom     GEOGRAPHY(POINT, 4326),
    dest_geom       GEOGRAPHY(POINT, 4326),
    distance_km     NUMERIC(6,2),
    fare_paid       NUMERIC(8,2) NOT NULL,
    duration_min    INT,
    occurred_at     TIMESTAMPTZ NOT NULL,
    raw_text        TEXT,                   -- original Banglish input
    confidence      NUMERIC(3,2),           -- Gemini extraction confidence
    verified        BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_logs_origin ON trip_logs USING GIST (origin_geom);

-- Informal address → canonical landmark
CREATE TABLE landmarks (
    id          SERIAL PRIMARY KEY,
    canonical   TEXT NOT NULL,
    aliases     TEXT[],
    geom        GEOGRAPHY(POINT, 4326) NOT NULL
);
CREATE INDEX idx_landmarks_geom ON landmarks USING GIST (geom);
```

### The pruning query

```sql
SELECT id, name, parkable_modes,
       ST_Distance(geom, :origin) AS d_origin,
       ST_Distance(geom, :dest)   AS d_dest
FROM transfer_nodes
WHERE active
  AND kind = 'metro_station'
  AND ST_Distance(geom, :origin) + ST_Distance(geom, :dest)
      < 1.4 * ST_Distance(:origin, :dest)
ORDER BY d_origin
LIMIT 3;
```

---

## 9. API Surface

```
POST /v1/plan
  { origin: {lat,lng} | text,
    destination: {lat,lng} | text,
    departure_time: ISO8601,
    vot_bdt_per_min: 2.0,
    modes: ["cng","metro","bus","bike_hail","rickshaw"],
    owns: ["bike_own"] }
  →
  { itineraries: [
      { label: "best_value",
        cost_bdt: 195, duration_min: 48,
        legs: [ {mode, from, to, distance_km, duration_min, cost_bdt, polyline} ] } ],
    pareto_front: [...],
    cost_confidence: "estimated" }

POST /v1/trips          # Banglish text → structured log (Gemini)
GET  /v1/nodes?bbox=    # transfer nodes for map
POST /v1/parse-query    # Banglish query → structured plan request (Gemini)
```

**Always return `cost_confidence`.** Users must know which numbers are official rates vs. estimates.

---

## 10. Roadmap

### Phase 0 — Demo (50 minutes)

Cut everything. One React file, client-side, no backend.

| Min | Task |
|---|---|
| 0–10 | Data blob: 16 stations, fare constants, mode speeds |
| 10–30 | Planner function + Pareto filter |
| 30–45 | UI: three result cards + VOT slider |
| 45–50 | Deploy to Vercel, buffer |

- **No routing** — haversine × 1.3 detour factor. Nobody checks whether the leg is 4.2 or 4.6 km; they react to "৳400 vs ৳130."
- **No map** — cards beat a map under time pressure
- Add Gemini query parsing **only if** the core is solid by minute 35

**Demo moment:** drag the VOT slider, watch the recommendation flip.

**Killers to avoid:** fiddling with a map, and chasing exact fares. Label everything "estimated" and move on.

### Phase 1 — Real system (2–3 weeks)

- [ ] Valhalla on Contabo via CapRover, BD extract
- [ ] PostGIS schema + seed 16 MRT-6 stations
- [ ] Author MRT-6 GTFS feed → load to Postgres
- [ ] Fare rules seeded (bus official + metro table + estimates)
- [ ] FastAPI planner with async fan-out + Redis leg cache
- [ ] Next.js + MapLibre + Protomaps on R2
- [ ] Gemini trip-log extraction endpoint
- [ ] Trip log submission UI

### Phase 2 — Data flywheel (1–2 months)

- [ ] Fare correction pipeline: trip logs → per-route fare adjustment
- [ ] Confidence scoring per O–D pair
- [ ] Banglish query parsing
- [ ] Landmark table + address normalization
- [ ] Time-of-day fare and speed variation
- [ ] Bus route data (survey or crowdsource)

### Phase 3 — Later

- [ ] MRT Line 1 / 5N when operational
- [ ] Ride-hailing API partnerships for live pricing
- [ ] Own-footage CV: road width, rickshaw/CNG stands
- [ ] Migrate to OTP or implement MCR once the network is genuinely multi-line

---

## 11. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Fare estimates badly wrong → users lose trust | **High** | Label confidence everywhere. Ship trip logging in v1, not v2. |
| Geocoding quality without Google Places | **High** | Landmark table + Gemini normalization. Accept degradation early. |
| Nobody logs trips → no moat | **High** | Gemini extraction makes it one line of text. Consider incentives. |
| Bus gazette rates ≠ actual charged | Medium | Documented as floor; crowdsource the delta |
| MRT parking assumptions wrong | Medium | **Verify on-site before claiming publicly** |
| Valhalla RAM on Contabo | Low | BD extract is small; check box specs |
| Scope creep into CV / OTP | Medium | Explicitly deferred above. Re-read §5 and §6. |

---

## 12. Open Questions

1. Current MRT-6 fare table — need the DMTCL numbers
2. Date and exact wording of the BRTA fare notice
3. Do MRT-6 stations have motorcycle parking, and at which ones?
4. Current octane/petrol price for the own-vehicle model
5. Rickshaw fare bands — is there any published reference, or pure crowdsource?
6. Mapillary coverage density in Dhaka (for Phase 3)

---

## 13. References

- Routes API travel modes — `developers.google.com/maps/documentation/routes`
- Maps Platform ToS §3.2.4 — `cloud.google.com/maps-platform/terms`
- GTFS spec — `gtfs.org`
- Mobility Database (confirms no Dhaka feed) — `mobilitydatabase.org`
- Valhalla — `github.com/valhalla/valhalla`
- Protomaps — `protomaps.com`
- Geofabrik BD extract — `download.geofabrik.de/asia/bangladesh.html`
- MCR algorithm — Delling, Dibbelt, Pajor, Wagner, *Computing Multimodal Journeys in Practice*
- DMTCL — `dmtcl.gov.bd`

---

## The One-Paragraph Pitch

> Every routing app in Bangladesh optimizes for time and hides cost. Poth enumerates mixed-mode journeys — CNG to the metro, bike parked at the station, bus for the long leg — prices each one in taka using official rates plus crowdsourced real fares, and shows you the actual trade-off on a slider. Fastest, cheapest, and the one in between that's usually what you actually want. Google can't build this because it doesn't scale to 200 countries. We only need one city.