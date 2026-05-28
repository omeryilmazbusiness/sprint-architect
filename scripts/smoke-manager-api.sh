#!/usr/bin/env bash
# Manager API smoke — exercises read + critical write paths for prod readiness.
# Usage: ./scripts/smoke-manager-api.sh [baseUrl]
# Example: ./scripts/smoke-manager-api.sh http://127.0.0.1:5001

set -euo pipefail

API_BASE="${1:-http://127.0.0.1:5001}"
PASS=0
FAIL=0
SKIP=0

check_code() {
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

req() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local auth="${4:-}"
  local extra=()
  if [[ -n "$auth" ]]; then
    extra+=(-H "Authorization: Bearer $auth")
  fi
  if [[ -n "$body" ]]; then
    extra+=(-H "Content-Type: application/json" -d "$body")
  fi
  curl -sS -w "\n%{http_code}" -X "$method" "$API_BASE$path" "${extra[@]}" 2>/dev/null || printf "\n000"
}

echo "=== Manager API smoke → $API_BASE ==="
echo ""

# Health
CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$API_BASE/api/health" 2>/dev/null || echo "000")
check_code "GET /api/health" "$CODE" "200"

# Login
LOGIN_RESP=$(curl -sS -X POST "$API_BASE/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@demo.com","password":"Manager123!"}' 2>/dev/null || echo '{}')
TOKEN=$(printf '%s' "$LOGIN_RESP" | node -pe 'try{JSON.parse(require("fs").readFileSync(0,"utf8")).accessToken}catch{e=>""}' 2>/dev/null || echo "")

if [[ -z "$TOKEN" ]]; then
  echo "  FAIL manager login (no token — run: npm run db:seed)"
  FAIL=$((FAIL + 1))
  echo ""
  echo "Result: $PASS passed, $FAIL failed, $SKIP skipped"
  exit 1
fi
echo "  OK   manager login"
PASS=$((PASS + 1))

# --- Read endpoints (manager surface) ---
READ_PATHS=(
  "/v1/manager/dashboard"
  "/v1/manager/patients?page=1&pageSize=5"
  "/v1/manager/patients/doc-summaries"
  "/v1/manager/doctors"
  "/v1/manager/hotels"
  "/v1/manager/transports"
  "/v1/manager/document-types"
  "/v1/manager/appointments"
  "/v1/manager/metrics"
  "/v1/manager/clinic-info"
  "/v1/manager/invoices"
  "/v1/manager/notifications/unread-count"
  "/v1/manager/notifications?limit=5"
  "/v1/manager/upcoming-appointments"
  "/v1/manager/appointments/today"
)

for path in "${READ_PATHS[@]}"; do
  RESP=$(req GET "$path" "" "$TOKEN")
  CODE=$(printf '%s' "$RESP" | tail -1)
  BODY=$(printf '%s' "$RESP" | sed '$d')
  check_code "GET $path" "$CODE" "200"
done

# First patient id
PATIENTS_RESP=$(req GET "/v1/manager/patients?page=1&pageSize=1" "" "$TOKEN")
PATIENTS_BODY=$(printf '%s' "$PATIENTS_RESP" | sed '$d')
PATIENT_ID=$(printf '%s' "$PATIENTS_BODY" | node -e '
  const j = JSON.parse(require("fs").readFileSync(0,"utf8"));
  const rows = j.rows || j.items || [];
  process.stdout.write(rows[0]?.id || "");
')

if [[ -n "$PATIENT_ID" ]]; then
  RESP=$(req GET "/v1/manager/patients/$PATIENT_ID/details" "" "$TOKEN")
  CODE=$(printf '%s' "$RESP" | tail -1)
  check_code "GET /v1/manager/patients/:id/details" "$CODE" "200"

  RESP=$(req GET "/v1/manager/patients/$PATIENT_ID" "" "$TOKEN")
  CODE=$(printf '%s' "$RESP" | tail -1)
  check_code "GET /v1/manager/patients/:id" "$CODE" "200"

  # Document type for assign
  DT_RESP=$(req GET "/v1/manager/document-types" "" "$TOKEN")
  DT_BODY=$(printf '%s' "$DT_RESP" | sed '$d')
  DOC_TYPE_ID=$(printf '%s' "$DT_BODY" | node -e '
    const j = JSON.parse(require("fs").readFileSync(0,"utf8"));
    process.stdout.write((j.items || [])[0]?.id || "");
  ')

  if [[ -n "$DOC_TYPE_ID" ]]; then
    # Regression: empty instruction (omit field) must not 400
    ASSIGN_BODY=$(DOC_TYPE_ID="$DOC_TYPE_ID" node -e 'process.stdout.write(JSON.stringify({items:[{documentTypeId:process.env.DOC_TYPE_ID}]}))')
    RESP=$(req POST "/v1/manager/patients/$PATIENT_ID/assign-documents" "$ASSIGN_BODY" "$TOKEN")
    CODE=$(printf '%s' "$RESP" | tail -1)
    if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
      echo "  OK   POST assign-documents (no instruction) ($CODE)"
      PASS=$((PASS + 1))
    else
      BODY=$(printf '%s' "$RESP" | sed '$d')
      MSG=$(printf '%s' "$BODY" | node -pe 'try{JSON.parse(require("fs").readFileSync(0,"utf8")).message}catch{e=>""}' 2>/dev/null || echo "")
      echo "  FAIL POST assign-documents ($CODE) ${MSG:+$MSG}"
      FAIL=$((FAIL + 1))
    fi

    # With null instruction (client bug regression)
    ASSIGN_NULL=$(DOC_TYPE_ID="$DOC_TYPE_ID" node -e 'process.stdout.write(JSON.stringify({items:[{documentTypeId:process.env.DOC_TYPE_ID,instructionText:null}]}))')
    RESP=$(req POST "/v1/manager/patients/$PATIENT_ID/assign-documents" "$ASSIGN_NULL" "$TOKEN")
    CODE=$(printf '%s' "$RESP" | tail -1)
    if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
      echo "  OK   POST assign-documents (null instruction) ($CODE)"
      PASS=$((PASS + 1))
    else
      echo "  FAIL POST assign-documents null instruction ($CODE)"
      FAIL=$((FAIL + 1))
    fi
  else
    echo "  SKIP assign-documents (no document types)"
    SKIP=$((SKIP + 1))
  fi

  # Hotel / transport assign (if resources exist)
  HOTEL_RESP=$(req GET "/v1/manager/hotels" "" "$TOKEN")
  HOTEL_BODY=$(printf '%s' "$HOTEL_RESP" | sed '$d')
  HOTEL_ID=$(printf '%s' "$HOTEL_BODY" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8"));process.stdout.write((j.rows||j.items||[])[0]?.id||"")')
  if [[ -n "$HOTEL_ID" ]]; then
    RESP=$(req PUT "/v1/manager/patients/$PATIENT_ID/assign-hotel" "{\"hotelId\":\"$HOTEL_ID\"}" "$TOKEN")
    CODE=$(printf '%s' "$RESP" | tail -1)
    check_code "PUT assign-hotel" "$CODE" "200"
  fi

  TRANS_RESP=$(req GET "/v1/manager/transports" "" "$TOKEN")
  TRANS_BODY=$(printf '%s' "$TRANS_RESP" | sed '$d')
  TRANS_ID=$(printf '%s' "$TRANS_BODY" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8"));process.stdout.write((j.rows||[])[0]?.id||"")')
  if [[ -n "$TRANS_ID" ]]; then
    RESP=$(req PUT "/v1/manager/patients/$PATIENT_ID/assign-transport" "{\"transportId\":\"$TRANS_ID\"}" "$TOKEN")
    CODE=$(printf '%s' "$RESP" | tail -1)
    check_code "PUT assign-transport" "$CODE" "200"
  fi

  DOCTOR_RESP=$(req GET "/v1/manager/doctors" "" "$TOKEN")
  DOCTOR_BODY=$(printf '%s' "$DOCTOR_RESP" | sed '$d')
  DOCTOR_ID=$(printf '%s' "$DOCTOR_BODY" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8"));process.stdout.write((j.rows||[])[0]?.id||"")')
  if [[ -n "$DOCTOR_ID" ]]; then
    RESP=$(req PUT "/v1/manager/patients/$PATIENT_ID/assign-doctor" "{\"doctorId\":\"$DOCTOR_ID\"}" "$TOKEN")
    CODE=$(printf '%s' "$RESP" | tail -1)
    check_code "PUT assign-doctor" "$CODE" "200"
  fi
else
  echo "  SKIP patient-scoped tests (no patients — run: npm run db:seed)"
  SKIP=$((SKIP + 1))
fi

# Create + delete ephemeral document type
UNIQ="SmokeType-$(date +%s)"
CREATE_BODY=$(UNIQ="$UNIQ" node -e 'process.stdout.write(JSON.stringify({name:process.env.UNIQ,note:"smoke test"}))')
RESP=$(req POST "/v1/manager/document-types" "$CREATE_BODY" "$TOKEN")
CODE=$(printf '%s' "$RESP" | tail -1)
CREATE_BODY_RESP=$(printf '%s' "$RESP" | sed '$d')
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  echo "  OK   POST document-types ($CODE)"
  PASS=$((PASS + 1))
  NEW_DT_ID=$(printf '%s' "$CREATE_BODY_RESP" | node -e 'try{process.stdout.write(JSON.parse(require("fs").readFileSync(0,"utf8")).id||"")}catch{process.stdout.write("")}')
  if [[ -n "$NEW_DT_ID" ]]; then
    RESP=$(req DELETE "/v1/manager/document-types/$NEW_DT_ID" "" "$TOKEN")
    CODE=$(printf '%s' "$RESP" | tail -1)
    check_code "DELETE document-types/:id" "$CODE" "200"
  fi
else
  echo "  FAIL POST document-types ($CODE)"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=== Summary: $PASS passed, $FAIL failed, $SKIP skipped ==="
[[ "$FAIL" -eq 0 ]]
