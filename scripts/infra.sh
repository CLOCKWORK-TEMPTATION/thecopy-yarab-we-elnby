#!/usr/bin/env bash
# =============================================================
# infra.sh - إدارة البنية التحتية لمشروع "النسخة"
# الخدمات: PostgreSQL 16 | Redis 7 | Weaviate 1.28.4
# =============================================================
# الاستخدام:
#   bash scripts/infra.sh up       - تشغيل جميع الخدمات
#   bash scripts/infra.sh down     - إيقاف جميع الخدمات
#   bash scripts/infra.sh status   - حالة الخدمات
#   bash scripts/infra.sh logs     - عرض السجلات (اختياري: اسم الخدمة)
#   bash scripts/infra.sh reset    - إعادة تهيئة كاملة (يحذف البيانات)
# =============================================================

set -euo pipefail

# ملف docker-compose الخاص بالبنية التحتية
COMPOSE_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/docker-compose.infra.yml"
COMPOSE_CMD="docker compose -f ${COMPOSE_FILE}"

# الألوان للطباعة
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # بدون لون

# -------------------------------------------------------
# دالة: طباعة رسالة منسقة
# -------------------------------------------------------
log_info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# -------------------------------------------------------
# دالة: التحقق من تثبيت Docker
# -------------------------------------------------------
check_docker() {
  if ! command -v docker &>/dev/null; then
    log_error "Docker غير مثبت. يرجى تثبيت Docker Desktop أولاً."
    exit 1
  fi
  if ! docker info &>/dev/null; then
    log_error "Docker daemon لا يعمل. يرجى تشغيل Docker Desktop."
    exit 1
  fi
}

# -------------------------------------------------------
# دالة: انتظار اكتمال فحوصات الصحة لجميع الخدمات
# -------------------------------------------------------
wait_for_healthy() {
  local services=("postgres" "redis" "weaviate")
  local max_wait=120  # ثانية
  local elapsed=0
  local interval=5

  log_info "انتظار جاهزية الخدمات (حد أقصى ${max_wait}s)..."

  for service in "${services[@]}"; do
    local waited=0
    echo -n "  انتظار ${service}..."

    while true; do
      local status
      status=$(docker inspect --format='{{.State.Health.Status}}' \
        "$(${COMPOSE_CMD} ps -q "${service}" 2>/dev/null)" 2>/dev/null || echo "missing")

      if [[ "${status}" == "healthy" ]]; then
        echo -e " ${GREEN}جاهز${NC}"
        break
      elif [[ "${status}" == "unhealthy" ]]; then
        echo -e " ${RED}فشل${NC}"
        log_error "الخدمة ${service} غير صحية. تحقق من السجلات: bash scripts/infra.sh logs ${service}"
        exit 1
      fi

      if [[ ${waited} -ge ${max_wait} ]]; then
        echo -e " ${YELLOW}انتهى الوقت${NC}"
        log_warn "انتهى وقت الانتظار للخدمة ${service}. قد تحتاج وقتاً إضافياً."
        break
      fi

      echo -n "."
      sleep "${interval}"
      waited=$((waited + interval))
    done
  done
}

# -------------------------------------------------------
# الأمر: up - تشغيل الخدمات
# -------------------------------------------------------
cmd_up() {
  check_docker

  log_info "تشغيل خدمات البنية التحتية..."
  ${COMPOSE_CMD} up -d

  echo ""
  wait_for_healthy

  echo ""
  log_success "جميع الخدمات تعمل بنجاح!"
  echo ""
  echo -e "  ${BLUE}PostgreSQL${NC}  -> localhost:5433  (المستخدم: thecopy / قاعدة البيانات: thecopy_dev)"
  echo -e "  ${BLUE}Redis${NC}       -> localhost:6379"
  echo -e "  ${BLUE}Weaviate${NC}    -> http://localhost:8080"
  echo ""
}

# -------------------------------------------------------
# الأمر: down - إيقاف الخدمات
# -------------------------------------------------------
cmd_down() {
  check_docker
  log_info "إيقاف خدمات البنية التحتية..."
  ${COMPOSE_CMD} down
  log_success "تم إيقاف جميع الخدمات."
}

# -------------------------------------------------------
# الأمر: status - حالة الخدمات
# -------------------------------------------------------
cmd_status() {
  check_docker
  log_info "حالة خدمات البنية التحتية:"
  echo ""
  ${COMPOSE_CMD} ps
  echo ""

  # فحص صحة كل خدمة بشكل منفصل
  local services=("postgres" "redis" "weaviate")
  for service in "${services[@]}"; do
    local container_id
    container_id=$(${COMPOSE_CMD} ps -q "${service}" 2>/dev/null || echo "")

    if [[ -z "${container_id}" ]]; then
      echo -e "  ${service}: ${RED}متوقف${NC}"
      continue
    fi

    local health
    health=$(docker inspect --format='{{.State.Health.Status}}' "${container_id}" 2>/dev/null || echo "unknown")

    case "${health}" in
      healthy)   echo -e "  ${service}: ${GREEN}صحي${NC}" ;;
      unhealthy) echo -e "  ${service}: ${RED}غير صحي${NC}" ;;
      starting)  echo -e "  ${service}: ${YELLOW}يبدأ...${NC}" ;;
      *)         echo -e "  ${service}: ${YELLOW}${health}${NC}" ;;
    esac
  done
  echo ""
}

# -------------------------------------------------------
# الأمر: logs - عرض السجلات
# -------------------------------------------------------
cmd_logs() {
  check_docker
  local service="${1:-}"

  if [[ -n "${service}" ]]; then
    log_info "سجلات الخدمة: ${service}"
    ${COMPOSE_CMD} logs -f --tail=100 "${service}"
  else
    log_info "سجلات جميع الخدمات (آخر 50 سطر لكل خدمة):"
    ${COMPOSE_CMD} logs --tail=50
  fi
}

# -------------------------------------------------------
# الأمر: reset - إعادة تهيئة كاملة مع حذف البيانات
# -------------------------------------------------------
cmd_reset() {
  check_docker

  log_warn "تحذير: سيتم حذف جميع بيانات PostgreSQL وRedis وWeaviate!"
  echo -n "هل أنت متأكد؟ اكتب 'نعم' للمتابعة: "
  read -r confirmation

  if [[ "${confirmation}" != "نعم" && "${confirmation}" != "yes" && "${confirmation}" != "y" ]]; then
    log_info "تم الإلغاء."
    exit 0
  fi

  log_info "إيقاف الخدمات وحذف الأحجام..."
  ${COMPOSE_CMD} down -v

  log_info "إعادة تشغيل الخدمات..."
  cmd_up
}

# -------------------------------------------------------
# نقطة الدخول الرئيسية
# -------------------------------------------------------
main() {
  local command="${1:-help}"
  shift || true

  case "${command}" in
    up)     cmd_up ;;
    down)   cmd_down ;;
    status) cmd_status ;;
    logs)   cmd_logs "$@" ;;
    reset)  cmd_reset ;;
    help|--help|-h)
      echo ""
      echo "استخدام: bash scripts/infra.sh <الأمر> [خيارات]"
      echo ""
      echo "الأوامر المتاحة:"
      echo "  up       تشغيل جميع خدمات البنية التحتية"
      echo "  down     إيقاف جميع الخدمات"
      echo "  status   عرض حالة الخدمات"
      echo "  logs     عرض السجلات (مثال: logs redis)"
      echo "  reset    إعادة تهيئة كاملة (يحذف البيانات)"
      echo ""
      ;;
    *)
      log_error "أمر غير معروف: '${command}'. استخدم 'help' لعرض الأوامر."
      exit 1
      ;;
  esac
}

main "$@"
