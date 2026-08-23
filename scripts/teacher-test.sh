#!/bin/bash
# Teacher role security test
set -e
BASE="http://localhost:3000"
COOKIES="/tmp/teacher-cookies.txt"
PASS=0
FAIL=0

check() {
  local desc="$1" condition="$2"
  if eval "$condition"; then
    echo "  ✓ $desc"
    PASS=$((PASS+1))
  else
    echo "  ✗ FAIL: $desc"
    FAIL=$((FAIL+1))
  fi
}

echo "=== Teacher login ==="
LOGIN=$(curl -s -c $COOKIES -X POST $BASE/api/auth/login -H "Content-Type: application/json" \
  -d '{"username":"jalpa","password":"Teacher@123"}')
check "teacher login ok" "$(echo $LOGIN | rg -q '"role":"TEACHER"' && echo true)"

echo "=== Teacher dashboard ==="
DASH=$(curl -s -b $COOKIES -o /dev/null -w "%{http_code}" $BASE/dashboard)
check "teacher dashboard 200" "[ '$DASH' = '200' ]"

echo "=== Teacher blocked from admin-only pages ==="
for page in settings expenses certificates; do
  CODE=$(curl -s -b $COOKIES -o /dev/null -w "%{http_code}" $BASE/$page)
  check "teacher blocked from /$page" "[ '$CODE' = '307' ]"
done

echo "=== Teacher blocked from admin APIs ==="
API1=$(curl -s -b $COOKIES -o /dev/null -w "%{http_code}" -X POST $BASE/api/teachers -H "Content-Type: application/json" -d '{"fullName":"Hacker Teacher"}')
check "teacher cannot create teachers (403)" "[ '$API1' = '403' ]"
API2=$(curl -s -b $COOKIES -o /dev/null -w "%{http_code}" -X POST $BASE/api/expenses -H "Content-Type: application/json" -d '{"title":"x","category":"Rent","amount":100,"date":"2026-08-24","method":"CASH"}')
check "teacher cannot create expenses (403)" "[ '$API2' = '403' ]"
API3=$(curl -s -b $COOKIES -o /dev/null -w "%{http_code}" $BASE/api/settings)
check "teacher cannot read settings API (403)" "[ '$API3' = '403' ]"

echo "=== Teacher scoped student access ==="
# create a student NOT assigned to jalpa
ADMIN_C=/tmp/e2e-cookies.txt
curl -s -c $ADMIN_C -X POST $BASE/api/auth/login -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}' > /dev/null
OTHER=$(curl -s -b $ADMIN_C -X POST $BASE/api/students -H "Content-Type: application/json" -d '{"fullName":"Unassigned Student"}')
OTHER_ID=$(echo "$OTHER" | python3 -c "import sys,json; print(json.load(sys.stdin)['student']['id'])")

TEACHER_VIEW=$(curl -s -b $COOKIES -o /dev/null -w "%{http_code}" $BASE/api/students/$OTHER_ID)
check "teacher blocked from unassigned student (403)" "[ '$TEACHER_VIEW' = '403' ]"

# jalpa's student (Rahul from e2e test) should be visible
RAHUL_ID=$(curl -s -b $ADMIN_C "$BASE/api/students?q=Rahul" | python3 -c "import sys,json; print(json.load(sys.stdin)['students'][0]['id'])")
TEACHER_VIEW2=$(curl -s -b $COOKIES -o /dev/null -w "%{http_code}" $BASE/api/students/$RAHUL_ID)
check "teacher can view assigned student (200)" "[ '$TEACHER_VIEW2' = '200' ]"

echo "=== Teacher cannot access expense reports ==="
EXP_REPORT=$(curl -s -b $COOKIES -o /dev/null -w "%{http_code}" "$BASE/api/reports?type=expenses")
check "teacher blocked from expense report (403)" "[ '$EXP_REPORT' = '403' ]"

echo "=== Wrong password rejected ==="
WRONG=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/auth/login -H "Content-Type: application/json" -d '{"username":"jalpa","password":"wrongpass"}')
check "wrong password rejected (401)" "[ '$WRONG' = '401' ]"

echo ""
echo "================================"
echo "TEACHER SECURITY: $PASS passed, $FAIL failed"
echo "================================"
if [ $FAIL -gt 0 ]; then exit 1; fi
