# Deploying Poth

Everything runs in Docker. From a clean machine with Docker installed, this is
the whole process.

```bash
git clone https://github.com/<your-org>/poth.git
cd poth
cp .env.example .env        # optional — add your Gemini key
docker compose up -d --build
```

Open **http://localhost:3000**.

That's it. Compose builds the API and web images, starts Postgres+PostGIS and
Redis, waits for both to pass their healthchecks, seeds the database, and serves
the app.

---

## 1. Requirements

| Need | Version | Notes |
|---|---|---|
| Docker Engine | 24+ | Docker Desktop on macOS/Windows is fine |
| Docker Compose | v2 | `docker compose`, not `docker-compose` |
| Disk | ~6 GB free | Images plus the Postgres volume |
| RAM | 2 GB | 4 GB is comfortable |

Nothing else. No Node, no Python, no Postgres client on the host.

> **Apple Silicon / ARM64:** already handled. `docker-compose.yml` defaults to a
> multi-arch PostGIS image because the official `postgis/postgis` tags are
> amd64-only. On x86 you may switch to the official image by setting
> `POSTGIS_IMAGE=postgis/postgis:17-3.5` in `.env`.

## 2. Configuration

Everything is optional — the app runs with zero configuration.

```bash
cp .env.example .env
```

| Variable | Default | What it does |
|---|---|---|
| `GEMINI_API_KEY` | _(empty)_ | Enables Gemini parsing of Banglish. **Without it the app still works** — it falls back to a keyword heuristic and every response reports `source: "heuristic"`. |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Model used for parsing |
| `POSTGIS_IMAGE` | `imresamu/postgis:17-3.5` | Multi-arch PostGIS build |

Get a Gemini key at <https://aistudio.google.com/apikey>. After editing `.env`:

```bash
docker compose up -d
```

Confirm what's live:

```bash
curl localhost:8000/health
```

```json
{"status":"ok","postgres":true,"redis":true,"gemini":true}
```

## 3. What comes up

| Service | Container | Host port | Purpose |
|---|---|---|---|
| `web` | poth-web | 3000 | Next.js UI **and** the `/api/*` proxy |
| `api` | poth-api | 8000 | FastAPI planner |
| `postgres` | poth-postgres | 5433 | PostGIS — nodes, fares, GTFS, trip logs |
| `redis` | poth-redis | 6380 | Plan, route and geocode cache |

Host ports are deliberately offset (5433, 6380) so they don't collide with a
Postgres or Redis you already run.

**Only port 3000 needs to be public.** The browser talks to the web container,
which proxies `/api/*` to FastAPI over the internal Docker network — one origin,
one certificate, no CORS. Port 8000 is exposed only for direct API access and
the Swagger docs at <http://localhost:8000/docs>; you can drop that `ports:`
entry in production.

## 4. Seeding

The API container seeds on every start via `backend/docker-entrypoint.sh`:
16 MRT-6 stations, the 240-pair metro fare matrix, 9 fare rules and 30 Dhaka
landmarks. It is idempotent, so restarts are safe.

Seeding failure is not fatal — the API falls back to the seed data bundled in
`backend/app/seed_data.py` and keeps answering. Check it worked:

```bash
docker compose exec postgres psql -U poth -d poth -c "SELECT count(*) FROM transfer_nodes;"
```

Re-seed by hand:

```bash
docker compose exec api python -m scripts.seed
```

Skip seeding on boot with `SKIP_SEED=1` in the api environment.

## 5. Verify

```bash
curl -s -X POST localhost:3000/api/v1/plan -H 'Content-Type: application/json' -d '{"origin_text":"Dhanmondi 27","destination_text":"Uttara Sector 7","vot_bdt_per_min":2}'
```

You should get several itineraries including a mixed-mode one, plus a
`pareto_front`. Then open http://localhost:3000 and type a Banglish query into
the composer at the bottom.

## 6. Deploying to a server

Any Linux box with Docker works — a 2 vCPU / 4 GB VPS is plenty.

```bash
git clone https://github.com/<your-org>/poth.git && cd poth
cp .env.example .env && nano .env          # add GEMINI_API_KEY
docker compose up -d --build
```

Then put a reverse proxy in front of port 3000 for TLS. Caddy is the shortest
path — a two-line `Caddyfile` gets you an automatic certificate:

```
poth.example.com {
    reverse_proxy localhost:3000
}
```

With nginx, proxy `/` to `127.0.0.1:3000` and run certbot. Either way you need
**one domain**, because `/api/*` is served from the same origin.

Harden before going public:

- Remove the `ports:` block from `postgres`, `redis` and `api` so only `web` is
  reachable from outside.
- Change `POSTGRES_PASSWORD` in `docker-compose.yml` (and `DATABASE_URL` to
  match) — the default `poth:poth` is a development credential.
- Set a restart policy: `postgres` and `redis` should carry
  `restart: unless-stopped` like the app services already do.

### Managed platforms

The web and api images are ordinary containers, so Fly.io, Railway, Render or a
Kubernetes cluster all work. Two rules:

1. Set `API_ORIGIN` on the **web** service to wherever the API is reachable
   internally. It is read at runtime, so the same image works in every
   environment.
2. Point `DATABASE_URL` and `REDIS_URL` on the **api** service at your managed
   Postgres (PostGIS extension required) and Redis.

## 7. Operating it

```bash
docker compose logs -f api web        # follow logs
docker compose restart api            # restart one service
docker compose up -d --build          # redeploy after a git pull
docker compose down                   # stop (data survives)
docker compose down -v                # stop and DELETE the database
```

Clear the caches after changing fares or seed data — stale plans are served from
Redis for six hours otherwise:

```bash
docker compose exec redis redis-cli FLUSHALL
```

## 8. Troubleshooting

**`no matching manifest for linux/arm64`** — you overrode `POSTGIS_IMAGE` with
an amd64-only tag. Remove the override, or add `platform: linux/amd64` to the
postgres service.

**`No space left on device` from Postgres** — Docker's disk is full, usually
from repeated image builds. `docker builder prune -af && docker image prune -af`.

**Web returns 502 on `/api/*`** — the api container isn't up. Check
`docker compose ps` and `docker compose logs api`.

**Everything works but fares look wrong** — expected. Only metro and bus use
published rates; CNG, rickshaw and ride-hail are seed estimates. See the
verification list in [README.md](README.md) and PLAN.md §12.

**Ports already in use** — edit the `ports:` mappings in `docker-compose.yml`.
Only the host side (left of the colon) matters.

## 9. External services

The app calls these at runtime. All are free and keyless; all degrade safely.

| Service | Used for | If unreachable |
|---|---|---|
| Photon / Nominatim (OSM) | Geocoding places not in the landmark table | Falls back to the 30 seeded landmarks |
| OSRM demo server | Road distance and geometry | Falls back to haversine × 1.3 |
| Google Gemini | Banglish parsing | Falls back to keyword heuristics |

The OSRM public demo has no SLA and its usage policy discourages production
traffic. For a real deployment, run Valhalla yourself — see PLAN.md §6; the
interface in `backend/app/routing.py` is designed for that swap.
