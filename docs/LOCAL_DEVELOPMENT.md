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
cp .env.example .env.local
docker compose up -d
ollama pull qwen3.5:2b
```

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
