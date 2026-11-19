# GitHub 링크로 프로젝트 카드 채우기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학생이 GitHub 링크를 넣으면 PMS 가 README 를 읽어 프로젝트 제목, 설명, 대표 이미지를 채운다.

**Architecture:** README 를 읽는 순수 함수는 새 모듈 `src/modules/github-readme/domain` 에 두고 아카이브 스크립트와 함께 쓴다. GitHub API 호출과 그림 받기는 같은 모듈 infrastructure 에 두고, 대표 이미지는 서버가 받은 그림을 stored_file(READY) 로 만든 뒤 기존 `ArtifactManagementService.setThumbnail` 로 붙인다. 권한, 이전 파일 정리, ATTACHED 승격은 기존 코드가 그대로 맡는다.

**Tech Stack:** Next.js 16 서버 액션, Prisma 7, AWS SDK S3(MinIO), vitest.

**설계 문서:** `docs/superpowers/specs/2026-11-18-github-readme-showcase-design.md`

**설계에서 바꾼 것 (이 계획 기준):**
- 프로그램 옵션 "개인 프로젝트 바로 올리기"(1인 팀 자동, 승인 없이 공개)는 따로 계획한다. 이 계획만으로도 기존 학생 등록 흐름과 자료 추가에서 동작한다.
- 만들기 화면은 제목과 설명을 미리 채우기만 한다. 링크 저장은 팀이 확정된 뒤 자료 추가에서 한다(지금 등록 흐름은 승인 전에 팀과 결과물이 없다).
- "다시 가져오기"는 후보를 고르는 단계 없이 README 첫 그림으로 바로 바꾼다. 마음에 안 들면 학생이 이미지를 다시 올린다.
- 그림 형식은 기존 검사(`detectRasterImageType`)가 받는 PNG, JPEG, WebP 만. GIF 는 뺀다.
- README 템플릿 판정은 따로 만들지 않는다. 기존 `readmeTitleAndSummary` 가 소제목과 팀 소개를 이미 건너뛴다.

**작업 위치:** 워크트리 `.claude/worktrees/docs+agentic-readme`, 브랜치 `docs/agentic-github-readme`(이름은 PR 때 `feat/github-readme-card` 로 바꿔도 된다). 처음이면 `npm ci`, 메인 폴더 `.env` 복사, `npm run db:generate`.

**시험 실행:** `node --env-file=.env node_modules/vitest/vitest.mjs run <파일>` (vitest 는 .env 를 스스로 읽지 않는다).

---

## 파일 구조

| 파일 | 할 일 |
| --- | --- |
| Create `src/modules/github-readme/domain/readme.ts` | README 제목, 요약, 첫 그림 추출, 레포 주소 해석, 허용 주소 검사. `@/` 를 가져오지 않는다(시드 이미지에서도 돈다) |
| Create `src/modules/github-readme/domain/readme.test.ts` | 위 함수 시험 |
| Modify `scripts/github-archive.ts` | 옮긴 함수를 지우고 새 모듈에서 다시 내보낸다 |
| Modify `Dockerfile` | demo-seeder 단계에 새 domain 폴더 COPY |
| Create `src/modules/github-readme/infrastructure/github-readme-client.ts` | GitHub API 로 README 읽기, 그림 받기(허용 주소, 리다이렉트, 시간, 크기 제한) |
| Create `src/modules/github-readme/infrastructure/github-readme-client.test.ts` | 가짜 fetch 로 시험 |
| Create `src/modules/github-readme/infrastructure/github-thumbnail-import.ts` | 빈 대표 이미지 채우기와 다시 가져오기 |
| Create `src/modules/github-readme/ui/github-readme-messages.ts` | 결과 코드별 안내 문구 |
| Create `src/app/_actions/github-readme-actions.ts` | 만들기 화면용 README 미리보기 서버 액션 |
| Modify `src/app/projects/[projectId]/_actions/team-report-actions.ts` | 결과물 등록 뒤 채우기, 다시 가져오기 액션 |
| Modify `src/modules/topic/ui/topic-form.tsx` | 학생 등록 2단계에 GitHub 칸과 가져오기 버튼 |
| Modify `src/app/projects/[projectId]/_components/showcase-manager.tsx` | "GitHub 에서 가져오기" 버튼 |
| Modify `src/app/projects/[projectId]/artifacts/page.tsx` | 쇼케이스 관리자에 GitHub 주소 넘기기 |
| Modify `src/shared/i18n/ui-messages.en.json` | 새 한국어 문구의 영어 |

---

### Task 1: README 함수를 domain 모듈로 옮기기

**Files:**
- Create: `src/modules/github-readme/domain/readme.ts`
- Modify: `scripts/github-archive.ts`
- Modify: `Dockerfile:43-44`

- [ ] **Step 1: 새 파일을 만들고 함수를 옮긴다**

`scripts/github-archive.ts` 에서 아래를 **그대로 잘라** `src/modules/github-readme/domain/readme.ts` 로 옮긴다. 하나도 고치지 않는다.

- 상수: `GENERIC_HEADING`, `GOAL_HEADING`, `ANY_HEADING`, `TEAM_HEADING`, `TOP_HEADING`, `LABEL_LINE`, `CLASSROOM_DESCRIPTION`, `EMAIL`, `STUDENT_ID`, `PHONE`, `SUMMARY_LENGTH`
- 함수: `plainText`, `scrubPersonalInfo`, `truncate`, `firstParagraph`, `readmeTitleAndSummary`, `pickTitle`, `normalizeRepoUrl`

`TEMPLATE_REPO`, `isTemplateRepo`, `compareSnapshotRepos`, `mergeSnapshot`, `stableArchiveId`, 타입은 스크립트에 남긴다.

새 파일 맨 위 주석:

```ts
// GitHub README 에서 카드에 쓸 값을 뽑는 순수 함수.
// 앱(프로젝트 카드 채우기)과 아카이브 이관 스크립트가 함께 쓴다. 스크립트는 운영 시드 이미지에서
// 돌고 그 이미지에는 `@/` 경로 해석이 없다. 그래서 이 파일은 `@/` 를 가져오지 않는다.
```

- [ ] **Step 2: 스크립트에서 다시 내보낸다**

`scripts/github-archive.ts` 의 `import { createHash } from "node:crypto";` 아래에 추가:

```ts
export { normalizeRepoUrl, pickTitle, readmeTitleAndSummary, scrubPersonalInfo } from "../src/modules/github-readme/domain/readme";
```

- [ ] **Step 3: 시드 이미지에 폴더를 넣는다**

`Dockerfile` 의 `COPY src/shared/infrastructure/object-storage ./src/shared/infrastructure/object-storage` 다음 줄에 추가:

```dockerfile
COPY src/modules/github-readme/domain ./src/modules/github-readme/domain
```

- [ ] **Step 4: 기존 시험이 그대로 통과하는지 본다**

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run scripts/github-archive.test.ts`
Expected: PASS (옮기기 전과 같은 개수)

Run: `npx tsc --noEmit`
Expected: 오류 없음

- [ ] **Step 5: Commit**

```bash
git add src/modules/github-readme/domain/readme.ts scripts/github-archive.ts Dockerfile
git commit -m "refactor: README 추출 함수를 github-readme 모듈로 옮긴다"
```

---

### Task 2: 레포 주소 해석, 첫 그림 찾기, 허용 주소 검사

**Files:**
- Modify: `src/modules/github-readme/domain/readme.ts`
- Test: `src/modules/github-readme/domain/readme.test.ts`

- [ ] **Step 1: 실패하는 시험을 쓴다**

```ts
import { describe, expect, it } from "vitest";

import { firstReadmeImage, isAllowedGithubAssetUrl, parseGithubRepo } from "@/modules/github-readme/domain/readme";

const source = { owner: "alice", repo: "agent", branch: "main" };

describe("parseGithubRepo", () => {
  it("레포 주소에서 owner 와 repo 를 뽑는다", () => {
    expect(parseGithubRepo("https://github.com/Alice/Agent")).toEqual({ owner: "alice", repo: "agent" });
    expect(parseGithubRepo("https://github.com/alice/agent.git")).toEqual({ owner: "alice", repo: "agent" });
    expect(parseGithubRepo("https://github.com/alice/agent/tree/main/src")).toEqual({ owner: "alice", repo: "agent" });
  });

  it("GitHub 레포가 아니면 null", () => {
    expect(parseGithubRepo("https://gitlab.com/alice/agent")).toBeNull();
    expect(parseGithubRepo("https://github.com/alice")).toBeNull();
    expect(parseGithubRepo("not a url")).toBeNull();
  });
});

describe("isAllowedGithubAssetUrl", () => {
  it("GitHub 그림 주소만 받는다", () => {
    expect(isAllowedGithubAssetUrl("https://raw.githubusercontent.com/alice/agent/main/a.png")).toBe(true);
    expect(isAllowedGithubAssetUrl("https://github.com/user-attachments/assets/1234")).toBe(true);
    expect(isAllowedGithubAssetUrl("https://private-user-images.githubusercontent.com/1/a.png?jwt=x")).toBe(true);
    expect(isAllowedGithubAssetUrl("https://github.com/alice/agent")).toBe(false);
    expect(isAllowedGithubAssetUrl("https://i.imgur.com/a.png")).toBe(false);
    expect(isAllowedGithubAssetUrl("http://raw.githubusercontent.com/a.png")).toBe(false);
    expect(isAllowedGithubAssetUrl("https://raw.githubusercontent.com:8443/a.png")).toBe(false);
    expect(isAllowedGithubAssetUrl("https://user@raw.githubusercontent.com/a.png")).toBe(false);
  });
});

describe("firstReadmeImage", () => {
  it("상대 경로를 기본 브랜치 원본 주소로 바꾼다", () => {
    expect(firstReadmeImage("# 제목\n\n![화면](./docs/screen.png)", source))
      .toBe("https://raw.githubusercontent.com/alice/agent/main/docs/screen.png");
  });

  it("배지는 건너뛰고 문서 순서대로 첫 그림을 고른다", () => {
    const markdown = [
      "![build](https://img.shields.io/badge/build-passing-green)",
      "<img src=\"images/main.webp\" width=\"600\">",
      "![두번째](second.png)",
    ].join("\n");
    expect(firstReadmeImage(markdown, source)).toBe("https://raw.githubusercontent.com/alice/agent/main/images/main.webp");
  });

  it("blob 주소는 raw 주소로 바꾼다", () => {
    expect(firstReadmeImage("![a](https://github.com/alice/agent/blob/main/a.png?raw=true)", source))
      .toBe("https://raw.githubusercontent.com/alice/agent/main/a.png");
  });

  it("허용 목록 밖 그림과 상위 경로는 버린다", () => {
    expect(firstReadmeImage("![a](https://i.imgur.com/a.png)\n![b](../b.png)", source)).toBeNull();
  });

  it("그림이 없으면 null", () => {
    expect(firstReadmeImage("# 제목\n\n설명만 있다.", source)).toBeNull();
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run src/modules/github-readme/domain/readme.test.ts`
Expected: FAIL, `parseGithubRepo` 등이 export 되지 않음

- [ ] **Step 3: 구현한다**

`src/modules/github-readme/domain/readme.ts` 끝에 추가:

```ts
export type GithubRepo = { owner: string; repo: string };

/** 레포 주소에서 owner 와 repo 를 뽑는다. 하위 경로와 .git 은 normalizeRepoUrl 이 걷어 낸다. */
export function parseGithubRepo(url: string): GithubRepo | null {
  const match = normalizeRepoUrl(url).match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)$/);
  return match ? { owner: match[1]!, repo: match[2]! } : null;
}

const ASSET_HOSTS = new Set([
  "raw.githubusercontent.com",
  "user-images.githubusercontent.com",
  "private-user-images.githubusercontent.com",
  "objects.githubusercontent.com",
]);

/**
 * 서버가 대신 받아도 되는 그림 주소인지 본다. 서버가 남의 주소를 받는 기능이라
 * 학생이 README 에 내부망 주소를 적어 서버를 찌르지 못하게 GitHub 그림 호스트로 묶는다.
 */
export function isAllowedGithubAssetUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  if (ASSET_HOSTS.has(url.hostname)) return true;
  return url.hostname === "github.com" && url.pathname.startsWith("/user-attachments/");
}

const MARKDOWN_IMAGE = /!\[[^\]]*\]\(\s*<?([^)\s>]+)/g;
const HTML_IMAGE = /<img\b[^>]*?\ssrc\s*=\s*["']([^"']+)["']/gi;
const BADGE_IMAGE = /shields\.io|badgen\.net|badge|codecov\.io|travis-ci|\/actions\/workflows\//i;

function resolveReadmeImage(src: string, source: GithubRepo & { branch: string }): string | null {
  const blob = src.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^?#]+)/);
  if (blob) return `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}`;
  if (/^[a-z][a-z\d+.-]*:/i.test(src) || src.startsWith("//")) return src;
  const path = src.replace(/[?#].*$/, "").replace(/^\.?\//, "");
  if (!path || path.split("/").includes("..")) return null;
  return `https://raw.githubusercontent.com/${source.owner}/${source.repo}/${source.branch}/${path}`;
}

/** README 의 첫 그림을 받을 수 있는 주소로 돌려준다. 배지와 허용 목록 밖 주소는 건너뛴다. */
export function firstReadmeImage(markdown: string, source: GithubRepo & { branch: string }): string | null {
  const candidates = [...markdown.matchAll(MARKDOWN_IMAGE), ...markdown.matchAll(HTML_IMAGE)]
    .sort((left, right) => left.index - right.index)
    .map((match) => match[1]!);
  for (const candidate of candidates) {
    if (BADGE_IMAGE.test(candidate)) continue;
    const resolved = resolveReadmeImage(candidate, source);
    if (resolved && isAllowedGithubAssetUrl(resolved)) return resolved;
  }
  return null;
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run src/modules/github-readme/domain/readme.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/github-readme/domain
git commit -m "feat: README 첫 그림과 레포 주소를 읽는다"
```

---

### Task 3: GitHub 클라이언트

**Files:**
- Create: `src/modules/github-readme/infrastructure/github-readme-client.ts`
- Test: `src/modules/github-readme/infrastructure/github-readme-client.test.ts`

- [ ] **Step 1: 실패하는 시험을 쓴다**

```ts
import { describe, expect, it, vi } from "vitest";

import { downloadGithubImage, fetchGithubReadme, GITHUB_IMAGE_MAX_BYTES } from "@/modules/github-readme/infrastructure/github-readme-client";

const repo = { owner: "alice", repo: "agent" };
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

function fakeFetch(routes: Record<string, () => Response>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const route = routes[url];
    if (!route) throw new Error(`unexpected ${url}`);
    return route();
  }) as unknown as typeof fetch;
}

describe("fetchGithubReadme", () => {
  it("제목, 요약, 첫 그림을 돌려준다", async () => {
    const fetch = fakeFetch({
      "https://api.github.com/repos/alice/agent": () => Response.json({ default_branch: "dev", description: null, name: "agent" }),
      "https://api.github.com/repos/alice/agent/readme": () => new Response("# 일정 비서\n\n메일을 읽고 일정을 잡는 에이전트.\n\n![화면](shot.png)"),
    });
    await expect(fetchGithubReadme(repo, { fetch })).resolves.toEqual({
      ok: true,
      preview: {
        title: "일정 비서",
        summary: "메일을 읽고 일정을 잡는 에이전트.",
        imageUrl: "https://raw.githubusercontent.com/alice/agent/dev/shot.png",
      },
    });
  });

  it("레포가 없거나 비공개면 NOT_FOUND", async () => {
    const fetch = fakeFetch({ "https://api.github.com/repos/alice/agent": () => new Response("", { status: 404 }) });
    await expect(fetchGithubReadme(repo, { fetch })).resolves.toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("README 가 없으면 NO_README", async () => {
    const fetch = fakeFetch({
      "https://api.github.com/repos/alice/agent": () => Response.json({ default_branch: "main", name: "agent" }),
      "https://api.github.com/repos/alice/agent/readme": () => new Response("", { status: 404 }),
    });
    await expect(fetchGithubReadme(repo, { fetch })).resolves.toEqual({ ok: false, reason: "NO_README" });
  });

  it("한도 초과와 네트워크 오류는 UNAVAILABLE", async () => {
    const limited = fakeFetch({ "https://api.github.com/repos/alice/agent": () => new Response("", { status: 403 }) });
    await expect(fetchGithubReadme(repo, { fetch: limited })).resolves.toEqual({ ok: false, reason: "UNAVAILABLE" });
    const broken = vi.fn(async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
    await expect(fetchGithubReadme(repo, { fetch: broken })).resolves.toEqual({ ok: false, reason: "UNAVAILABLE" });
  });

  it("토큰이 있으면 Authorization 을 붙인다", async () => {
    const fetch = fakeFetch({ "https://api.github.com/repos/alice/agent": () => new Response("", { status: 404 }) });
    await fetchGithubReadme(repo, { fetch, token: "t0ken" });
    const init = vi.mocked(fetch).mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t0ken");
  });
});

describe("downloadGithubImage", () => {
  const url = "https://raw.githubusercontent.com/alice/agent/main/a.png";

  it("PNG 를 받는다", async () => {
    const fetch = fakeFetch({ [url]: () => new Response(PNG) });
    await expect(downloadGithubImage(url, { fetch })).resolves.toEqual({ bytes: PNG, contentType: "image/png" });
  });

  it("허용 주소 안의 리다이렉트는 따라간다", async () => {
    const attachment = "https://github.com/user-attachments/assets/1";
    const signed = "https://private-user-images.githubusercontent.com/1/a.png?jwt=x";
    const fetch = fakeFetch({
      [attachment]: () => new Response(null, { status: 302, headers: { location: signed } }),
      [signed]: () => new Response(PNG),
    });
    await expect(downloadGithubImage(attachment, { fetch })).resolves.toEqual({ bytes: PNG, contentType: "image/png" });
  });

  it("허용 주소 밖으로 가는 리다이렉트는 거부한다", async () => {
    const fetch = fakeFetch({ [url]: () => new Response(null, { status: 302, headers: { location: "http://169.254.169.254/" } }) });
    await expect(downloadGithubImage(url, { fetch })).resolves.toBeNull();
  });

  it("허용 목록 밖 주소는 요청하지 않는다", async () => {
    const fetch = fakeFetch({});
    await expect(downloadGithubImage("https://i.imgur.com/a.png", { fetch })).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("5MB 를 넘거나 그림이 아니면 null", async () => {
    const big = fakeFetch({ [url]: () => new Response(new Uint8Array(GITHUB_IMAGE_MAX_BYTES + 1)) });
    await expect(downloadGithubImage(url, { fetch: big })).resolves.toBeNull();
    const svg = fakeFetch({ [url]: () => new Response("<svg xmlns=\"http://www.w3.org/2000/svg\"/>") });
    await expect(downloadGithubImage(url, { fetch: svg })).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run src/modules/github-readme/infrastructure/github-readme-client.test.ts`
Expected: FAIL, 모듈 없음

- [ ] **Step 3: 구현한다**

```ts
import { detectRasterImageType, type RasterImageType } from "@/modules/file/domain/upload-policy";
import {
  firstReadmeImage,
  isAllowedGithubAssetUrl,
  pickTitle,
  readmeTitleAndSummary,
  type GithubRepo,
} from "@/modules/github-readme/domain/readme";

export type ReadmePreview = { title: string; summary: string; imageUrl: string | null };
export type ReadmeFailure = "NOT_FOUND" | "NO_README" | "UNAVAILABLE";
export type ReadmeResult = { ok: true; preview: ReadmePreview } | { ok: false; reason: ReadmeFailure };

export const GITHUB_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 8_000;
const README_MAX_CHARS = 200_000;
const MAX_REDIRECTS = 3;

type ClientOptions = { fetch?: typeof fetch; token?: string };

function headers(accept: string, token?: string): Record<string, string> {
  return {
    Accept: accept,
    "User-Agent": "pnu-aipms",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** 공개 레포의 README 를 읽어 카드 후보를 만든다. 비로그인 한도는 서버 IP 당 시간당 60회다. */
export async function fetchGithubReadme(repo: GithubRepo, options: ClientOptions = {}): Promise<ReadmeResult> {
  const request = options.fetch ?? fetch;
  const base = `https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`;
  try {
    const repoResponse = await request(base, {
      headers: headers("application/vnd.github+json", options.token),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (repoResponse.status === 404) return { ok: false, reason: "NOT_FOUND" };
    if (!repoResponse.ok) return { ok: false, reason: "UNAVAILABLE" };
    const meta = (await repoResponse.json()) as { default_branch?: string; description?: string | null; name?: string };

    const readmeResponse = await request(`${base}/readme`, {
      headers: headers("application/vnd.github.raw", options.token),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (readmeResponse.status === 404) return { ok: false, reason: "NO_README" };
    if (!readmeResponse.ok) return { ok: false, reason: "UNAVAILABLE" };
    const markdown = (await readmeResponse.text()).slice(0, README_MAX_CHARS);

    const { title, summary } = readmeTitleAndSummary(markdown);
    return {
      ok: true,
      preview: {
        title: pickTitle({ readmeTitle: title, description: meta.description ?? null, repoName: meta.name ?? repo.repo }).slice(0, 200),
        summary,
        imageUrl: firstReadmeImage(markdown, { ...repo, branch: meta.default_branch ?? "main" }),
      },
    };
  } catch {
    return { ok: false, reason: "UNAVAILABLE" };
  }
}

async function readCapped(body: ReadableStream<Uint8Array>, max: number): Promise<Uint8Array | null> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * README 그림을 받는다. 리다이렉트는 손으로 따라가며 매번 허용 주소를 다시 본다.
 * 형식은 앞 바이트로 판단한다(PNG, JPEG, WebP). SVG 는 받지 않는다.
 */
export async function downloadGithubImage(
  url: string,
  options: ClientOptions = {},
): Promise<{ bytes: Uint8Array; contentType: RasterImageType } | null> {
  const request = options.fetch ?? fetch;
  let current = url;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      if (!isAllowedGithubAssetUrl(current)) return null;
      const response = await request(current, {
        redirect: "manual",
        headers: { "User-Agent": "pnu-aipms" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return null;
        current = new URL(location, current).toString();
        continue;
      }
      if (!response.ok || !response.body) return null;
      if (Number(response.headers.get("content-length") ?? 0) > GITHUB_IMAGE_MAX_BYTES) return null;
      const bytes = await readCapped(response.body, GITHUB_IMAGE_MAX_BYTES);
      if (!bytes) return null;
      const contentType = detectRasterImageType(bytes);
      return contentType ? { bytes, contentType } : null;
    }
    return null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run src/modules/github-readme/infrastructure/github-readme-client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/github-readme/infrastructure
git commit -m "feat: GitHub README 와 그림을 받는 클라이언트"
```

---

### Task 4: 대표 이미지 채우기

**Files:**
- Create: `src/modules/github-readme/infrastructure/github-thumbnail-import.ts`
- Create: `src/modules/github-readme/ui/github-readme-messages.ts`

DB 와 MinIO 가 필요한 흐름이라 단위 시험 대신 Task 7 에서 로컬로 직접 확인한다. 판단 로직(주소, README, 그림)은 Task 2, 3 시험이 덮는다.

- [ ] **Step 1: 채우기 함수를 쓴다**

```ts
import { createHash, randomUUID } from "node:crypto";

import { PutObjectCommand } from "@aws-sdk/client-s3";

import { parseGithubRepo } from "@/modules/github-readme/domain/readme";
import { downloadGithubImage, fetchGithubReadme, type ReadmeFailure } from "@/modules/github-readme/infrastructure/github-readme-client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { ArtifactManagementService } from "@/modules/report/application/manage-reports";
import { PrismaArtifactRepository } from "@/modules/report/infrastructure/prisma-artifact-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { objectStorageBucket, s3 } from "@/shared/infrastructure/object-storage/s3";

export type GithubThumbnailResult = "FILLED" | "SKIPPED" | "FORBIDDEN" | "NO_REPO" | "NO_IMAGE" | ReadmeFailure;

/**
 * README 첫 그림을 프로젝트 대표 이미지로 넣는다.
 *
 * replace 가 false 면 빈 칸만 채운다. 대표 이미지가 있거나 쇼케이스 사진을 하나라도 올린
 * 팀은 건너뛴다. 학생이 직접 넣은 그림을 덮지 않기 위해서다.
 *
 * 받은 그림은 학생이 올린 것과 같은 READY 파일로 만든 뒤 기존 setThumbnail 로 붙인다.
 * 권한, ATTACHED 승격, 이전 대표 이미지 정리를 그쪽이 맡는다. 붙이기에 실패한 READY 파일은
 * 정리 작업이 지운다.
 */
export async function importGithubThumbnail(
  actor: CurrentActor,
  input: { teamId: string; repoUrl: string; replace: boolean },
  now = new Date(),
): Promise<GithubThumbnailResult> {
  const repo = parseGithubRepo(input.repoUrl);
  if (!repo) return "NO_REPO";

  const team = await prisma.projectTeam.findUnique({
    where: { id: input.teamId },
    select: {
      project: { select: { thumbnailPath: true } },
      memberships: { where: { userId: actor.id, endedAt: null }, select: { id: true } },
      _count: { select: { artifacts: { where: { type: "IMAGE" } } } },
    },
  });
  // 남의 팀에 그림을 받아 두는 일이 없게 GitHub 를 부르기 전에 먼저 막는다.
  if (!team || (actor.role !== "ADMIN" && team.memberships.length === 0)) return "FORBIDDEN";
  if (!input.replace && (team.project.thumbnailPath || team._count.artifacts > 0)) return "SKIPPED";

  const readme = await fetchGithubReadme(repo, { token: process.env.GITHUB_TOKEN || undefined });
  if (!readme.ok) return readme.reason;
  if (!readme.preview.imageUrl) return "NO_IMAGE";
  const image = await downloadGithubImage(readme.preview.imageUrl);
  if (!image) return "NO_IMAGE";

  const fileId = randomUUID();
  const objectKey = `teams/${input.teamId}/files/${fileId}`;
  const digest = createHash("sha256").update(image.bytes);
  const sha256 = digest.copy().digest("hex");
  await s3.send(new PutObjectCommand({
    Bucket: objectStorageBucket,
    Key: objectKey,
    Body: image.bytes,
    ContentType: image.contentType,
    ChecksumSHA256: digest.digest("base64"),
  }));
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  await prisma.storedFile.create({
    data: {
      id: fileId,
      objectKey,
      uploadObjectKey: `staging/${input.teamId}/${fileId}`,
      projectTeamId: input.teamId,
      ownerId: actor.id,
      purpose: "ARTIFACT",
      consumer: "ARTIFACT",
      status: "READY",
      originalName: `${repo.repo}-readme`,
      contentType: image.contentType,
      size: image.bytes.length,
      sha256,
      expiresAt,
      // 제약: cleanupAfter 는 expiresAt 보다 하루 이상 뒤
      cleanupAfter: new Date(expiresAt.getTime() + 24 * 60 * 60 * 1000),
      readyAt: now,
    },
  });
  await new ArtifactManagementService(new PrismaArtifactRepository(prisma)).setThumbnail(actor, { teamId: input.teamId, fileId }, now);
  return "FILLED";
}
```

- [ ] **Step 2: 안내 문구를 쓴다**

`src/modules/github-readme/ui/github-readme-messages.ts`:

```ts
import type { GithubThumbnailResult } from "@/modules/github-readme/infrastructure/github-thumbnail-import";
import type { ReadmeFailure } from "@/modules/github-readme/infrastructure/github-readme-client";

export const README_FAILURE_MESSAGES: Record<ReadmeFailure | "NO_REPO", string> = {
  NO_REPO: "GitHub 레포 주소를 확인해 주세요. 예: https://github.com/아이디/레포",
  NOT_FOUND: "레포를 열 수 없어요. 공개 레포인지 확인하거나 칸을 직접 채워 주세요.",
  NO_README: "README 가 없어요. 칸을 직접 채워 주세요.",
  UNAVAILABLE: "GitHub 응답이 늦어요. 잠시 뒤 다시 눌러 주세요.",
};

export const GITHUB_THUMBNAIL_MESSAGES: Record<Exclude<GithubThumbnailResult, "FILLED" | "SKIPPED">, string> = {
  ...README_FAILURE_MESSAGES,
  FORBIDDEN: "이 프로젝트의 대표 이미지를 바꿀 권한이 없습니다.",
  NO_IMAGE: "README 에서 쓸 수 있는 그림을 찾지 못했어요. 대표 이미지를 직접 올려 주세요.",
};
```

`ui` 가 `infrastructure` 의 타입만 가져오는 것은 `import type` 이라 경계 시험(`tests/architecture/module-boundaries.test.ts`)에 걸리지 않는지 Step 3 에서 확인한다. 걸리면 두 타입을 `domain/readme.ts` 로 옮기고 infrastructure 가 거기서 가져오게 바꾼다.

- [ ] **Step 3: 타입과 경계 시험**

Run: `npx tsc --noEmit`
Expected: 오류 없음

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run tests/architecture`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/modules/github-readme
git commit -m "feat: README 첫 그림으로 빈 대표 이미지를 채운다"
```

---

### Task 5: 서버 액션

**Files:**
- Create: `src/app/_actions/github-readme-actions.ts`
- Modify: `src/app/projects/[projectId]/_actions/team-report-actions.ts`

`"use server"` 파일은 async 함수만 export 한다(객체나 상수를 export 하면 화면이 500, `tests/architecture/server-action-exports.test.ts`).

- [ ] **Step 1: 미리보기 액션**

`src/app/_actions/github-readme-actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";

import { parseGithubRepo } from "@/modules/github-readme/domain/readme";
import { fetchGithubReadme, type ReadmePreview } from "@/modules/github-readme/infrastructure/github-readme-client";
import { README_FAILURE_MESSAGES } from "@/modules/github-readme/ui/github-readme-messages";
import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";

/** 프로젝트 만들기 화면에서 README 로 제목과 설명을 미리 채운다. 아무것도 저장하지 않는다. */
export async function previewGithubReadmeAction(
  repoUrl: string,
): Promise<{ status: "success"; preview: ReadmePreview } | { status: "error"; message: string }> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const repo = parseGithubRepo(String(repoUrl).slice(0, 2048));
  if (!repo) return { status: "error", message: README_FAILURE_MESSAGES.NO_REPO };
  const result = await fetchGithubReadme(repo, { token: process.env.GITHUB_TOKEN || undefined });
  return result.ok
    ? { status: "success", preview: result.preview }
    : { status: "error", message: README_FAILURE_MESSAGES[result.reason] };
}
```

- [ ] **Step 2: 결과물 등록 뒤 빈 대표 이미지 채우기**

`team-report-actions.ts` 위쪽 import 에 추가:

```ts
import { importGithubThumbnail } from "@/modules/github-readme/infrastructure/github-thumbnail-import";
import { GITHUB_THUMBNAIL_MESSAGES } from "@/modules/github-readme/ui/github-readme-messages";
```

`registerArtifactAction` 의 `registerArtifact(...)` 호출이 끝난 뒤, `revalidatePath` 앞을 이렇게 바꾼다:

```ts
    // 소스 코드 링크가 GitHub 이면 README 첫 그림으로 빈 대표 이미지를 채운다.
    // 결과물 등록은 이미 끝났으므로 여기서 무엇이 실패해도 등록 결과는 성공이다.
    const thumbnail = parsed.data.type === "SOURCE_CODE" && parsed.data.externalUrl
      ? await importGithubThumbnail(actor, { teamId: parsed.data.teamId, repoUrl: parsed.data.externalUrl, replace: false }).catch(() => "UNAVAILABLE" as const)
      : null;
    revalidatePath("/projects", "layout");
    return {
      status: "success",
      message: thumbnail === "FILLED" ? "결과물을 등록했습니다. README 그림으로 대표 이미지를 채웠습니다." : "결과물을 등록했습니다.",
    };
```

(기존 `revalidatePath("/projects", "layout");` 와 `return { status: "success", message: "결과물을 등록했습니다." };` 두 줄을 위 블록으로 바꾼다.)

- [ ] **Step 3: 다시 가져오기 액션**

같은 파일 `setTeamThumbnailAction` 아래에 추가. `z` 가 import 되어 있지 않으면 `import { z } from "zod";` 를 더한다.

```ts
export async function importGithubThumbnailAction(formData: FormData): Promise<ReportActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = z.object({ teamId: z.string().uuid(), repoUrl: z.string().url().max(2048) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "GitHub 주소를 확인해 주세요." };
  try {
    const result = await importGithubThumbnail(actor, { ...parsed.data, replace: true });
    if (result === "FILLED") {
      revalidatePath("/projects", "layout");
      return { status: "success", message: "README 그림을 대표 이미지로 저장했습니다." };
    }
    if (result === "SKIPPED") return { status: "error", message: GITHUB_THUMBNAIL_MESSAGES.NO_IMAGE };
    return { status: "error", message: GITHUB_THUMBNAIL_MESSAGES[result] };
  } catch (error) {
    const expected = message(error);
    if (expected) return { status: "error", message: expected };
    throw error;
  }
}
```

(`replace: true` 라 SKIPPED 는 실제로 나오지 않지만 타입을 닫으려고 둔다.)

- [ ] **Step 4: 타입, 린트, 서버 액션 시험**

Run: `npx tsc --noEmit`
Expected: 오류 없음

Run: `npx eslint src/app/_actions/github-readme-actions.ts "src/app/projects/[projectId]/_actions/team-report-actions.ts"`
Expected: 오류 없음

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run tests/architecture "src/app/projects/[projectId]/_components/report-forms.test.tsx"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/_actions/github-readme-actions.ts "src/app/projects/[projectId]/_actions/team-report-actions.ts"
git commit -m "feat: GitHub 링크 등록 때 대표 이미지를 채우고 다시 가져오기를 둔다"
```

---

### Task 6: 화면

**Files:**
- Modify: `src/modules/topic/ui/topic-form.tsx` (학생 등록 2단계, `topic-title` 칸 바로 위)
- Modify: `src/app/projects/[projectId]/_components/showcase-manager.tsx`
- Modify: `src/app/projects/[projectId]/artifacts/page.tsx:132`
- Modify: `src/shared/i18n/ui-messages.en.json`

- [ ] **Step 1: 만들기 화면에 GitHub 칸**

`topic-form.tsx` 는 `src/modules/topic/ui` 라 `src/app` 의 액션을 직접 가져오지 못한다(경계 시험). `TopicFormProps` 에 선택 prop 을 더한다:

```ts
  previewGithubReadme?: (repoUrl: string) => Promise<{ status: "success"; preview: { title: string; summary: string } } | { status: "error"; message: string }>;
```

`StudentProjectRegistrationWizard` 의 구조 분해에 `previewGithubReadme` 를 더하고 상태를 둔다:

```ts
  const [repoUrl, setRepoUrl] = useState("");
  const [readmeMessage, setReadmeMessage] = useState("");
  const [readmePending, startReadme] = useTransition();

  function loadReadme() {
    if (!previewGithubReadme || !repoUrl.trim()) return;
    setReadmeMessage("");
    startReadme(async () => {
      const result = await previewGithubReadme(repoUrl.trim());
      if (result.status === "error") {
        setReadmeMessage(result.message);
        return;
      }
      // 학생이 이미 쓴 칸은 덮지 않는다.
      if (!title.trim()) setTitle(result.preview.title);
      if (!description.trim() && result.preview.summary) setDescription(result.preview.summary);
      setReadmeMessage("README 에서 제목과 설명을 가져왔습니다. 확인하고 고쳐 주세요.");
    });
  }
```

(`useTransition` 을 react import 에 더한다.)

`<FormField id="topic-title" ...>` 바로 위에 넣는다. 이 칸은 폼 값으로 보내지 않는다(`name` 없음).

```tsx
        {previewGithubReadme ? (
          <FormField id="topic-github" label="GitHub 레포" optional description="공개 레포 주소를 넣으면 README 로 제목과 설명을 채웁니다.">
            <div className="flex gap-2">
              <TextInput id="topic-github" type="url" inputMode="url" placeholder="https://github.com/아이디/레포" value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} />
              <button type="button" className="button-secondary shrink-0" onClick={loadReadme} disabled={readmePending || !repoUrl.trim()}>
                <UiText>{readmePending ? "가져오는 중" : "README 가져오기"}</UiText>
              </button>
            </div>
            {readmeMessage ? <p role="status" className="mt-2 text-sm text-[var(--muted)]"><UiText>{readmeMessage}</UiText></p> : null}
          </FormField>
        ) : null}
```


`src/app/topics/_components/project-registration-modal.tsx` 에서 `TopicForm` 에 넘긴다:

```tsx
import { previewGithubReadmeAction } from "@/app/_actions/github-readme-actions";
// ...
        <TopicForm
          action={createTopicAction}
          previewGithubReadme={previewGithubReadmeAction}
          // 나머지 prop 그대로
```

- [ ] **Step 2: 쇼케이스 화면에 다시 가져오기 버튼**

`showcase-manager.tsx` props 에 `githubUrl?: string` 을 더하고, import 에 `importGithubThumbnailAction` 을 더한다. 함수 추가:

```ts
  function importFromGithub() {
    if (!githubUrl) return;
    run(async () => {
      const data = new FormData();
      data.set("teamId", teamId);
      data.set("repoUrl", githubUrl);
      return importGithubThumbnailAction(data);
    });
  }
```

"이미지 교체/올리기" 버튼과 "삭제" 버튼 사이에 넣는다:

```tsx
              {githubUrl ? (
                <button type="button" className="button-quiet button-compact min-h-8 px-3 font-medium" disabled={pending} onClick={importFromGithub}>
                  <UiText>{"GitHub 에서 가져오기"}</UiText>
                </button>
              ) : null}
```

- [ ] **Step 3: 결과물 화면이 GitHub 주소를 넘긴다**

`artifacts/page.tsx` 에 import 추가:

```ts
import { parseGithubRepo } from "@/modules/github-readme/domain/readme";
```

`showcaseVideo` 정의 아래에 추가:

```ts
  const githubUrl = reportWorkspace.artifacts.find((artifact) => (
    artifact.type === "SOURCE_CODE" && artifact.externalUrl && parseGithubRepo(artifact.externalUrl)
  ))?.externalUrl ?? undefined;
```

`<ShowcaseManager ... images={showcaseImages} />` 에 `githubUrl={githubUrl}` 를 더한다.

- [ ] **Step 4: 영어 문구**

`src/shared/i18n/ui-messages.en.json` 에 가나다 순서 자리에 맞춰 추가(파일은 키 정렬):

```json
  "GitHub 레포": "GitHub repository",
  "GitHub 에서 가져오기": "Import from GitHub",
  "README 가져오기": "Import README",
  "README 에서 제목과 설명을 가져왔습니다. 확인하고 고쳐 주세요.": "Title and description were filled from the README. Please review and edit them.",
  "가져오는 중": "Importing",
  "공개 레포 주소를 넣으면 README 로 제목과 설명을 채웁니다.": "Enter a public repository URL to fill the title and description from its README.",
```

서버가 돌려주는 안내 문구(`README_FAILURE_MESSAGES`, `GITHUB_THUMBNAIL_MESSAGES`, 액션의 성공 문구)도 화면에 `UiText` 로 찍히면 같은 시험이 요구한다. Step 5 시험이 빠진 키를 알려 주면 그대로 더한다. 영어 예:

```json
  "GitHub 레포 주소를 확인해 주세요. 예: https://github.com/아이디/레포": "Check the GitHub repository URL. Example: https://github.com/user/repo",
  "GitHub 응답이 늦어요. 잠시 뒤 다시 눌러 주세요.": "GitHub is responding slowly. Please try again in a moment.",
  "GitHub 주소를 확인해 주세요.": "Check the GitHub URL.",
  "README 가 없어요. 칸을 직접 채워 주세요.": "No README found. Please fill in the fields yourself.",
  "README 그림을 대표 이미지로 저장했습니다.": "Saved the README image as the cover image.",
  "README 에서 쓸 수 있는 그림을 찾지 못했어요. 대표 이미지를 직접 올려 주세요.": "No usable image was found in the README. Please upload a cover image yourself.",
  "결과물을 등록했습니다. README 그림으로 대표 이미지를 채웠습니다.": "Artifact registered. The cover image was filled from the README.",
  "레포를 열 수 없어요. 공개 레포인지 확인하거나 칸을 직접 채워 주세요.": "Could not open the repository. Make sure it is public, or fill in the fields yourself.",
  "이 프로젝트의 대표 이미지를 바꿀 권한이 없습니다.": "You do not have permission to change this project's cover image.",
```

- [ ] **Step 5: 시험**

Run: `npx tsc --noEmit`
Expected: 오류 없음

Run: `npm run lint`
Expected: 오류 0

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run tests/architecture src/modules/topic "src/app/projects/[projectId]" src/app/topics`
Expected: PASS. `ui-localization` 이 빠진 키를 알려 주면 Step 4 처럼 더하고 다시 돌린다.

- [ ] **Step 6: Commit**

```bash
git add src/modules/topic/ui/topic-form.tsx src/app/topics/_components/project-registration-modal.tsx "src/app/projects/[projectId]/_components/showcase-manager.tsx" "src/app/projects/[projectId]/artifacts/page.tsx" src/shared/i18n/ui-messages.en.json
git commit -m "feat: 만들기 화면과 쇼케이스 화면에서 GitHub README 가져오기"
```

---

### Task 7: 로컬 확인과 전체 검사

화면 수정은 사용자가 로컬에서 확인한 뒤에만 푸시한다.

- [ ] **Step 1: 전체 검사**

Run: `npx tsc --noEmit` / `npm run lint` / `node --env-file=.env node_modules/vitest/vitest.mjs run`
Expected: 모두 통과. 실패하면 출력 그대로 보고한다.

- [ ] **Step 2: 개발 서버로 직접 확인**

Docker(DB, MinIO)를 띄우고 `npm run dev -- --port 3000`, 목 로그인 STUDENT 로 들어간다. GitHub 은 실제로 부른다(공개 레포, 예: 이미 아카이브에 들어간 `2026-PNU-AI-StudyGroup` 레포 중 README 에 그림이 있는 것).

1. 확정된 팀 프로젝트의 결과물 화면에서 대표 이미지와 사진이 없는 상태로 SOURCE_CODE 링크를 등록하면 "README 그림으로 대표 이미지를 채웠습니다" 가 뜨고 대표 이미지가 생긴다.
2. 대표 이미지가 있는 팀에서 링크를 등록하면 대표 이미지가 바뀌지 않는다.
3. "GitHub 에서 가져오기" 를 누르면 대표 이미지가 README 그림으로 바뀌고, 예전 파일 행이 지워진다(`stored_file` 에서 확인).
4. 프로젝트 등록 2단계에서 레포 주소를 넣고 "README 가져오기" 를 누르면 빈 제목과 설명이 채워진다. 이미 쓴 제목은 그대로다.
5. 없는 레포(`https://github.com/alice/__nope__`)는 "레포를 열 수 없어요" 가 뜨고 저장은 막히지 않는다.

- [ ] **Step 3: 사용자 확인 뒤 PR**

사용자에게 화면 확인을 받은 뒤 푸시하고 PR 을 연다. 제목 예: `feat: GitHub 링크로 프로젝트 카드 채우기`. 본문은 짧게 명사 위주, 운영 환경 변수 `GITHUB_TOKEN`(선택, 공개 레포 읽기 전용 토큰) 안내 한 줄.
