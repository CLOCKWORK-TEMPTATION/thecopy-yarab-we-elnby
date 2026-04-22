#!/usr/bin/env bash
# ===================================================================
# scripts/security/zap-baseline.sh
# ===================================================================
# فحص OWASP ZAP Baseline (non-intrusive) ضد الـ backend API.
# المرجع: https://www.zaproxy.org/docs/docker/baseline-scan/
#
# يُجرى على backend المحلي (افتراضياً http://host.docker.internal:3001)،
# أو على أي target يُمرر عبر متغير TARGET_URL.
#
# الاستخدام:
#   bash scripts/security/zap-baseline.sh [--target URL] [--full] [--minutes N]
#
# المتطلبات:
#   - Docker يعمل.
#   - الـ backend يعمل (pnpm dev:backend أو docker compose up backend).
#
# ملاحظات أمنية:
#   - هذا فحص baseline/passive بشكل افتراضي؛ لا يُنفّذ هجمات نشطة على
#     بيئة الإنتاج. لفحص نشط استخدم --full (ضد بيئات اختبار فقط).
#   - عدم تشغيل ZAP مطلقاً على نظم إنتاجية بدون تصريح مسبق.
# ===================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT_DIR="${REPO_ROOT}/output/security"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

TARGET_URL="${TARGET_URL:-http://host.docker.internal:3001}"
MODE="baseline"
MINUTES="5"
CONFIG_FILE="${REPO_ROOT}/scripts/security/zap-baseline.conf"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      TARGET_URL="$2"
      shift 2
      ;;
    --full)
      MODE="full"
      shift
      ;;
    --minutes)
      MINUTES="$2"
      shift 2
      ;;
    -h|--help)
      cat <<USAGE
Usage: $0 [--target URL] [--full] [--minutes N]

Options:
  --target URL         عنوان التطبيق المستهدف (افتراضي: http://host.docker.internal:3001).
  --full               استخدم full-scan بدل baseline (نشط — بيئات اختبار فقط).
  --minutes N          مدة spider بالدقائق (افتراضي: 5).
  -h, --help           عرض هذه المساعدة.
USAGE
      exit 0
      ;;
    *)
      echo "خيار غير معروف: $1" >&2
      exit 2
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "خطأ: Docker غير مثبت أو غير متاح في PATH." >&2
  exit 127
fi

mkdir -p "${OUTPUT_DIR}"

ZAP_IMAGE="ghcr.io/zaproxy/zaproxy:stable"
echo "→ سحب صورة ZAP الرسمية: ${ZAP_IMAGE}"
docker pull "${ZAP_IMAGE}" >/dev/null

REPORT_HTML="zap-${MODE}-${TIMESTAMP}.html"
REPORT_JSON="zap-${MODE}-${TIMESTAMP}.json"
REPORT_MD="zap-${MODE}-${TIMESTAMP}.md"

SCRIPT_NAME="zap-baseline.py"
if [[ "${MODE}" == "full" ]]; then
  SCRIPT_NAME="zap-full-scan.py"
  echo "⚠️  وضع FULL SCAN مُفعّل — تأكد أن ${TARGET_URL} بيئة اختبار وليست إنتاج."
fi

CONFIG_ARG=()
if [[ -f "${CONFIG_FILE}" ]]; then
  docker_config_path="/zap/wrk/zap-baseline.conf"
  CONFIG_ARG=(-c "${docker_config_path}")
fi

echo
echo "═══════════════════════════════════════════════════════════════"
echo " ZAP ${MODE^^} SCAN"
echo " Target : ${TARGET_URL}"
echo " Output : ${OUTPUT_DIR}"
echo "═══════════════════════════════════════════════════════════════"

set +e
docker run --rm \
  -v "${OUTPUT_DIR}:/zap/wrk/:rw" \
  -v "${REPO_ROOT}/scripts/security:/zap/wrk-config/:ro" \
  --add-host=host.docker.internal:host-gateway \
  "${ZAP_IMAGE}" \
  "${SCRIPT_NAME}" \
    -t "${TARGET_URL}" \
    -m "${MINUTES}" \
    -r "${REPORT_HTML}" \
    -J "${REPORT_JSON}" \
    -w "${REPORT_MD}" \
    "${CONFIG_ARG[@]}"
ZAP_EXIT=$?
set -e

# ZAP exit codes:
#   0 = success (no warns/fails)
#   1 = at least one FAIL
#   2 = at least one WARN
#   3 = other error
echo
case "${ZAP_EXIT}" in
  0) echo "✓ ZAP: لا مشاكل عالية." ;;
  1) echo "✗ ZAP: هناك قواعد فشلت (FAIL) — راجع ${REPORT_HTML}." ;;
  2) echo "⚠️  ZAP: هناك تحذيرات (WARN) — راجع ${REPORT_HTML}." ;;
  *) echo "✗ ZAP: خطأ تشغيلي بكود ${ZAP_EXIT}." ;;
esac

echo "تقارير: ${OUTPUT_DIR}/${REPORT_HTML}"
echo "         ${OUTPUT_DIR}/${REPORT_JSON}"
echo "         ${OUTPUT_DIR}/${REPORT_MD}"

exit "${ZAP_EXIT}"
