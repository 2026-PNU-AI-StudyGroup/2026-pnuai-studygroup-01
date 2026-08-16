# 프로덕션 운영

## 배포 전 준비

1. `.env.production.example`을 `.env.production`으로 복사한다.
2. 예시 도메인을 실제 HTTPS 도메인으로 바꾸고 인증·DB·Object Storage 비밀값을 각각 별도로 생성한다.
3. Google OAuth Web Client에 다음 Redirect URI를 등록한다.

```text
https://<운영 도메인>/api/auth/callback/google
```

같은 호스트의 `3000` 포트를 이미 사용 중이면 `.env.production`의 `APP_PORT`를
비어 있는 호스트 포트로 변경한다. 컨테이너 내부 포트는 항상 `3000`이다.
Reverse Proxy가 다른 호스트에서 접근해야 한다면 `APP_HOST=0.0.0.0`으로 설정하고,
방화벽에서 해당 포트를 신뢰하는 내부 네트워크에만 허용한다. 같은 호스트의
Reverse Proxy를 사용할 때는 기본값인 `127.0.0.1`을 유지한다.

개발용 배포에서 역할별 데모 로그인을 사용할 때만
`ENABLE_DEVELOPMENT_MOCK_AUTH=true`로 설정하고,
`DEVELOPMENT_MOCK_AUTH_HOSTS=pnu-pms.jun0.dev,192.168.32.32`처럼 접근을 허용할
호스트를 정확히 지정한다. 허용 목록에 없는 호스트와 동일 출처가 아닌 요청은 거부된다.

`BETTER_AUTH_SECRET`과 `CRON_SECRET`은 서로 다른 값이어야 한다. 다음 명령으로 각각 생성한다.

```bash
openssl rand -base64 48
```

### Gmail OAuth2 SMTP

메일 발송용 Google OAuth 클라이언트는 사용자 로그인용 클라이언트와 별도 Google Cloud 프로젝트로 분리한다. Gmail API scope로 refresh token을 발급할 OAuth 앱은 운영 전 Publishing status를 `Production`으로 전환하고, Google이 검증을 요구하면 검증 완료 뒤에만 `EMAIL_DELIVERY_ENABLED=true`로 바꾼다.

1. 전용 Gmail 발송 계정의 주소를 `GMAIL_SMTP_USER`에 등록한다.
2. 로컬 OAuth 클라이언트의 loopback Redirect URI `http://127.0.0.1:43827/oauth2/callback`을 Google Cloud Console에 등록한다.
3. `GMAIL_OAUTH_CLIENT_ID`, `GMAIL_OAUTH_CLIENT_SECRET`, `GMAIL_SMTP_USER`를 로컬 환경에 설정하고 `npm run emails:gmail-authorize`를 실행한다.
4. 출력된 `GMAIL_OAUTH_REFRESH_TOKEN`만 NAS 비밀 환경변수에 등록한다. 토큰을 파일·로그·저장소에 기록하지 않는다.
5. 발송 계정 자신에게 HTML/plain-text 테스트 메일 한 건을 확인한 후에만 이메일 워커를 활성화한다.

OAuth 동의를 수행한 계정과 `GMAIL_SMTP_USER`가 다르면 권한 발급 스크립트가 중단된다. 토큰이 회수·만료되거나 Gmail SMTP가 `535`를 반환하면 워커를 비활성화하고 관리자가 다시 동의한다. `SENT`는 Gmail SMTP가 접수한 상태일 뿐 최종 받은편지함 도착을 뜻하지 않으며, 반송 메일은 발송 계정의 받은편지함에서 운영자가 확인한다.

애플리케이션 컨테이너는 PostgreSQL과 MinIO를 외부에 공개하지 않는다. 앱의 `3000` 포트도 기본 Compose에서 `127.0.0.1`에만 바인딩하며, 같은 호스트의 Reverse Proxy만 접근하게 한다. Reverse Proxy에서 TLS를 종료하고 `X-Forwarded-Proto=https`를 전달한다. 운영 도메인의 HTTPS 응답에는 프록시에서 `Strict-Transport-Security: max-age=31536000; includeSubDomains`를 추가한다. 전체 하위 도메인이 HTTPS로 운영된다는 확인 전에는 `includeSubDomains`를 사용하지 않는다.

## 서버 1회 준비

새 서버를 실서비스로 세울 때 한 번만 수행한다. 이후 배포는 `./deploy.sh` 하나로 끝난다.

```bash
git clone <레포 주소> ~/aipms && cd ~/aipms
cp .env.production.example .env.production   # 값 채우기(아래 전환 체크리스트 참고)
./deploy.sh                                  # 빌드 + 마이그레이션 + 기동
npm run db:bootstrap-admin                   # INITIAL_ADMIN_EMAIL 로 최초 관리자 생성
sudo ops/install-systemd.sh                  # 정기 작업·백업 타이머 + 부팅 자동 기동
```

`ops/install-systemd.sh`는 다음을 설치한다. 경로와 실행 사용자는 실행 시점 값으로 채워진다.

| 타이머 | 주기 | 내용 |
|---|---|---|
| `aipms-translations.timer` | 1분 | 번역 큐 처리 |
| `aipms-emails.timer` | 1분 | 이메일 대기열 발송 |
| `aipms-deadlines.timer` | 매일 09:00 | 마감 임박 알림 생성 |
| `aipms-backup.timer` | 매일 03:30 | PostgreSQL 덤프 + MinIO 데이터 백업 |

백업 위치와 보관기간은 환경변수로 바꾼다.

```bash
sudo BACKUP_DIR=/srv/aipms-backups KEEP_DAYS=14 ops/install-systemd.sh
```

상태 확인:

```bash
systemctl list-timers 'aipms-*'
journalctl -u aipms-translations.service -n 30 --no-pager
journalctl -u aipms-backup.service -n 30 --no-pager
```

## 개발 배포 → 실서비스 전환 체크리스트

데모 로그인으로 시험 운영하던 서버를 실서비스로 돌릴 때 확인한다.

- [ ] `ENABLE_DEVELOPMENT_MOCK_AUTH=false` (또는 삭제). `DEVELOPMENT_MOCK_AUTH_HOSTS`도 비운다.
- [ ] `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` 설정, Google OAuth Web Client에 Redirect URI 등록.
- [ ] `APP_URL` · `BETTER_AUTH_URL`이 실제 HTTPS 도메인인지 확인(`http://` 로 남아 있으면 로그인 세션이 유지되지 않는다).
- [ ] `BETTER_AUTH_SECRET` · `CRON_SECRET`을 운영 전용 값으로 새로 생성(개발 값 재사용 금지).
- [ ] `INITIAL_ADMIN_EMAIL`을 실제 운영 담당자 주소로 두고 `npm run db:bootstrap-admin` 실행.
- [ ] 데모 데이터를 넣지 않는다. `db:seed-demo`는 `ALLOW_LOCAL_DEMO_SEED` 없이는 실행되지 않는다.
- [ ] Reverse Proxy HTTPS 인증서 발급 완료, `X-Forwarded-Proto=https` 전달 확인.
- [ ] `sudo ops/install-systemd.sh`로 타이머 설치 후 `systemctl list-timers 'aipms-*'` 확인.
- [ ] 백업이 실제로 파일을 남기는지 1회 수동 확인: `ops/backup.sh` 실행 후 `BACKUP_DIR` 확인.
- [ ] 개인정보 처리방침·수집 동의 화면을 게시했는지 확인(실사용자 데이터 수집 전 필수).

## 배포

정기 배포는 스크립트 하나로 수행한다. 최신 코드를 받아 이미지를 다시 빌드하고, 마이그레이션을 적용한 뒤 헬스체크까지 확인한다.

```bash
cd ~/aipms && ./deploy.sh
```

수동으로 수행할 때는 다음과 같다.

```bash
docker compose --env-file .env.production -f compose.production.yaml build
docker compose --env-file .env.production -f compose.production.yaml up -d
```

`migrate` 서비스가 커밋된 Prisma 마이그레이션을 먼저 적용하고 정상 종료한 뒤 앱이 시작된다. 앱 컨테이너는 root가 아닌 `nextjs` 사용자로 실행된다.

## 상태 확인

```bash
curl -fsS https://<운영 도메인>/api/health/live
curl -fsS https://<운영 도메인>/api/health/ready
docker compose --env-file .env.production -f compose.production.yaml ps
docker compose --env-file .env.production -f compose.production.yaml logs app
```

- `/api/health/live`: Next.js 프로세스 응답 여부
- `/api/health/ready`: PostgreSQL·Object Storage 사용 가능 여부와 Ollama 상태
- Ollama 장애는 번역만 중단시키며 프로젝트 조회·지원·보고서 업무의 readiness를 실패시키지 않는다.

## 정기 작업

`ops/install-systemd.sh`로 설치한 타이머가 아래 엔드포인트를 자동 호출한다. 스케줄러를 직접 구성할 때만 다음 명령을 참고한다.

```bash
curl -fsS -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://<운영 도메인>/api/cron/deadlines
```

권장 주기는 매일 09:00 KST 한 번이다. 같은 대상·기한·사용자의 알림은 고유 키로 중복 생성되지 않는다. 만료 업로드 정리는 앱 런타임 작업과 `npm run cleanup:uploads` 복구 명령을 사용한다.

번역 큐는 다음 엔드포인트를 1분마다 호출한다.

```bash
curl -fsS -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://<운영 도메인>/api/cron/translations
```

글 저장 트랜잭션은 원문과 한·영 번역 작업을 PostgreSQL에 함께 기록한다. 워커는 최대 10건을 `FOR UPDATE SKIP LOCKED`로 선점하고 로컬 모델의 안정성을 위해 순차 처리한다. 실패 작업은 지수 백오프로 최대 5회 재시도하며, 10분 이상 잠긴 작업은 다음 호출에서 회수한다. 마이그레이션은 배포 전에 존재하던 번역 대상 원문도 같은 큐에 백필한다. Ollama 장애 중에도 원문 조회와 글 작성은 계속 가능하며, 복구 후 대기 작업이 이어서 처리된다.

5회 실패해 `FAILED`가 된 작업은 Ollama 원인을 조치한 뒤 `npm run translations:retry-failed`로 재등록한다. 이 명령은 실패 작업만 초기화하고 즉시 한 배치를 처리한다.

이메일 대기열도 1분마다 호출한다.

```bash
curl -fsS -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://<운영 도메인>/api/cron/emails
```

업무 트랜잭션은 PostgreSQL 아웃박스에만 이메일 작업을 기록하며 SMTP를 직접 호출하지 않는다. 워커는 PostgreSQL lock과 `FOR UPDATE SKIP LOCKED`로 최대 25건을 선점하고, 중요 메일부터 한 수신자씩 Gmail SMTP TLS(`smtp.gmail.com:465`)로 발송한다. 재시도는 1분·5분·30분·2시간 후이며 최대 5회이다. 네트워크·SMTP 4xx는 재시도하고, 영구 SMTP 5xx는 실패 처리한다. 24시간 기준 전체 450건, 선택형 보고서·토론 100건을 넘으면 작업은 실패하지 않고 다음 가능한 시각으로 이월된다.

이메일 작업의 전달 보장은 최소 한 번이다. SMTP 접수 뒤 DB 상태 기록 전에 연결이 끊기면 동일한 `Message-ID`로 중복 메일이 전송될 수 있다. 발송 성공 또는 취소 전이 시 제목·본문·링크와 취소 사유는 즉시 삭제하며, 실패 작업만 재등록을 위해 해당 내용을 유지한다.

## 백업과 복구

제품의 `연도별 지난 프로젝트`는 사용자에게 제공하는 아카이브 기능이다. 인프라 장애 복구용 백업은 별도로 운영한다.

- PostgreSQL: 매일 `pg_dump --format=custom`, 30일 보관, 월 1회 별도 저장소 복구 훈련
- MinIO: 버킷 버전 관리 또는 다른 스토리지로 복제, `staging/` 1일 만료 정책 유지
- DB와 Object Storage는 동일 복구 시점 기준으로 보관하고 암호화된 저장소에 둔다.
- 복구 후 `/api/health/ready`, 로그인, 보고서 다운로드, 종료 프로젝트 결과물 링크를 Smoke Test한다.

## 롤백

애플리케이션 이미지는 커밋 SHA 태그로 보관한다. 코드 롤백은 이전 이미지로 수행하되, 이미 적용된 Prisma 마이그레이션을 임의로 되돌리지 않는다. 스키마 호환성이 없는 롤백은 검증된 DB 백업 복구 절차와 함께 수행한다.
