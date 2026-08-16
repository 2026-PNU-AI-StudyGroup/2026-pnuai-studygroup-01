#!/usr/bin/env bash
# 정기 작업 엔드포인트를 호출한다. systemd 타이머가 이 스크립트를 실행한다.
# 사용: ops/cron-tick.sh deadlines
#       ops/cron-tick.sh translations
#       ops/cron-tick.sh emails
set -euo pipefail
cd "$(dirname "$0")/.."

job="${1:-}"
case "$job" in
  deadlines|translations|emails) ;;
  *) echo "사용법: $0 deadlines|translations|emails" >&2; exit 2 ;;
esac

if [ ! -f .env.production ]; then
  echo "✗ .env.production 이 없다." >&2
  exit 1
fi

# KEY=VALUE 에서 값만 취하고 감싼 따옴표를 벗긴다.
read_env() {
  grep -E "^$1=" .env.production | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

secret="$(read_env CRON_SECRET)"
port="$(read_env APP_PORT | tr -d '[:space:]')"
port="${port:-3000}"

if [ -z "$secret" ]; then
  echo "✗ CRON_SECRET 이 비어 있다." >&2
  exit 1
fi

curl -fsS --max-time 120 -X POST \
  -H "Authorization: Bearer ${secret}" \
  "http://127.0.0.1:${port}/api/cron/${job}"
echo
