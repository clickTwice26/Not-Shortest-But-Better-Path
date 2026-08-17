-- Poth schema (PLAN.md §8)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Transfer points: metro stations, bus terminals, major junctions
CREATE TABLE IF NOT EXISTS transfer_nodes (
    id              SERIAL PRIMARY KEY,
    code            TEXT UNIQUE,
    name            TEXT NOT NULL,
    name_bn         TEXT,
    kind            TEXT NOT NULL,                  -- metro_station | bus_terminal | junction
    geom            GEOGRAPHY(POINT, 4326) NOT NULL,
    parkable_modes  TEXT[] DEFAULT '{}',            -- {bike_own, bicycle}
    has_car_parking BOOLEAN DEFAULT FALSE,
    active          BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_nodes_geom ON transfer_nodes USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_nodes_kind ON transfer_nodes (kind) WHERE active;

-- Versioned fare rules — never hardcode these
CREATE TABLE IF NOT EXISTS fare_rules (
    id               SERIAL PRIMARY KEY,
    mode             TEXT NOT NULL,
    region           TEXT NOT NULL,                 -- dhaka_metro | dtca | inter_district
    base_fare        NUMERIC(8,2) DEFAULT 0,
    base_km          NUMERIC(6,2) DEFAULT 0,
    rate_per_km      NUMERIC(8,3) NOT NULL,
    min_fare         NUMERIC(8,2) DEFAULT 0,
    surge_multiplier NUMERIC(4,2) DEFAULT 1.0,
    source           TEXT,                          -- 'BRTA gazette ...' | 'crowdsourced'
    effective_from   DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to     DATE
);
CREATE INDEX IF NOT EXISTS idx_fare_mode ON fare_rules (mode, region, effective_from DESC);

-- Metro: distance-based table, not a formula
CREATE TABLE IF NOT EXISTS metro_fares (
    from_station_id INT REFERENCES transfer_nodes(id) ON DELETE CASCADE,
    to_station_id   INT REFERENCES transfer_nodes(id) ON DELETE CASCADE,
    fare_bdt        NUMERIC(8,2) NOT NULL,
    PRIMARY KEY (from_station_id, to_station_id)
);

-- Minimal GTFS
CREATE TABLE IF NOT EXISTS transit_routes (
    id          SERIAL PRIMARY KEY,
    short_name  TEXT,                               -- 'MRT-6'
    long_name   TEXT,
    mode        TEXT                                -- metro | bus
);

CREATE TABLE IF NOT EXISTS transit_stop_times (
    route_id        INT REFERENCES transit_routes(id) ON DELETE CASCADE,
    station_id      INT REFERENCES transfer_nodes(id) ON DELETE CASCADE,
    stop_sequence   INT NOT NULL,
    headway_seconds INT,                            -- MRT-6 is headway-based
    service_start   TIME,
    service_end     TIME,
    PRIMARY KEY (route_id, station_id)
);

-- Ground truth. This is the moat.
CREATE TABLE IF NOT EXISTS trip_logs (
    id           SERIAL PRIMARY KEY,
    user_id      UUID,
    mode         TEXT NOT NULL,
    origin_geom  GEOGRAPHY(POINT, 4326),
    dest_geom    GEOGRAPHY(POINT, 4326),
    distance_km  NUMERIC(6,2),
    fare_paid    NUMERIC(8,2) NOT NULL,
    duration_min INT,
    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_text     TEXT,                              -- original Banglish input
    confidence   NUMERIC(3,2),                      -- Gemini extraction confidence
    notes        TEXT,
    verified     BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_logs_origin ON trip_logs USING GIST (origin_geom);
CREATE INDEX IF NOT EXISTS idx_logs_mode ON trip_logs (mode, occurred_at DESC);

-- Informal address -> canonical landmark
CREATE TABLE IF NOT EXISTS landmarks (
    id        SERIAL PRIMARY KEY,
    canonical TEXT NOT NULL UNIQUE,
    aliases   TEXT[] DEFAULT '{}',
    geom      GEOGRAPHY(POINT, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_landmarks_geom ON landmarks USING GIST (geom);
