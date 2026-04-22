#!/usr/bin/env bash
# ===================================================================
# scripts/security/trivy-scan.sh
# ===================================================================
# فحص Trivy لصور Docker الخاصة بمستودع "النسخة".
# يفحص:
#   - صور backend و web (تُبنى محلياً إن لزم)
#   - صور الخدمات الخارجية: postgres, redis, weaviate
# يُخرج تقرير JSON و تقرير مقروء تحت output/security/trivy-*.
#
# المتطلبات:
#   - Docker يعمل.
#   - اتصال إنترنت لتحميل صورة trivy الرسمية (aquasec/trivy:latest).
#
# الاستخدام:
#   bash scripts/security/trivy-scan.sh [--build] [--severity HIGH,CRITICAL]
# ===================================================================

set -euo pipefail

SEVERITY="HIGH,CRITICAL"
BUILD_IMAGES="false"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT_DIR="${REPO_ROOT}/output/security"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build)
      BUILD_IMAGES="true"
      shift
      ;;
    --severity)
      SEVERITY="$2"
      shift 2
      ;;
    -h|--help)
      cat <<USAGE
Usage: $0 [--build] [--severity LEVELS]

Options:
  --build                بناء صور backend/web محلياً قبل الفحص.
  --severity LEVELS      مستويات الخطورة المفلترة (افتراضي: HIGH,CRITICAL).
  -h, --help             عرض هذه المساعدة.
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

TRIVY_IMAGE="aquasec/trivy:latest"
echo "→ سحب صورة Trivy الرسمية: ${TRIVY_IMAGE}"
docker pull "${TRIVY_IMAGE}" >/dev/null

# Volume للاحتفاظ بقاعدة البيانات بين التشغيلات (تسريع الفحص)
TRIVY_CACHE_VOLUME="thecopy-trivy-cache"
docker volume create "${TRIVY_CACHE_VOLUME}" >/dev/null

run_trivy() {
  local image="$1"
  local label="$2"
  local json_out="${OUTPUT_DIR}/trivy-${label}-${TIMESTAMP}.json"
  local txt_out="${OUTPUT_DIR}/trivy-${label}-${TIMESTAMP}.txt"

  echo
  echo "═══════════════════════════════════════════════════════════════"
  echo " Trivy: ${label} → ${image}"
  echo "═══════════════════════════════════════════════════════════════"

  docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v "${TRIVY_CACHE_VOLUME}:/root/.cache/" \
    "${TRIVY_IMAGE}" \
    image \
      --severity "${SEVERITY}" \
      --format table \
      --no-progress \
      "${image}" | tee "${txt_out}"

  docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v "${TRIVY_CACHE_VOLUME}:/root/.cache/" \
    "${TRIVY_IMAGE}" \
    image \
      --severity "${SEVERITY}" \
      --format json \
      --no-progress \
      "${image}" > "${json_out}"

  echo "تم حفظ: ${json_out}"
}

if [[ "${BUILD_IMAGES}" == "true" ]]; then
  echo "→ بناء صور backend + web محلياً..."
  (cd "${REPO_ROOT}" && docker compose --env-file .env.docker build --pull backend web)
fi

# صور التطبيق المحلية (compose project: thecopy)
APP_IMAGES=(
  "thecopy-backend:latest|backend"
  "thecopy-web:latest|web"
)

# صور الخدمات الخارجية (حسب docker-compose.yml الحالي)
DEP_IMAGES=(
  "postgres:16-alpine|postgres"
  "redis:7-alpine|redis"
  "cr.weaviate.io/semitechnologies/weaviate:1.28.4|weaviate"
)

for entry in "${APP_IMAGES[@]}"; do
  image="${entry%%|*}"
  label="${entry##*|}"
  if docker image inspect "${image}" >/dev/null 2>&1; then
    run_trivy "${image}" "${label}"
  else
    echo "⚠️  صورة ${image} غير موجودة محلياً — تخطَّ. استخدم --build لبنائها."
  fi
done

for entry in "${DEP_IMAGES[@]}"; do
  image="${entry%%|*}"
  label="${entry##*|}"
  run_trivy "${image}" "${label}"
done

echo
echo "✓ انتهى فحص Trivy. التقارير في: ${OUTPUT_DIR}"
