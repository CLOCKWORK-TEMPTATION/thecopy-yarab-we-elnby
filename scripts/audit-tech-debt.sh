#!/usr/bin/env bash
# ===================================================================
# scripts/audit-tech-debt.sh — حارس ميزانية الديون التقنية
# ===================================================================
# يقرأ tech-debt-baseline.json ويقارنه بقياس حي للمستودع.
# سياسة ratchet أحادي الاتجاه: أي metric يزيد عن baseline → EXIT=1.
#
# الاستخدام:
#   bash scripts/audit-tech-debt.sh                    # يفحص ويُخرج تقرير
#   bash scripts/audit-tech-debt.sh --json             # إخراج JSON فقط
#   bash scripts/audit-tech-debt.sh --update-baseline  # يحدّث القيم لو نقصت (لا يزيد أبداً)
#
# رموز الخروج:
#   0 = كل metric ثابت أو نقص
#   1 = على الأقل metric واحد زاد (ratchet violation)
#   2 = baseline file مفقود أو تالف
#   3 = jq غير مثبت
# ===================================================================

set -euo pipefail

BASELINE_FILE="${BASELINE_FILE:-tech-debt-baseline.json}"
MODE="${1:-report}"

# -------------------------------------------------------------------
# تحقق من المتطلبات
# -------------------------------------------------------------------
if ! command -v jq >/dev/null 2>&1; then
  echo "[FAIL] jq غير مثبت. التثبيت: apt-get install jq | brew install jq | scoop install jq" >&2
  exit 3
fi

if [ ! -f "$BASELINE_FILE" ]; then
  echo "[FAIL] baseline file مفقود: $BASELINE_FILE" >&2
  echo "       يجب إنشاؤه في STR-098 أو لاحقاً عبر --update-baseline." >&2
  exit 2
fi

# -------------------------------------------------------------------
# دوال القياس الحي
# -------------------------------------------------------------------
# ملاحظة: نستخدم `|| true` بعد grep لأن grep يخرج بـ 1 لو لا تطابق،
# و pipefail يقتل السكريبت. القيمة 0 (لا تطابق) سلوك مقبول هنا.

count_console_web() {
  { grep -rE "console\.(log|info|warn|error|debug)" apps/web/src \
      --include="*.ts" --include="*.tsx" 2>/dev/null \
      | grep -v "\.test\." | grep -v "\.spec\."; } 2>/dev/null \
    | wc -l | tr -d ' '
}

count_console_backend() {
  { grep -rE "console\.(log|info|warn|error|debug)" apps/backend/src \
      --include="*.ts" 2>/dev/null \
      | grep -v "\.test\." | grep -v "\.spec\."; } 2>/dev/null \
    | wc -l | tr -d ' '
}

count_any_web() {
  { grep -rE ":\s*any\b" apps/web/src \
      --include="*.ts" --include="*.tsx" 2>/dev/null \
      | grep -v "\.test\."; } 2>/dev/null \
    | wc -l | tr -d ' '
}

count_any_backend() {
  { grep -rE ":\s*any\b" apps/backend/src \
      --include="*.ts" 2>/dev/null \
      | grep -v "\.test\."; } 2>/dev/null \
    | wc -l | tr -d ' '
}

count_ts_ignore() {
  { grep -r "@ts-ignore" apps/web/src apps/backend/src \
      --include="*.ts" --include="*.tsx" 2>/dev/null || true; } \
    | wc -l | tr -d ' '
}

count_todo_fixme_hack() {
  { grep -rE "(TODO|FIXME|HACK)" apps/web/src apps/backend/src packages \
      --include="*.ts" --include="*.tsx" 2>/dev/null || true; } \
    | wc -l | tr -d ' '
}

count_files_over() {
  local threshold=$1
  { find apps/web/src apps/backend/src packages -type f \
      \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null \
      -exec wc -l {} \; | awk -v t="$threshold" '$1 > t'; } 2>/dev/null \
    | wc -l | tr -d ' '
}

# -------------------------------------------------------------------
# قراءة baseline
# -------------------------------------------------------------------
read_baseline() {
  jq -r ".static_metrics.$1.value // \"null\"" "$BASELINE_FILE"
}

# -------------------------------------------------------------------
# مقارنة metric واحد
# -------------------------------------------------------------------
fail_count=0
ok_count=0
improved_count=0

check_metric() {
  local name=$1
  local baseline=$2
  local current=$3
  local target_round=$4

  if [ "$baseline" = "null" ]; then
    printf "  %-30s baseline=null current=%-6s [SKIP — لم يُجمَّد بعد]\n" "$name" "$current"
    return 0
  fi

  if [ "$current" -gt "$baseline" ]; then
    local delta=$((current - baseline))
    printf "  %-30s baseline=%-6s current=%-6s [FAIL +%d] target=%s\n" "$name" "$baseline" "$current" "$delta" "$target_round"
    fail_count=$((fail_count + 1))
  elif [ "$current" -lt "$baseline" ]; then
    local delta=$((baseline - current))
    printf "  %-30s baseline=%-6s current=%-6s [GAIN -%d] target=%s\n" "$name" "$baseline" "$current" "$delta" "$target_round"
    improved_count=$((improved_count + 1))
  else
    printf "  %-30s baseline=%-6s current=%-6s [OK]\n" "$name" "$baseline" "$current"
    ok_count=$((ok_count + 1))
  fi
}

# -------------------------------------------------------------------
# تشغيل القياسات
# -------------------------------------------------------------------
echo "==========================================================="
echo " STR-098 Tech Debt Ratchet Audit"
echo " baseline: $BASELINE_FILE"
echo " commit:   $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
echo " branch:   $(git branch --show-current 2>/dev/null || echo 'unknown')"
echo "==========================================================="

current_console_web=$(count_console_web)
current_console_backend=$(count_console_backend)
current_any_web=$(count_any_web)
current_any_backend=$(count_any_backend)
current_ts_ignore=$(count_ts_ignore)
current_todo=$(count_todo_fixme_hack)
current_over_1000=$(count_files_over 1000)
current_over_500=$(count_files_over 500)

check_metric "console_calls_web_src"       "$(read_baseline console_calls_web_src)"       "$current_console_web"      "STR-101"
check_metric "console_calls_backend_src"   "$(read_baseline console_calls_backend_src)"   "$current_console_backend"  "STR-101"
check_metric "any_type_web_src"            "$(read_baseline any_type_web_src)"            "$current_any_web"          "STR-101"
check_metric "any_type_backend_src"        "$(read_baseline any_type_backend_src)"        "$current_any_backend"      "STR-101"
check_metric "ts_ignore_total"             "$(read_baseline ts_ignore_total)"             "$current_ts_ignore"        "STR-101"
check_metric "todo_fixme_hack_total"       "$(read_baseline todo_fixme_hack_total)"       "$current_todo"             "STR-101"
check_metric "files_over_1000_lines"       "$(read_baseline files_over_1000_lines)"       "$current_over_1000"        "STR-102"
check_metric "files_over_500_lines"        "$(read_baseline files_over_500_lines)"        "$current_over_500"         "STR-102"

# -------------------------------------------------------------------
# الإخراج النهائي
# -------------------------------------------------------------------
echo "-----------------------------------------------------------"
echo " النتيجة: ok=$ok_count  improved=$improved_count  fail=$fail_count"
echo "-----------------------------------------------------------"

# -------------------------------------------------------------------
# تحديث baseline (يتم عبر scripts/update-baseline.py لتفادي تعقيد bash+jq)
# -------------------------------------------------------------------
if [ "$MODE" = "--update-baseline" ]; then
  echo "[INFO] استخدم: python3 scripts/update-baseline.py" >&2
  exit 0
fi

# -------------------------------------------------------------------
# رمز الخروج
# -------------------------------------------------------------------
if [ "$fail_count" -gt 0 ]; then
  exit 1
fi
exit 0
