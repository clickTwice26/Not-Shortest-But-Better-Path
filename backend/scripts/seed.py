"""Load bundled seed data into Postgres.

    python -m scripts.seed        (from backend/, with the venv active)

Idempotent — safe to re-run.
"""

from __future__ import annotations

import asyncio
import pathlib
import sys

import asyncpg

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from app.config import settings  # noqa: E402
from app.network import STATIONS, fare_matrix  # noqa: E402
from app.seed_data import (  # noqa: E402
    FARE_RULES,
    LANDMARKS,
    MRT6_HEADWAY_MIN,
    MRT6_SERVICE_END,
    MRT6_SERVICE_START,
)

SCHEMA = pathlib.Path(__file__).resolve().parents[1] / "sql" / "001_schema.sql"


async def main() -> None:
    conn = await asyncpg.connect(settings.database_url)
    try:
        print("applying schema...")
        await conn.execute(SCHEMA.read_text())

        print(f"seeding {len(STATIONS)} MRT-6 stations...")
        for s in STATIONS:
            await conn.execute(
                """
                INSERT INTO transfer_nodes (id, code, name, name_bn, kind, geom,
                                            parkable_modes, has_car_parking, active)
                VALUES ($1, $2, $3, $4, 'metro_station',
                        ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography, $7, $8, TRUE)
                ON CONFLICT (id) DO UPDATE
                   SET name = EXCLUDED.name, geom = EXCLUDED.geom,
                       parkable_modes = EXCLUDED.parkable_modes
                """,
                s.id, s.code, s.name, s.name_bn, s.lng, s.lat,
                list(s.parkable_modes), s.has_car_parking,
            )
        await conn.execute(
            "SELECT setval('transfer_nodes_id_seq', (SELECT MAX(id) FROM transfer_nodes))"
        )

        print("seeding MRT-6 route + stop times...")
        route_id = await conn.fetchval(
            """
            INSERT INTO transit_routes (id, short_name, long_name, mode)
            VALUES (1, 'MRT-6', 'Uttara North - Motijheel', 'metro')
            ON CONFLICT (id) DO UPDATE SET short_name = EXCLUDED.short_name
            RETURNING id
            """
        )
        for s in STATIONS:
            await conn.execute(
                """
                INSERT INTO transit_stop_times (route_id, station_id, stop_sequence,
                                                headway_seconds, service_start, service_end)
                VALUES ($1, $2, $3, $4, $5::time, $6::time)
                ON CONFLICT (route_id, station_id) DO UPDATE
                   SET stop_sequence = EXCLUDED.stop_sequence
                """,
                route_id, s.id, s.sequence, MRT6_HEADWAY_MIN * 60,
                MRT6_SERVICE_START, MRT6_SERVICE_END,
            )

        rows = fare_matrix()
        print(f"seeding {len(rows)} metro fare pairs...")
        await conn.executemany(
            """
            INSERT INTO metro_fares (from_station_id, to_station_id, fare_bdt)
            VALUES ($1, $2, $3)
            ON CONFLICT (from_station_id, to_station_id) DO UPDATE
               SET fare_bdt = EXCLUDED.fare_bdt
            """,
            rows,
        )

        print(f"seeding {len(FARE_RULES)} fare rules...")
        await conn.execute("DELETE FROM fare_rules")
        for r in FARE_RULES:
            await conn.execute(
                """
                INSERT INTO fare_rules (mode, region, base_fare, base_km, rate_per_km,
                                        min_fare, source, effective_from)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date)
                """,
                r.mode, r.region, r.base_fare, r.base_km, r.rate_per_km,
                r.min_fare, r.source, r.effective_from,
            )

        print(f"seeding {len(LANDMARKS)} landmarks...")
        for lm in LANDMARKS:
            await conn.execute(
                """
                INSERT INTO landmarks (canonical, aliases, geom)
                VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography)
                ON CONFLICT (canonical) DO UPDATE
                   SET aliases = EXCLUDED.aliases, geom = EXCLUDED.geom
                """,
                lm.canonical, list(lm.aliases), lm.lng, lm.lat,
            )

        print("done.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
