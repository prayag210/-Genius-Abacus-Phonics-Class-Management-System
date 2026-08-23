#!/bin/bash
# End-to-end API test for the core business flow
set -e
BASE="http://localhost:3000"
COOKIES="/tmp/e2e-cookies.txt"
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

echo "=== 1. Login as admin ==="
curl -s -c $COOKIES -X POST $BASE/api/auth/login -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}' > /tmp/e2e-login.json
check "login returns user" "$(rg -q '"role":"ADMIN"' /tmp/e2e-login.json && echo true)"

echo "=== 2. Create parent ==="
PARENT=$(curl -s -b $COOKIES -X POST $BASE/api/parents -H "Content-Type: application/json" \
  -d '{"name":"Rajesh Patel","phone":"9876543210","relationship":"Father"}')
PARENT_ID=$(echo "$PARENT" | python3 -c "import sys,json; print(json.load(sys.stdin)['parent']['id'])")
check "parent created" "[ '$PARENT_ID' != '' ]"

echo "=== 3. Get course+level for Junior Abacus ==="
COURSES=$(curl -s -b $COOKIES $BASE/api/courses)
COURSE_ID=$(echo "$COURSES" | python3 -c "
import sys,json
data = json.load(sys.stdin)
for c in data['courses']:
    if c['name']=='Junior Abacus':
        print(c['id']); break
")
LEVEL1_ID=$(echo "$COURSES" | python3 -c "
import sys,json
data = json.load(sys.stdin)
for c in data['courses']:
    if c['name']=='Junior Abacus':
        for l in c['levels']:
            if l['levelNumber']==1:
                print(l['id']); break
        break
")
LEVEL2_ID=$(echo "$COURSES" | python3 -c "
import sys,json
data = json.load(sys.stdin)
for c in data['courses']:
    if c['name']=='Junior Abacus':
        for l in c['levels']:
            if l['levelNumber']==2:
                print(l['id']); break
        break
")
TEACHER_ID=$(curl -s -b $COOKIES $BASE/api/teachers | python3 -c "
import sys,json
data = json.load(sys.stdin)
print(data['teachers'][0]['id'])
")
check "course found" "[ '$COURSE_ID' != '' ]"
check "level1 found" "[ '$LEVEL1_ID' != '' ]"
check "level2 found" "[ '$LEVEL2_ID' != '' ]"
check "teacher found" "[ '$TEACHER_ID' != '' ]"

echo "=== 4. Create student with initial enrollment (Junior Abacus L1) ==="
STUDENT=$(curl -s -b $COOKIES -X POST $BASE/api/students -H "Content-Type: application/json" \
  -d "{\"fullName\":\"Rahul Patel\",\"phone\":\"9998887776\",\"parentId\":\"$PARENT_ID\",\"initialEnrollment\":{\"courseId\":\"$COURSE_ID\",\"teacherId\":\"$TEACHER_ID\",\"createFeeRecord\":true}}")
STUDENT_ID=$(echo "$STUDENT" | python3 -c "import sys,json; print(json.load(sys.stdin)['student']['id'])")
check "student created" "[ '$STUDENT_ID' != '' ]"

echo "=== 5. Verify fee record auto-created (₹4,000 pending) ==="
FEES=$(curl -s -b $COOKIES "$BASE/api/fees")
FEE_ID=$(echo "$FEES" | python3 -c "
import sys,json
data = json.load(sys.stdin)
for f in data['fees']:
    if f['studentId']=='$STUDENT_ID':
        print(f['id']); break
")
FEE_STATUS=$(echo "$FEES" | python3 -c "
import sys,json
data = json.load(sys.stdin)
for f in data['fees']:
    if f['studentId']=='$STUDENT_ID':
        print(f['status']); break
")
FEE_TOTAL=$(echo "$FEES" | python3 -c "
import sys,json
data = json.load(sys.stdin)
for f in data['fees']:
    if f['studentId']=='$STUDENT_ID':
        print(f['totalFee']); break
")
check "fee record exists" "[ '$FEE_ID' != '' ]"
check "fee status PENDING" "[ '$FEE_STATUS' = 'PENDING' ]"
check "fee amount 4000" "[ '$FEE_TOTAL' = '4000' ]"

echo "=== 6. Partial payment ₹2,000 ==="
PAY1=$(curl -s -b $COOKIES -X POST $BASE/api/payments -H "Content-Type: application/json" \
  -d "{\"feeRecordId\":\"$FEE_ID\",\"amount\":2000,\"paymentDate\":\"2026-08-24\",\"method\":\"UPI\"}")
RECEIPT1=$(echo "$PAY1" | python3 -c "import sys,json; print(json.load(sys.stdin)['receiptNumber'])")
check "payment receipt generated" "$(echo $RECEIPT1 | rg -q 'RCP-' && echo true)"

echo "=== 7. Verify status PARTIALLY_PAID ==="
FEE_STATUS2=$(curl -s -b $COOKIES "$BASE/api/fees" | python3 -c "
import sys,json
data = json.load(sys.stdin)
for f in data['fees']:
    if f['id']=='$FEE_ID':
        print(f['status']); break
")
check "status is PARTIALLY_PAID" "[ '$FEE_STATUS2' = 'PARTIALLY_PAID' ]"

echo "=== 8. Overpayment rejected ==="
OVERPAY=$(curl -s -b $COOKIES -X POST $BASE/api/payments -H "Content-Type: application/json" \
  -d "{\"feeRecordId\":\"$FEE_ID\",\"amount\":5000,\"paymentDate\":\"2026-08-24\",\"method\":\"CASH\"}")
check "overpayment rejected" "$(echo $OVERPAY | rg -q 'exceeds' && echo true)"

echo "=== 9. Complete Level 1 → Level 2 ==="
ENROLLMENTS=$(curl -s -b $COOKIES "$BASE/api/enrollments?studentId=$STUDENT_ID")
ENROLLMENT_ID=$(echo "$ENROLLMENTS" | python3 -c "import sys,json; print(json.load(sys.stdin)['enrollments'][0]['id'])")
PROGRESS=$(curl -s -b $COOKIES -X POST "$BASE/api/enrollments/$ENROLLMENT_ID/progress" -H "Content-Type: application/json" \
  -d "{\"result\":\"Passed with distinction\",\"completeCourse\":false}")
check "progression successful" "$(echo $PROGRESS | rg -q 'enrollment' && echo true)"
NEXT_LEVEL=$(echo "$PROGRESS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('nextLevelName') or '')")
check "moved to Level 2" "[ '$NEXT_LEVEL' = 'Level 2' ]"

echo "=== 10. Verify history preserved (Level 1 COMPLETED) ==="
LADDER=$(curl -s -b $COOKIES "$BASE/api/enrollments/$ENROLLMENT_ID/progress")
L1_STATUS=$(echo "$LADDER" | python3 -c "
import sys,json
data = json.load(sys.stdin)
for l in data['ladder']:
    if l['levelNumber']==1:
        print(l['status']); break
")
L1_RESULT=$(echo "$LADDER" | python3 -c "
import sys,json
data = json.load(sys.stdin)
for l in data['ladder']:
    if l['levelNumber']==1:
        print(l['result'] or ''); break
")
check "Level 1 COMPLETED in history" "[ '$L1_STATUS' = 'COMPLETED' ]"
check "Level 1 result preserved" "$(echo '$L1_RESULT' | rg -q 'Passed with distinction' && echo true)"

echo "=== 11. Verify new fee record for Level 2 (₹4,000) ==="
NEW_FEES=$(curl -s -b $COOKIES "$BASE/api/fees")
L2_FEE_COUNT=$(echo "$NEW_FEES" | python3 -c "
import sys,json
data = json.load(sys.stdin)
count = 0
for f in data['fees']:
    if f['studentId']=='$STUDENT_ID' and f['levelName']=='Level 2':
        count += 1
print(count)
")
check "Level 2 fee record created" "[ '$L2_FEE_COUNT' = '1' ]"

echo "=== 12. Remaining balance payment (₹2,000) ==="
PAY2=$(curl -s -b $COOKIES -X POST $BASE/api/payments -H "Content-Type: application/json" \
  -d "{\"feeRecordId\":\"$FEE_ID\",\"amount\":2000,\"paymentDate\":\"2026-08-24\",\"method\":\"CASH\"}")
check "second payment accepted" "$(echo $PAY2 | rg -q 'RCP-' && echo true)"
FEE_STATUS3=$(curl -s -b $COOKIES "$BASE/api/fees" | python3 -c "
import sys,json
data = json.load(sys.stdin)
for f in data['fees']:
    if f['id']=='$FEE_ID':
        print(f['status']); break
")
check "status now PAID" "[ '$FEE_STATUS3' = 'PAID' ]"

echo "=== 13. Security checks ==="
UNAUTH=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/students)
check "unauthenticated API blocked (401)" "[ '$UNAUTH' = '401' ]"
UNAUTH_PAGE=$(curl -s -o /dev/null -w "%{http_code}" $BASE/dashboard)
check "unauthenticated page redirects (307)" "[ '$UNAUTH_PAGE' = '307' ]"

echo "=== 14. Duplicate enrollment rejected ==="
DUP=$(curl -s -b $COOKIES -X POST $BASE/api/enrollments -H "Content-Type: application/json" \
  -d "{\"studentId\":\"$STUDENT_ID\",\"courseId\":\"$COURSE_ID\"}")
check "duplicate enrollment rejected" "$(echo $DUP | rg -q 'already enrolled' && echo true)"

echo ""
echo "================================"
echo "RESULTS: $PASS passed, $FAIL failed"
echo "================================"
if [ $FAIL -gt 0 ]; then exit 1; fi
