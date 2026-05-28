#!/usr/bin/env bash
# Apply Drizzle schema to the TEST database only (never production).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [ -z "${DATABASE_URL_TEST:-}" ]; then
  echo "[db:push:test] DATABASE_URL_TEST is not set. Add it to .env"
  exit 1
fi

echo "[db:push:test] Pushing schema to test database…"
DATABASE_URL="$DATABASE_URL_TEST" npx drizzle-kit push --force
echo "[db:push:test] Done."
