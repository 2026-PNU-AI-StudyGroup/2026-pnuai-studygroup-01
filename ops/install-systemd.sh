#!/usr/bin/env bash
# 정기 작업·백업 systemd 유닛을 현재 사용자·경로에 맞춰 설치한다.
# 사용: sudo ops/install-systemd.sh
#       sudo BACKUP_DIR=/srv/aipms-backups KEEP_DAYS=14 ops/install-systemd.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_USER="${SUDO_USER:-$USER}"
BACKUP_DIR="${BACKUP_DIR:-/home/$RUN_USER/aipms-backups}"
KEEP_DAYS="${KEEP_DAYS:-30}"
UNIT_DIR=/etc/systemd/system

if [ "$(id -u)" -ne 0 ]; then
  echo "✗ root 권한이 필요하다: sudo ops/install-systemd.sh" >&2
  exit 1
fi

chmod +x "$REPO_DIR/ops/cron-tick.sh" "$REPO_DIR/ops/backup.sh" "$REPO_DIR/deploy.sh"

write_unit() {
  local name="$1"
  shift
  printf '%s\n' "$@" > "$UNIT_DIR/$name"
  echo "  · $name"
}

echo "▶ 유닛 작성 (실행 사용자: $RUN_USER, 레포: $REPO_DIR)"

write_unit aipms-deadlines.service \
  '[Unit]' \
  'Description=aipms 마감 임박 알림 생성' \
  'After=docker.service' \
  '' \
  '[Service]' \
  'Type=oneshot' \
  "User=$RUN_USER" \
  "WorkingDirectory=$REPO_DIR" \
  "ExecStart=$REPO_DIR/ops/cron-tick.sh deadlines"

write_unit aipms-deadlines.timer \
  '[Unit]' \
  'Description=aipms 마감 임박 알림 (매일 09:00 KST)' \
  '' \
  '[Timer]' \
  'OnCalendar=*-*-* 09:00:00' \
  'Persistent=true' \
  '' \
  '[Install]' \
  'WantedBy=timers.target'

write_unit aipms-translations.service \
  '[Unit]' \
  'Description=aipms 번역 큐 처리' \
  'After=docker.service' \
  '' \
  '[Service]' \
  'Type=oneshot' \
  "User=$RUN_USER" \
  "WorkingDirectory=$REPO_DIR" \
  "ExecStart=$REPO_DIR/ops/cron-tick.sh translations"

write_unit aipms-translations.timer \
  '[Unit]' \
  'Description=aipms 번역 큐 (1분마다)' \
  '' \
  '[Timer]' \
  'OnBootSec=2min' \
  'OnUnitActiveSec=1min' \
  'AccuracySec=10s' \
  '' \
  '[Install]' \
  'WantedBy=timers.target'

write_unit aipms-emails.service \
  '[Unit]' \
  'Description=aipms 이메일 대기열 발송' \
  'After=docker.service' \
  '' \
  '[Service]' \
  'Type=oneshot' \
  "User=$RUN_USER" \
  "WorkingDirectory=$REPO_DIR" \
  "ExecStart=$REPO_DIR/ops/cron-tick.sh emails"

write_unit aipms-emails.timer \
  '[Unit]' \
  'Description=aipms 이메일 대기열 (1분마다)' \
  '' \
  '[Timer]' \
  'OnBootSec=2min' \
  'OnUnitActiveSec=1min' \
  'AccuracySec=10s' \
  '' \
  '[Install]' \
  'WantedBy=timers.target'

write_unit aipms-backup.service \
  '[Unit]' \
  'Description=aipms PostgreSQL·MinIO 백업' \
  'After=docker.service' \
  '' \
  '[Service]' \
  'Type=oneshot' \
  "User=$RUN_USER" \
  "WorkingDirectory=$REPO_DIR" \
  "Environment=BACKUP_DIR=$BACKUP_DIR" \
  "Environment=KEEP_DAYS=$KEEP_DAYS" \
  "ExecStart=$REPO_DIR/ops/backup.sh"

write_unit aipms-backup.timer \
  '[Unit]' \
  'Description=aipms 백업 (매일 03:30 KST)' \
  '' \
  '[Timer]' \
  'OnCalendar=*-*-* 03:30:00' \
  'Persistent=true' \
  '' \
  '[Install]' \
  'WantedBy=timers.target'

install -d -o "$RUN_USER" -g "$RUN_USER" "$BACKUP_DIR"

echo "▶ 타이머 활성화"
systemctl daemon-reload
systemctl enable --now aipms-deadlines.timer aipms-translations.timer aipms-emails.timer aipms-backup.timer

echo "▶ 부팅 후 컨테이너 자동 기동"
systemctl enable docker

echo
echo "✓ 설치 완료. 상태 확인:"
echo "  systemctl list-timers 'aipms-*'"
echo "  journalctl -u aipms-translations.service -n 30 --no-pager"
