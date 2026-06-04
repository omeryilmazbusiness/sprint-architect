#!/usr/bin/env bash
# Quick API smoke test for review builds. Usage:
#   ./scripts/smoke-api.sh                    # local http://127.0.0.1:5000
#   ./scripts/smoke-api.sh https://your-api.up.railway.app

set -euo pipefail

API_BASE="${1:-http://127.0.0.1:5000}"
PASS=0
FAIL=0

check() {
  local name="$1"
  local code="$2"
  local expect="$3"
  if [[ "$code" == "$expect" ]]; then
    echo "  OK   $name ($code)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL $name (got $code, want $expect)"
    FAIL=$((FAIL + 1))
  fi
}

echo "Smoke test → $API_BASE"
echo ""

CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$API_BASE/api/health")
check "GET /api/health" "$CODE" "200"

CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$API_BASE/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@demo.com","password":"Manager123!"}')
check "POST manager login" "$CODE" "200"

CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$API_BASE/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"Admin123!"}')
check "POST admin login" "$CODE" "200"

for KEY in PATIENT-TEST-0001 PT-4S9WQ2U6; do
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$API_BASE/v1/patient/auth/login" \
    -H "Content-Type: application/json" \
    -H "X-Healory-Review-Mode: 1" \
    -d "{\"patientKey\":\"$KEY\",\"deviceId\":\"smoke-$KEY\"}" || echo "000")
  CODE2=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$API_BASE/v1/patient/auth/login" \
    -H "Content-Type: application/json" \
    -H "X-Healory-Review-Mode: 1" \
    -d "{\"patientKey\":\"$KEY\",\"deviceId\":\"smoke-${KEY}-ipad\"}" || echo "000")
  if [[ "$KEY" == "PT-4S9WQ2U6" && "$CODE" == "200" && "$CODE2" != "200" ]]; then
    echo "  FAIL second device login $KEY (got $CODE2, want 200 — deploy server + seed)"
    FAIL=$((FAIL + 1))
  fi
  if [[ "$KEY" == "PT-4S9WQ2U6" && "$CODE" == "401" ]]; then
    echo "  SKIP guest $KEY (401 — run: npx tsx server/scripts/seedDemoGuestKey.ts)"
  else
    check "POST guest login $KEY" "$CODE" "200"
  fi
done

TOKEN=$(curl -sS -X POST "$API_BASE/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@demo.com","password":"Manager123!"}' | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).accessToken' 2>/dev/null || echo "")

if [[ -n "$TOKEN" ]]; then
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$API_BASE/v1/manager/dashboard" -H "Authorization: Bearer $TOKEN")
  check "GET manager dashboard" "$CODE" "200"
fi

CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$API_BASE/v1/patient/account/delete" \
  -H "Content-Type: application/json" 2>/dev/null || echo "000")
if [[ "$CODE" == "401" || "$CODE" == "403" ]]; then
  echo "  OK   POST /v1/patient/account/delete (no token → $CODE, route deployed)"
  PASS=$((PASS + 1))
elif [[ "$CODE" == "404" ]]; then
  echo "  WARN POST /v1/patient/account/delete → 404 (deploy latest server + db:push retention columns)"
else
  echo "  INFO POST /v1/patient/account/delete → $CODE"
fi

echo ""
echo "Optional t6 aliases (404 on older deployments is expected):"
for path in "/v1/member/auth/login" "/v1/staff/dashboard" "/v1/admin/organizations"; do
  # member login is POST-only; GET may 404 on some stacks — also probe POST
  if [[ "$path" == "/v1/member/auth/login" ]]; then
    CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$API_BASE$path" \
      -H "Content-Type: application/json" \
      -d '{"patientKey":"PATIENT-TEST-0001","deviceId":"smoke-alias"}' 2>/dev/null || echo "000")
    echo "  INFO POST $path → $CODE (expect 200 or 401, not 404 when deployed)"
    continue
  fi
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$API_BASE$path" 2>/dev/null || echo "000")
  echo "  INFO $path → $CODE"
done

echo ""
echo "Result: $PASS passed, $FAIL failed"
[[ "$FAIL" -eq 0 ]]
