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
- `CRON_SECRET`: 마감 알림 작업 호출용 32자 이상의 별도 무작위 값

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
관리자는 로그인 후 `/admin/professors`에서 교수 이메일을 사전 등록하거나 권한을 회수한다.
`/admin/users`에서는 계정을 비활성화하고 기존 세션을 종료하며, `/admin/audit`에서 중요 운영 변경을 확인한다.
운영 학기는 `/admin/academic-cycles`에서 등록하고, 캡스톤 디자인·대회·교육 프로그램은 `/admin/programs`에서 이름과 분류를 자유롭게 입력해 개설한다. 공개 상태인 프로그램에만 교수가 주제를 등록할 수 있다.

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
- Ollama API: `http://127.0.0.1:11434`

만료된 미완료 업로드와 팀 삭제 등으로 발생한 Object Storage 삭제 작업은
서버 런타임이 주기적으로 정리한다. 다음 명령은 수동 복구가 필요할 때 실행한다.
`compose.yaml`은 재사용된 업로드 URL로 생긴 임시 객체도 최종 회수되도록
`staging/` prefix에 1일 만료 lifecycle을 설정한다. 운영 bucket에도 같은
lifecycle 규칙이 필수다.

```bash
npm run cleanup:uploads
```

동적 프로그램과 하위 상태의 통합 검증은 격리된 로컬 DB에서 다음과 같이 실행한다.

```bash
ALLOW_LOCAL_PROGRAM_TEST=true npm run verify:project-program
```

화면과 사용자 흐름을 현실적인 데이터로 확인하려면 로컬 전용 데모 데이터를 넣는다.
명령은 고정된 데모 레코드만 다시 만들며 기존 로그인 계정과 사용자가 만든 데이터는
삭제하지 않는다.

```bash
ALLOW_LOCAL_DEMO_SEED=true DEMO_VIEWER_EMAIL=<로그인한 학생 이메일> npm run db:seed-demo
```

데모 데이터에는 2026년 캡스톤·해커톤·AI 교육 프로그램의 공개 주제 6개,
진행 팀과 팀원 모집, 마일스톤·교수 의견, 2022–2025년 종료 프로젝트
12개의 승인된 최종 보고서와 공개 결과물이 포함된다. 데모 관리자와 교수 허용 목록,
보고서 승인·팀 종료 감사 이력도 함께 생성되어 운영 화면까지 빈 상태 없이 검증할 수 있다.
`DEMO_VIEWER_EMAIL`을 지정하면 해당 로컬 학생 계정에 프로젝트 프로필, 구성 중인 팀, 모집 지원자와 알림 이력도 연결한다.

7일 이내의 마일스톤·수행·제출 마감 알림은 다음 명령으로 생성한다. 같은 마감 알림은 재실행해도 중복되지 않는다.

```bash
npm run notifications:deadlines
```

종료된 팀의 주제, 참여자와 공개 결과물은 로그인 후 `/topics?view=past`에서 수행 연도별로
검색하고 열람한다. 이 제품에서 연도별 `backup`은 기술 백업 명령이 아니라 지난
프로젝트를 계속 찾아볼 수 있게 보존하는 아카이브 기능을 뜻한다.

## 상태 확인

```bash
docker compose ps
curl http://127.0.0.1:11434/api/tags
curl http://localhost:3000/api/health/live
curl http://localhost:3000/api/health/ready
```

## 종료

```bash
docker compose down
```

`docker compose down`은 데이터를 보존한다. 로컬 DB와 업로드 데이터를 삭제하는 볼륨 제거 명령은 일반 개발 절차에 포함하지 않는다.
