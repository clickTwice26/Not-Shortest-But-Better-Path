#!/bin/sh
set -e

# Compose gates on the healthchecks, but a healthy Postgres can still be a
# beat away from accepting queries. Seeding is idempotent, so a failure here
# is logged and the API starts anyway — it falls back to bundled seed data.
if [ "${SKIP_SEED:-0}" != "1" ]; then
  echo "[entrypoint] seeding database..."
  python -m scripts.seed || echo "[entrypoint] seed failed; starting with bundled seed data"
fi

exec "$@"
