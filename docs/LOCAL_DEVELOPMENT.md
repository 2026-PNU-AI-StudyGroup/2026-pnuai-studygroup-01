# 로컬 개발 환경

## 사전 요구사항

- Node.js `24.11.0` (`.nvmrc`)
- npm `11.6.1`
- Docker Desktop
- macOS 네이티브 Ollama

Ollama는 macOS Docker Desktop에서 GPU 가속을 사용할 수 없으므로 Docker Compose에 포함하지 않는다. PostgreSQL과 MinIO만 컨테이너로 실행한다.

## 초기 설정

```bash
nvm use
npm install
cp .env.example .env
docker compose up -d
npm run db:generate
npm run db:deploy
ollama pull qwen3.5:2b
```

`db:generate`는 Prisma Client를 생성하고 `db:deploy`는 저장소에 커밋된 마이그레이션을 로컬 DB에 적용한다. Prisma 스키마를 직접 변경해 새 마이그레이션을 만들 때만 `npm run db:migrate -- --name <이름>`을 사용한다.

`.env`의 다음 값은 직접 설정한다.

- `BETTER_AUTH_SECRET`: 32바이트 이상의 무작위 값
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth Web Client 자격 증명
- `INITIAL_ADMIN_EMAIL`: 관리자 bootstrap 대상 부산대학교 이메일

Google Cloud Console의 승인된 Redirect URI에는 다음 값을 등록한다.

```text
http://localhost:3000/api/auth/callback/google
```

로그인은 Google이 서명한 `hd=pusan.ac.kr` Workspace 클레임, `email_verified=true`, `@pusan.ac.kr` 이메일을 모두 통과해야 한다. 신규 사용자는 학생이며, 교수 허용 목록에 등록된 이메일만 교수로 생성된다.

최초 관리자는 자동 승격하지 않는다. `INITIAL_ADMIN_EMAIL`의 계정으로 한 번 로그인한 뒤 운영자가 다음 명령을 명시적으로 한 번 실행한다.

```bash
npm run db:bootstrap-admin
```

명령은 검증된 기존 사용자만 관리자로 승격한다. 마이그레이션이나 애플리케이션 시작 과정에서는 자동 실행되지 않는다.

외부 AI API는 사용하지 않는다. Ollama의 Cloud 기능은 비활성화한다.

```bash
launchctl setenv OLLAMA_NO_CLOUD 1
```

설정 후 Ollama 애플리케이션을 다시 시작한다.

## 실행

```bash
npm run dev
```

- 웹: `http://localhost:3000`
- PostgreSQL: `localhost:5432`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

만료된 미완료 업로드와 팀 삭제 등으로 발생한 Object Storage 삭제 작업은
다음 명령으로 재시도한다. 운영 환경에서는 이 명령을 주기 작업으로 실행한다.
`compose.yaml`은 재사용된 업로드 URL로 생긴 임시 객체도 최종 회수되도록
`staging/` prefix에 1일 만료 lifecycle을 설정한다. 운영 bucket에도 같은
lifecycle 규칙이 필수다.

```bash
npm run cleanup:uploads
```
- Ollama API: `http://127.0.0.1:11434`

## 상태 확인

```bash
docker compose ps
curl http://127.0.0.1:11434/api/tags
```

## 종료

```bash
docker compose down
```

`docker compose down`은 데이터를 보존한다. 로컬 DB와 업로드 데이터를 삭제하는 볼륨 제거 명령은 일반 개발 절차에 포함하지 않는다.
