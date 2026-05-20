#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "No .env found — copying .env.local.example → .env"
  cp .env.local.example .env
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

echo "Starting PostgreSQL (Docker)..."
docker compose up -d

echo "Waiting for database..."
for i in {1..30}; do
  if docker compose exec -T postgres pg_isready -U postgres -d healthtour >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "Applying schema..."
npm run db:migrate

echo "Seeding (idempotent)..."
npm run db:seed

cleanup() {
  echo ""
  echo "Stopping dev processes..."
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting API server on port ${PORT:-5000}..."
npm run server:dev &
SERVER_PID=$!

sleep 2

echo "Starting Expo (press i for iOS Simulator)..."
echo "API: ${EXPO_PUBLIC_API_URL:-http://127.0.0.1:5000}"
npx expo start
