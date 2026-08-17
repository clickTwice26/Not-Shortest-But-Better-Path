# Poth — পথ

**Google Maps tells you the fastest way. Poth tells you that CNG to Farmgate then metro saves you ৳270 and costs you 9 minutes.**

Design doc: [PLAN.md](PLAN.md). This repo implements Phase 0/1 of it.

---

## Run it

Three terminals. The backend answers with bundled seed data even if Postgres and
Redis are down, so you can skip step 1 for a quick demo.

### 1. Infrastructure (optional but recommended)

```bash
docker compose up -d
```

Postgres+PostGIS on `5433`, Redis on `6380` — offset ports so they don't collide
with anything already running.

### 2. Backend

```bash
cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python -m scripts.seed && uvicorn app.main:app --reload --port 8000
```

Docs at http://localhost:8000/docs, health at http://localhost:8000/health.

### 3. Frontend

```bash
cd web && npm install && npm run dev
```

http://localhost:3000

### Gemini (optional)

```bash
echo "GEMINI_API_KEY=your_key" >> backend/.env
```

Without a key, Banglish parsing falls back to a keyword heuristic and everything
still works — the response tells you which path ran via `source`.

---

## What is actually built

| Piece | State |
|---|---|
| Transfer-node ellipse prune | ✅ `backend/app/planner.py` |
| Direct + multimodal enumeration | ✅ ~220 itineraries per query |
| Ownership / parkability constraints | ✅ `backend/app/modes.py` |
| Cost model (official + estimated) | ✅ `backend/app/fares.py` |
| Pareto filter + VOT ranking | ✅ `backend/app/planner.py` |
| MRT-6 network + fare matrix | ✅ 16 stations, `backend/app/network.py` |
| PostGIS schema + seeder | ✅ `backend/sql/`, `backend/scripts/seed.py` |
| Redis plan cache | ✅ `backend/app/cache.py` |
| Gemini query + trip parsing | ✅ `backend/app/gemini.py`, heuristic fallback |
| Next.js + MUI M3 frontend | ✅ `web/` |
| Valhalla routing | ❌ haversine × 1.3 placeholder (`backend/app/geo.py`) |
| Map rendering | ❌ Phase 1 — MapLibre + Protomaps |
| Fare correction from trip logs | ❌ Phase 2 |

## Architecture

```
Next.js 15 + MUI (M3 tonal palettes)
        │  POST /v1/plan
        ▼
FastAPI ──► Redis  (plan cache, coord-snapped keys)
        ├─► Postgres + PostGIS  (nodes, fares, GTFS, trip logs)
        └─► Gemini  (Banglish → structured, edges only)
```

**Gemini at the edges, deterministic code in the middle.** It parses messy input
and extracts trip logs. It never plans a route, never estimates a fare, never
emits coordinates.

## The demo

1. Land on Dhanmondi 27 → Uttara Sector 7. The headline shows the saving.
2. Drag the value-of-time slider. The recommendation flips between a ride-hail
   and a mixed CNG/metro/rickshaw chain — that flip is the product.
3. Open the Pareto chart: every point is an option nothing else beats on both
   money and time.
4. Log a trip in Banglish: `cng e dhanmondi 27 theke farmgate 150 nilo, jam chilo tai beshi`.

## Numbers you must verify before this is public

Everything marked `seed estimate` in `backend/app/seed_data.py`, plus:

- The current DMTCL MRT-6 fare table (code assumes ৳5/km, ৳20 min, ৳100 max)
- The BRTA bus gazette date and rates
- Which MRT-6 stations actually have motorcycle parking
- Current octane price for the own-vehicle model
- Station coordinates (approximate centroids)

Open questions are tracked in [PLAN.md §12](PLAN.md).

## API

| Endpoint | Purpose |
|---|---|
| `POST /v1/plan` | The planner |
| `POST /v1/plan/natural` | Banglish text → parse → plan, one call |
| `POST /v1/parse-query` | Banglish → structured plan request |
| `POST /v1/trips/parse` | Banglish → structured trip, for review |
| `POST /v1/trips/log-text` | Parse and store in one call |
| `POST /v1/trips` | Structured trip submission |
| `GET /v1/stations` | MRT-6 stations |
| `GET /v1/places` | Landmark search |
| `GET /v1/modes` | Mode table |
