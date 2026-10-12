#!/usr/bin/env bash
# PostgreSQL 덤프와 MinIO 데이터를 서버 로컬 디스크에 백업하고 보관기간이 지난 파일을 지운다.
# 사용: ops/backup.sh            (기본값: ~/aipms-backups, 30일 보관)
#       BACKUP_DIR=/srv/backup KEEP_DAYS=14 ops/backup.sh
#
# BACKUP_PASSPHRASE_FILE 의 암호로 AES256 암호화해 .gpg 로 남긴다. 암호 파일이 없으면 멈춘다.
# 개인정보 처리방침 제8조가 백업 암호화를 약속하므로 평문 백업은 만들지 않는다.
# (로컬 시험처럼 정말 평문이 필요하면 ALLOW_PLAINTEXT_BACKUP=1 을 준다.)
# 복구: gpg --decrypt --passphrase-file <암호파일> --batch pg-….dump.gpg > pg.dump
set -euo pipefail
cd "$(dirname "$0")/.."

# 백업 파일과 폴더를 이 계정만 읽게 한다. 같은 서버의 다른 계정도 접근하지 못해야
# 처리방침의 "접근이 통제된 위치" 가 된다.
umask 077

BACKUP_DIR="${BACKUP_DIR:-$HOME/aipms-backups}"
KEEP_DAYS="${KEEP_DAYS:-30}"
BACKUP_PASSPHRASE_FILE="${BACKUP_PASSPHRASE_FILE:-$HOME/.config/aipms/backup-passphrase}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-pnu-project-management-system-production}"
COMPOSE="docker compose -f compose.production.yaml --env-file .env.production"

if [ ! -f .env.production ]; then
  echo "✗ .env.production 이 없다." >&2
  exit 1
fi

read_env() {
  grep -E "^$1=" .env.production | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

PG_USER="$(read_env POSTGRES_USER)"
PG_DB="$(read_env POSTGRES_DB)"
if [ -z "$PG_USER" ] || [ -z "$PG_DB" ]; then
  echo "✗ POSTGRES_USER 또는 POSTGRES_DB 를 읽지 못했다." >&2
  exit 1
fi

stamp="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 백업 파일에는 전체 개인정보가 그대로 들어간다. 암호문으로 남기는 것이 기본이다.
# 암호는 서버 밖에도 반드시 따로 보관한다. 잃어버리면 복구할 수 없다.
suffix=""
if [ -s "$BACKUP_PASSPHRASE_FILE" ]; then
  if ! command -v gpg >/dev/null 2>&1; then
    echo "✗ gpg 가 없어 암호화할 수 없다: sudo apt-get install -y gnupg" >&2
    exit 1
  fi
  suffix=".gpg"
  seal() { gpg --batch --quiet --yes --symmetric --cipher-algo AES256 --passphrase-file "$BACKUP_PASSPHRASE_FILE"; }
elif [ "${ALLOW_PLAINTEXT_BACKUP:-}" = "1" ]; then
  echo "⚠ ALLOW_PLAINTEXT_BACKUP=1 이라 백업을 평문으로 남긴다. 개인정보가 그대로 들어 있다." >&2
  seal() { cat; }
else
  # 예전에는 경고만 찍고 평문으로 남겼다. 타이머 로그를 아무도 안 보면 처리방침과 다른
  # 평문 백업이 매일 쌓인다. 멈추면 systemd 에 실패로 남아 드러난다.
  echo "✗ $BACKUP_PASSPHRASE_FILE 이 없어 암호화할 수 없다. 평문 백업은 만들지 않는다." >&2
  echo "  암호 파일을 만들려면 docs/PRODUCTION.md 의 백업 절을 본다." >&2
  exit 1
fi

# 1) PostgreSQL — custom 포맷은 자체 압축되며 pg_restore 로 부분 복구가 된다.
pg_file="$BACKUP_DIR/pg-$stamp.dump$suffix"
echo "▶ PostgreSQL 덤프 → $pg_file"
$COMPOSE exec -T postgres pg_dump -U "$PG_USER" -d "$PG_DB" --format=custom | seal > "$pg_file.part"
mv "$pg_file.part" "$pg_file"

# 2) MinIO — 볼륨을 읽기 전용으로 붙여 tar 로 묶는다.
minio_volume="${COMPOSE_PROJECT}_minio_data"
minio_file="$BACKUP_DIR/minio-$stamp.tar.gz$suffix"
if docker volume inspect "$minio_volume" >/dev/null 2>&1; then
  echo "▶ MinIO 데이터 → $minio_file"
  docker run --rm -v "$minio_volume:/data:ro" alpine:3.22 tar czf - -C /data . | seal > "$minio_file.part"
  mv "$minio_file.part" "$minio_file"
else
  echo "⚠ 볼륨 $minio_volume 을 찾지 못해 MinIO 백업을 건너뛴다." >&2
fi

# 3) 보관기간 정리 — 완료된 파일만 지운다(.part 는 남겨 실패를 드러낸다).
deleted="$(find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'pg-*.dump' -o -name 'pg-*.dump.gpg' -o -name 'minio-*.tar.gz' -o -name 'minio-*.tar.gz.gpg' \) -mtime "+$KEEP_DAYS" -print -delete | wc -l | tr -d ' ')"

echo "✓ 백업 완료 (보관 ${KEEP_DAYS}일, 이번에 정리한 파일 ${deleted}개)"
du -sh "$BACKUP_DIR"
