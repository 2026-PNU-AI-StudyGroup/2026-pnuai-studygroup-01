#!/usr/bin/env bash
# aipms 배포 스크립트: 최신 코드 받아 이미지 재빌드 + 재기동.
# migrate 서비스가 Prisma 마이그레이션을 자동 적용한 뒤 앱이 뜬다.
# 사용: 레포 루트에서 ./deploy.sh  (또는 bash deploy.sh)
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env.production ]; then
  echo "✗ .env.production 이 없다. 레포 루트에서 실행해." >&2
  exit 1
fi

COMPOSE="docker compose -f compose.production.yaml --env-file .env.production"
APP_PORT="$(grep -E '^APP_PORT=' .env.production | head -1 | cut -d= -f2 | tr -d '[:space:]')"
APP_PORT="${APP_PORT:-3000}"

echo "▶ 1/3 git pull"
git pull --ff-only

echo "▶ 2/3 build & up (마이그레이션 자동)"
$COMPOSE up -d --build

echo "▶ 3/3 health check (:${APP_PORT}, 최대 45초 대기)"
for _ in $(seq 1 15); do
  if curl -fsS "http://127.0.0.1:${APP_PORT}/api/health/ready" 2>/dev/null; then
    echo
    echo "✓ 배포 완료"
    exit 0
  fi
  sleep 3
done

echo
echo "⚠ 앱이 아직 준비되지 않았다. 로그 확인: ${COMPOSE} logs -f app" >&2
exit 1
