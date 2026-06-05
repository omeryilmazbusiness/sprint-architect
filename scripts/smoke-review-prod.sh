#!/usr/bin/env bash
# Full App Review self-test against production API.
set -euo pipefail

API_BASE="${1:-https://sprint-architect-production.up.railway.app}"
PASS=0
FAIL=0

check() {
  local name="$1" code="$2" expect="$3"
  if [[ "$code" == "$expect" ]]; then
    echo "  OK   $name ($code)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL $name (got $code, want $expect)"
    FAIL=$((FAIL + 1))
  fi
}

echo "Review self-test → $API_BASE"
echo ""

CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$API_BASE/api/health")
check "health" "$CODE" "200"

MGR_JSON=$(curl -sS -X POST "$API_BASE/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-Healory-Review-Mode: 1" \
  -d '{"email":"manager@demo.com","password":"Manager123!"}')
MGR_CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$API_BASE/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@demo.com","password":"Manager123!"}')
check "manager login" "$MGR_CODE" "200"
MGR_TOKEN=$(echo "$MGR_JSON" | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).accessToken' 2>/dev/null || echo "")

ADM_CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$API_BASE/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"Admin123!"}')
check "admin login" "$ADM_CODE" "200"

for KEY in PT-4S9WQ2U6 PATIENT-TEST-0001; do
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$API_BASE/v1/patient/auth/login" \
    -H "Content-Type: application/json" \
    -H "X-Healory-Review-Mode: 1" \
    -d "{\"patientKey\":\"$KEY\",\"deviceId\":\"review-a-$KEY\"}")
  check "member login $KEY (device A)" "$CODE" "200"
  CODE2=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$API_BASE/v1/patient/auth/login" \
    -H "Content-Type: application/json" \
    -H "X-Healory-Review-Mode: 1" \
    -d "{\"patientKey\":\"$KEY\",\"deviceId\":\"review-b-$KEY-ipad\"}")
  check "member login $KEY (device B)" "$CODE2" "200"
done

if [[ -n "$MGR_TOKEN" ]]; then
  DOC_JSON=$(curl -sS "$API_BASE/v1/manager/document-types" \
    -H "Authorization: Bearer $MGR_TOKEN" \
    -H "X-Healory-Review-Mode: 1")
  echo "$DOC_JSON" | node -e "
    const j=JSON.parse(require('fs').readFileSync(0,'utf8'));
    const names=(j.items||[]).map(i=>i.name).join('|');
    const bad=/visa|passport|insurance|consent/i;
    if(bad.test(names)){ console.error('  FAIL document types contain sensitive names:', names); process.exit(1); }
    console.log('  OK   document types clean:', (j.items||[]).map(i=>i.name).join(', ') || '(empty)');
    process.exit(0);
  " && PASS=$((PASS+1)) || FAIL=$((FAIL+1))

  CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$API_BASE/v1/manager/dashboard" \
    -H "Authorization: Bearer $MGR_TOKEN" -H "X-Healory-Review-Mode: 1")
  check "manager dashboard" "$CODE" "200"

  CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$API_BASE/v1/manager/clinic-info" \
    -H "Authorization: Bearer $MGR_TOKEN" -H "X-Healory-Review-Mode: 1")
  check "manager clinic-info" "$CODE" "200"
fi

ADM_TOKEN=$(curl -sS -X POST "$API_BASE/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"Admin123!"}' | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).accessToken' 2>/dev/null || echo "")
MEM_TOKEN=$(curl -sS -X POST "$API_BASE/v1/patient/auth/login" \
  -H "Content-Type: application/json" -H "X-Healory-Review-Mode: 1" \
  -d '{"patientKey":"PT-4S9WQ2U6","deviceId":"smoke-member-dash"}' \
  | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).accessToken' 2>/dev/null || echo "")
if [[ -n "$MEM_TOKEN" ]]; then
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$API_BASE/v1/patient/dashboard" \
    -H "Authorization: Bearer $MEM_TOKEN" -H "X-Healory-Review-Mode: 1")
  check "member dashboard" "$CODE" "200"
  MEM_JSON=$(curl -sS "$API_BASE/v1/patient/dashboard" \
    -H "Authorization: Bearer $MEM_TOKEN" -H "X-Healory-Review-Mode: 1")
  echo "$MEM_JSON" | node -e "
    const j=JSON.parse(require('fs').readFileSync(0,'utf8'));
    const bad=/visa|passport|insurance|consent|surgery|medical/i;
    const blob=JSON.stringify(j);
    if(bad.test(blob)){ console.error('  FAIL member dashboard sensitive text'); process.exit(1); }
    console.log('  OK   member dashboard clean, clinic:', j.patient?.clinicName);
    process.exit(0);
  " && PASS=$((PASS+1)) || FAIL=$((FAIL+1))
fi

if [[ -n "$MGR_TOKEN" ]]; then
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$API_BASE/v1/manager/patients?limit=5" \
    -H "Authorization: Bearer $MGR_TOKEN" -H "X-Healory-Review-Mode: 1")
  check "manager members list" "$CODE" "200"
fi

if [[ -n "$ADM_TOKEN" ]]; then
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$API_BASE/v1/admin/clinics" \
    -H "Authorization: Bearer $ADM_TOKEN" -H "X-Healory-Review-Mode: 1")
  check "admin clinics list" "$CODE" "200"
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$API_BASE/v1/admin/dashboard" \
    -H "Authorization: Bearer $ADM_TOKEN" -H "X-Healory-Review-Mode: 1" 2>/dev/null || echo "000")
  if [[ "$CODE" == "200" || "$CODE" == "404" ]]; then
    echo "  OK   admin dashboard ($CODE)"
    PASS=$((PASS+1))
  else
    echo "  FAIL admin dashboard (got $CODE)"
    FAIL=$((FAIL+1))
  fi
fi

echo ""
echo "Result: $PASS passed, $FAIL failed"
[[ "$FAIL" -eq 0 ]]
