# 프로덕션 운영

## 배포 전 준비

1. `.env.production.example`을 `.env.production`으로 복사한다.
2. 예시 도메인을 실제 HTTPS 도메인으로 바꾸고 인증·DB·Object Storage 비밀값을 각각 별도로 생성한다.
3. Google OAuth Web Client에 다음 Redirect URI를 등록한다.

```text
https://<운영 도메인>/api/auth/callback/google
```

`BETTER_AUTH_SECRET`과 `CRON_SECRET`은 서로 다른 값이어야 한다. 다음 명령으로 각각 생성한다.

```bash
openssl rand -base64 48
```

애플리케이션 컨테이너는 PostgreSQL과 MinIO를 외부에 공개하지 않는다. `3000` 포트 앞에는 TLS를 종료하는 Reverse Proxy를 두고, 프록시에서도 `X-Forwarded-Proto=https`를 전달한다.

## 배포

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

배포 환경의 스케줄러에서 다음 작업을 실행한다.

```bash
curl -fsS -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://<운영 도메인>/api/cron/deadlines
```

권장 주기는 매일 09:00 KST 한 번이다. 같은 대상·기한·사용자의 알림은 고유 키로 중복 생성되지 않는다. 만료 업로드 정리는 앱 런타임 작업과 `npm run cleanup:uploads` 복구 명령을 사용한다.

## 백업과 복구

제품의 `연도별 지난 프로젝트`는 사용자에게 제공하는 아카이브 기능이다. 인프라 장애 복구용 백업은 별도로 운영한다.

- PostgreSQL: 매일 `pg_dump --format=custom`, 30일 보관, 월 1회 별도 저장소 복구 훈련
- MinIO: 버킷 버전 관리 또는 다른 스토리지로 복제, `staging/` 1일 만료 정책 유지
- DB와 Object Storage는 동일 복구 시점 기준으로 보관하고 암호화된 저장소에 둔다.
- 복구 후 `/api/health/ready`, 로그인, 보고서 다운로드, 종료 프로젝트 결과물 링크를 Smoke Test한다.

## 롤백

애플리케이션 이미지는 커밋 SHA 태그로 보관한다. 코드 롤백은 이전 이미지로 수행하되, 이미 적용된 Prisma 마이그레이션을 임의로 되돌리지 않는다. 스키마 호환성이 없는 롤백은 검증된 DB 백업 복구 절차와 함께 수행한다.
