#!/usr/bin/env bash
# ===================================================================
# scripts/audit-migration-budget.sh — حارس ميزانية الترحيل
# ===================================================================
# يقرأ triage-round-{NNN}.md للجولة الحالية ويحسب نسبة [DEFERRED]
# لكل أولوية. يقارن بالميزانية المحددة في tech-debt-baseline.json:
#   migration_budget_per_priority.P0 = 0%   (لا ترحيل P0 على الإطلاق)
#   migration_budget_per_priority.P1 = 15%  (حد أقصى)
#   migration_budget_per_priority.P2 = 30%
#   migration_budget_per_priority.P3 = 100% (∞)
#
# اكتشاف الجولة:
#   1. متغير البيئة STR_ROUND إن وُجد
#   2. وإلا اسم الفرع لو يطابق str-NNN-*
#   3. وإلا [SKIP] (مقبول قبل أول triage)
#
# رموز الخروج:
#   0 = الميزانية محترمة أو لا triage بعد
#   1 = أولوية واحدة على الأقل تجاوزت ميزانيتها
#   2 = baseline file مفقود
#   3 = jq غير مثبت
# ===================================================================

set -euo pipefail

BASELINE_FILE="${BASELINE_FILE:-tech-debt-baseline.json}"

# -------------------------------------------------------------------
# تحقق من المتطلبات
# -------------------------------------------------------------------
if ! command -v jq >/dev/null 2>&1; then
  echo "[FAIL] jq غير مثبت." >&2
  exit 3
fi

if [ ! -f "$BASELINE_FILE" ]; then
  echo "[FAIL] baseline file مفقود: $BASELINE_FILE" >&2
  exit 2
fi

# -------------------------------------------------------------------
# اكتشاف رقم الجولة
# -------------------------------------------------------------------
ROUND="${STR_ROUND:-}"

if [ -z "$ROUND" ]; then
  branch=$(git branch --show-current 2>/dev/null || echo "")
  if [[ "$branch" =~ str-([0-9]{3}) ]]; then
    ROUND="${BASH_REMATCH[1]}"
  fi
fi

if [ -z "$ROUND" ]; then
  echo "[SKIP] لا STR_ROUND في البيئة ولا فرع str-NNN-* — تخطّي فحص الميزانية."
  echo "       (طبيعي على main أو في PR لا يمسّ جولة استراتيجية)"
  exit 0
fi

TRIAGE_FILE="triage-round-${ROUND}.md"

if [ ! -f "$TRIAGE_FILE" ]; then
  echo "[SKIP] $TRIAGE_FILE غير موجود — تخطّي."
  echo "       (طبيعي قبل أول Discovery+Triage في الجولة STR-${ROUND})"
  exit 0
fi

# -------------------------------------------------------------------
# قراءة الميزانية من baseline
# -------------------------------------------------------------------
budget_p0=$(jq -r '.migration_budget_per_priority.P0' "$BASELINE_FILE")
budget_p1=$(jq -r '.migration_budget_per_priority.P1' "$BASELINE_FILE")
budget_p2=$(jq -r '.migration_budget_per_priority.P2' "$BASELINE_FILE")
budget_p3=$(jq -r '.migration_budget_per_priority.P3' "$BASELINE_FILE")

# -------------------------------------------------------------------
# عدّ بنود الـ triage حسب الأولوية والحالة
# الافتراضات (يجب أن يلتزم بها قالب triage):
#   - كل بند يبدأ بسطر يحتوي معرّف نوع P0/P1/P2/P3
#   - الحالة موسومة [DEFERRED] / [DONE] / [UN] / [CLOSED] في نفس السطر
# -------------------------------------------------------------------
count_priority() {
  local prio=$1
  grep -cE "(^|\s)${prio}(\s|:)" "$TRIAGE_FILE" 2>/dev/null || echo 0
}

count_deferred() {
  local prio=$1
  grep -E "(^|\s)${prio}(\s|:)" "$TRIAGE_FILE" 2>/dev/null \
    | grep -c "\[DEFERRED\]" || echo 0
}

total_p0=$(count_priority "P0")
total_p1=$(count_priority "P1")
total_p2=$(count_priority "P2")
total_p3=$(count_priority "P3")

deferred_p0=$(count_deferred "P0")
deferred_p1=$(count_deferred "P1")
deferred_p2=$(count_deferred "P2")
deferred_p3=$(count_deferred "P3")

# -------------------------------------------------------------------
# حساب النسب والمقارنة
# -------------------------------------------------------------------
pct() {
  local num=$1
  local den=$2
  if [ "$den" -eq 0 ]; then
    echo "0"
  else
    echo $(( (num * 100) / den ))
  fi
}

pct_p0=$(pct "$deferred_p0" "$total_p0")
pct_p1=$(pct "$deferred_p1" "$total_p1")
pct_p2=$(pct "$deferred_p2" "$total_p2")
pct_p3=$(pct "$deferred_p3" "$total_p3")

fail=0

check_budget() {
  local prio=$1
  local total=$2
  local deferred=$3
  local pct=$4
  local budget=$5

  if [ "$total" -eq 0 ]; then
    printf "  %-3s total=0   deferred=0   pct=0%%   budget=%s%%   [N/A]\n" "$prio" "$budget"
    return 0
  fi

  if [ "$pct" -gt "$budget" ]; then
    printf "  %-3s total=%-3s deferred=%-3s pct=%s%%  budget=%s%%   [FAIL]\n" "$prio" "$total" "$deferred" "$pct" "$budget"
    fail=$((fail + 1))
  else
    printf "  %-3s total=%-3s deferred=%-3s pct=%s%%  budget=%s%%   [OK]\n" "$prio" "$total" "$deferred" "$pct" "$budget"
  fi
}

echo "==========================================================="
echo " STR-${ROUND} Migration Budget Audit"
echo " triage:  $TRIAGE_FILE"
echo " commit:  $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
echo "==========================================================="

check_budget "P0" "$total_p0" "$deferred_p0" "$pct_p0" "$budget_p0"
check_budget "P1" "$total_p1" "$deferred_p1" "$pct_p1" "$budget_p1"
check_budget "P2" "$total_p2" "$deferred_p2" "$pct_p2" "$budget_p2"
check_budget "P3" "$total_p3" "$deferred_p3" "$pct_p3" "$budget_p3"

echo "-----------------------------------------------------------"

if [ "$fail" -gt 0 ]; then
  echo " النتيجة: $fail أولوية تجاوزت ميزانيتها → CI يفشل"
  exit 1
fi

echo " النتيجة: كل الميزانيات محترمة"
exit 0
