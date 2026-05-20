#!/usr/bin/env bash
set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-healory-postgres}"
DB_NAME="${TEST_DB_NAME:-healthtour_test}"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "[db:test] Postgres container '$CONTAINER' is not running. Start with: npm run db:up"
  exit 1
fi

exists=$(docker exec "$CONTAINER" psql -U postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" || true)

if [[ "$exists" != "1" ]]; then
  echo "[db:test] Creating database ${DB_NAME}..."
  docker exec "$CONTAINER" psql -U postgres -c "CREATE DATABASE ${DB_NAME};"
else
  echo "[db:test] Database ${DB_NAME} already exists."
fi
