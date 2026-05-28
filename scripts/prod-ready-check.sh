#!/usr/bin/env bash
# Local prod-readiness gate (code quality). Deploy is separate — see docs/PROD_READY_TASKS.md.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Healory prod-ready check (local) ==="
echo ""

fail=0

run() {
  local name="$1"
  shift
  echo "→ $name"
  if "$@"; then
    echo "  ✅ $name"
  else
    echo "  ❌ $name"
    fail=1
  fi
  echo ""
}

run "typecheck" npm run typecheck
run "eslint (app/server source)" npx eslint . --quiet --ignore-pattern 'server_dist/**'
run "db:push:test" npm run db:push:test
run "vitest" env NODE_ENV=test npx vitest run

if [ "${SMOKE_API_BASE:-}" != "" ]; then
  run "smoke API ($SMOKE_API_BASE)" bash scripts/smoke-api.sh "$SMOKE_API_BASE"
else
  echo "→ smoke API (skipped — set SMOKE_API_BASE to run, e.g. production URL)"
  echo ""
fi

if [ "$fail" -ne 0 ]; then
  echo "=== FAILED — fix issues above before deploy ==="
  exit 1
fi

echo "=== PASSED local gates ==="
echo ""
echo "Deploy still required for production:"
echo "  1. git push main  (CD deploys server_dist)"
echo "  2. Prod DB: npm run db:push  (with production DATABASE_URL)"
echo "  3. ALLOW_PROD_DEMO_SEED=1 npm run db:seed:demo-guest"
echo "  4. npm run smoke:api:prod  (expect account/delete → 401, PT-4S9WQ2U6 → 200)"
echo "  5. EAS production build + App Store metadata/screenshots"
