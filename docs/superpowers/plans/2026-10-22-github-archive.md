# 사업별 결과물 공개 아카이브 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 없이 열리는 `/archive` 에서 교육원 사업별 결과물을 카드로 보여 주고 GitHub 로 보낸다. 제5회 창의융합 SW해커톤(2024) 16팀을 GitHub 에서 긁어 지난 프로젝트로 넣는다.

**Architecture:** 크롤링 스크립트가 README 요약을 `scripts/github-archive/snapshot.json` 에 쓰고 PR 에서 사람이 고친다. 넣기 스크립트가 OPUS 이관과 같은 방식으로 스냅샷을 지난 프로그램과 프로젝트로 넣는다. `/archive` 는 기존 지난 프로젝트 조회에 이름 칸이 없는 공개용 조회 하나를 더해 그린다.

**Tech Stack:** Next.js 16 App Router(RSC), Prisma 7, Vitest, tsx, GitHub REST API.

설계: `docs/superpowers/specs/2026-10-21-github-archive-design.md`

---

## 시작 전에

- 워크트리: `C:\Users\owner\2026-pnuai-studygroup-01\.claude\worktrees\feat+repo-link-prominent`, 브랜치 `feat/github-archive`.
- 테스트는 `.env` 를 읽어야 수집 단계에서 안 깨진다. 항상 이렇게 돌린다.
  `node --env-file=.env node_modules/vitest/vitest.mjs run <파일>`
- `next dev`/`next build` 가 `next-env.d.ts` 를 고친다. 커밋 전에 `git checkout -- next-env.d.ts`.
- 이 레포의 규칙 두 가지가 구조를 정한다.
  - `tests/architecture/app-folder-structure.test.ts`: 한 최상위 라우트(`/archive`)는 다른 라우트의 `_components`, `_lib`(`/topics/...`)를 가져올 수 없다. 그래서 `/topics` 안에 있는 저장소 고르기, GitHub 아이콘, 숨김 졸업과제 상수를 모듈과 shared 로 옮긴다(Task 1, 2).
  - `tests/architecture/ui-localization.test.ts`: `src` 안의 한글 문자열 리터럴은 모두 `src/shared/i18n/ui-messages.en.json` 에 영어가 있어야 하고, 한글 JSX 텍스트는 `UiText` 로 감싸야 하며, `nav` 의 한글 `aria-label` 은 `UiNav` 를 써야 한다.
- 커밋 메시지에 `Co-Authored-By` 와 `#번호` 를 넣지 않는다.

## 파일 지도

| 파일 | 할 일 |
|---|---|
| `src/modules/team/domain/showcase-repository.ts` (새) | 화면에 내보일 저장소 고르기. `/topics` 에서 옮김 |
| `src/shared/ui/github-icon.tsx` (새) | GitHub 아이콘. `/topics` 에서 옮김 |
| `src/app/topics/_components/project-showcase-sections.tsx` | 위 두 개를 가져다 쓰고 저장소 고르기는 다시 내보냄 |
| `src/modules/project-program/domain/hidden-graduation-program.ts` (새) | 숨김 졸업과제 분류 상수. `/topics/_lib` 에서 옮김 |
| `src/app/topics/_lib/hidden-graduation-programs.ts` | 위 상수를 가져다 쓰고 다시 내보냄 |
| `src/modules/team/application/archive-projects.ts` | `PublicArchivedProject` 타입 |
| `src/modules/team/infrastructure/prisma-team-archive-query-repository.ts` | `listPublic()` |
| `src/modules/project-program/ui/program-sidebar-items.ts` | 대분류 정렬 함수의 인자 타입을 넓힘 |
| `src/app/archive/_lib/group-public-archive.ts` (새) | 탭, 연도, 프로그램으로 묶기 |
| `src/app/archive/_lib/graduation-project-links.ts` (새) | 졸업과제 GitHub 조직 링크 |
| `src/app/archive/_components/public-archive-card.tsx` (새) | 카드 |
| `src/app/archive/page.tsx` (새) | 공개 화면 |
| `src/app/_components/sign-in-landing.tsx` | 상단 메뉴와 하단에 링크 |
| `src/shared/i18n/ui-messages.en.json` | 새 문구 영어 |
| `scripts/github-archive.ts` (새) | 크롤링과 넣기가 같이 쓰는 순수 함수, 스냅샷 타입 |
| `scripts/crawl-github-archive.ts` (새) | GitHub 에서 긁어 스냅샷에 합침 |
| `scripts/github-archive/snapshot.json` (새, 생성물) | 크롤링 결과. PR 에서 사람이 고침 |
| `scripts/import-github-archive.ts` (새) | 스냅샷을 DB 에 넣음 |
| `compose.production.yaml` | 운영에서 넣기를 돌리는 `import-github` 서비스 |

---

### Task 1: 저장소 고르기와 GitHub 아이콘을 라우트 밖으로

**Files:**
- Create: `src/modules/team/domain/showcase-repository.ts`
- Create: `src/modules/team/domain/showcase-repository.test.ts`
- Create: `src/shared/ui/github-icon.tsx`
- Modify: `src/app/topics/_components/project-showcase-sections.tsx` (31~35행 `parseGithubRepo`, 37~39행 `GithubIcon`, 41~65행 `resolveShowcaseRepository`)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/modules/team/domain/showcase-repository.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { parseGithubRepo, resolveShowcaseRepository } from "@/modules/team/domain/showcase-repository";

describe("화면에 내보일 저장소 고르기", () => {
  it("주제에 적은 주소가 소스 코드 결과물보다 먼저다", () => {
    expect(resolveShowcaseRepository({
      sourceUrl: "https://github.com/org/from-topic",
      artifacts: [{ id: "a1", type: "SOURCE_CODE", externalUrl: "https://github.com/org/from-artifact" }],
    })).toEqual({ url: "https://github.com/org/from-topic", owner: "org", repo: "from-topic", artifactId: undefined });
  });

  it("주제 주소가 없으면 소스 코드 결과물을 쓴다", () => {
    expect(resolveShowcaseRepository({
      sourceUrl: null,
      artifacts: [{ id: "a1", type: "SOURCE_CODE", externalUrl: "https://github.com/org/repo.git" }],
    })).toEqual({ url: "https://github.com/org/repo.git", owner: "org", repo: "repo", artifactId: "a1" });
  });

  it("GitHub 저장소 주소가 아니면 고르지 않는다", () => {
    expect(resolveShowcaseRepository({ sourceUrl: "https://gitlab.com/org/repo", artifacts: [] })).toBeNull();
    expect(parseGithubRepo("https://github.com/only-org")).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run src/modules/team/domain/showcase-repository.test.ts`
Expected: FAIL, `Failed to resolve import "@/modules/team/domain/showcase-repository"`

- [ ] **Step 3: 모듈 작성**

`src/modules/team/domain/showcase-repository.ts`

```ts
export function parseGithubRepo(url: string | null | undefined): { owner: string; repo: string } | null {
  if (!url) return null;
  const match = url.match(/github\.com\/([^/\s]+)\/([^/?#\s]+)/i);
  return match ? { owner: match[1]!, repo: match[2]!.replace(/\.git$/i, "") } : null;
}

export type RepositoryArtifact = { id: string; type: string; externalUrl?: string | null };

/**
 * 화면에 내보일 저장소를 고른다.
 *
 * 주제에 적어 둔 주소가 먼저고, 없으면 소스 코드 결과물에서 찾는다. 심사가 리드미를
 * 읽고 이뤄지므로 프로젝트 상세 맨 위, 결과물 목록, 공개 아카이브 카드가 모두 이 값을 쓴다.
 * 서로 다른 저장소를 가리키지 않도록 고르는 자리를 하나로 둔다. 공개 아카이브는 다른
 * 라우트라 `/topics` 안의 코드를 가져갈 수 없어 모듈에 둔다.
 */
export function resolveShowcaseRepository(input: { artifacts: readonly RepositoryArtifact[]; sourceUrl?: string | null }): {
  url: string;
  owner: string;
  repo: string;
  artifactId?: string;
} | null {
  const sourceArtifact = input.artifacts.find(
    (artifact) => artifact.type === "SOURCE_CODE" && /github\.com/i.test(artifact.externalUrl ?? ""),
  );
  const url = /github\.com/i.test(input.sourceUrl ?? "") ? input.sourceUrl : sourceArtifact?.externalUrl;
  const parsed = parseGithubRepo(url);
  if (!parsed || !url) return null;
  return {
    url,
    ...parsed,
    artifactId: url === sourceArtifact?.externalUrl ? sourceArtifact?.id : undefined,
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run src/modules/team/domain/showcase-repository.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: GitHub 아이콘을 shared 로 옮긴다**

`src/shared/ui/github-icon.tsx` 를 만들고 `project-showcase-sections.tsx` 37~39행의 `GithubIcon` 함수를 **한 글자도 바꾸지 말고** 그대로 잘라 붙인다(svg path 포함). 파일 전체는 그 함수 하나다.

```tsx
export function GithubIcon({ className }: { className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 16 16" className={className}><path fill="currentColor" d="(원래 37~39행의 d 값 그대로)" /></svg>;
}
```

- [ ] **Step 6: `project-showcase-sections.tsx` 정리**

31~35행 `parseGithubRepo`, 37~39행 `GithubIcon`, 41~65행 `resolveShowcaseRepository`(위 주석 포함)를 지운다. 맨 위 import 묶음에 아래를 더한다.

```ts
import { resolveShowcaseRepository } from "@/modules/team/domain/showcase-repository";
import { GithubIcon } from "@/shared/ui/github-icon";
```

지운 자리(`toYoutubeEmbedUrl` 아래)에 다시 내보내기를 둔다. `topics/[topicId]/page.tsx` 와 `archived-project-detail.tsx` 가 여기서 가져가므로 그쪽은 손대지 않는다.

```ts
// 공개 아카이브도 같은 규칙을 써야 해서 고르는 자리를 모듈로 옮겼다. 상세 화면은 여기서 계속 가져간다.
export { resolveShowcaseRepository };
```

- [ ] **Step 7: 기존 화면 테스트와 타입 확인**

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run src/app/topics src/modules/team/domain`
Expected: PASS
Run: `npm run typecheck`
Expected: 오류 없음

- [ ] **Step 8: 커밋**

```bash
git add src/modules/team/domain/showcase-repository.ts src/modules/team/domain/showcase-repository.test.ts src/shared/ui/github-icon.tsx src/app/topics/_components/project-showcase-sections.tsx
git commit -m "refactor: 저장소 고르기와 GitHub 아이콘을 라우트 밖으로"
```

---

### Task 2: 숨김 졸업과제 분류를 모듈로

**Files:**
- Create: `src/modules/project-program/domain/hidden-graduation-program.ts`
- Modify: `src/app/topics/_lib/hidden-graduation-programs.ts`
- Test: `src/app/topics/_lib/hidden-graduation-programs.test.ts` (기존, 그대로 통과해야 함)

- [ ] **Step 1: 모듈 작성**

`src/modules/project-program/domain/hidden-graduation-program.ts`

```ts
// 내부 사정으로 현재 데모 데이터의 졸업과제 분류만 학생 탐색에서 숨긴다.
// 자유 텍스트를 추측하지 않아 이름에 "캡스톤"이 들어간 다른 분류를 오탐하지 않는다.
// 로그인 없이 보는 공개 아카이브도 이 분류를 빼야 해서 라우트 밖에 둔다.
export const HIDDEN_GRADUATION_PROGRAM_CATEGORY = "CSE 캡스톤 디자인";

export function isHiddenGraduationProgram(category: string): boolean {
  return category === HIDDEN_GRADUATION_PROGRAM_CATEGORY;
}
```

- [ ] **Step 2: 라우트 파일이 모듈을 쓰게 바꾼다**

`src/app/topics/_lib/hidden-graduation-programs.ts` 전체를 아래로 바꾼다. 기존 호출부와 테스트는 이 파일에서 그대로 가져간다.

```ts
import { isHiddenGraduationProgram } from "@/modules/project-program/domain/hidden-graduation-program";

export {
  HIDDEN_GRADUATION_PROGRAM_CATEGORY,
  isHiddenGraduationProgram,
} from "@/modules/project-program/domain/hidden-graduation-program";

// 학생에게만 졸업과제 프로그램을 제거한다. 교수·관리자에게는 그대로 노출.
export function hideGraduationProgramsForStudent<T extends { category: string }>(
  programs: T[],
  role: string,
): T[] {
  if (role !== "STUDENT") return programs;
  return programs.filter((program) => !isHiddenGraduationProgram(program.category));
}
```

- [ ] **Step 3: 기존 테스트 통과 확인**

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run src/app/topics/_lib/hidden-graduation-programs.test.ts`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add src/modules/project-program/domain/hidden-graduation-program.ts src/app/topics/_lib/hidden-graduation-programs.ts
git commit -m "refactor: 숨김 졸업과제 분류를 모듈로"
```

---

### Task 3: 공개용 지난 프로젝트 조회

**Files:**
- Modify: `src/modules/team/application/archive-projects.ts` (타입 추가)
- Modify: `src/modules/team/infrastructure/prisma-team-archive-query-repository.ts` (메서드, select, 변환 함수 추가)
- Test: `src/modules/team/infrastructure/prisma-team-archive-query-repository.test.ts` (끝에 describe 추가)

- [ ] **Step 1: 실패하는 테스트 작성**

`prisma-team-archive-query-repository.test.ts` 맨 끝에 붙인다(위쪽 import 를 그대로 쓴다).

```ts
describe("공개 아카이브 조회", () => {
  it("공개되고 끝난 프로그램의 확정 팀만 읽고, 숨김 졸업과제와 이름 칸은 빼고 고른다", async () => {
    const findMany = vi.fn(async () => []);
    const client = { projectTeam: { findMany } } as unknown as PrismaClient;

    await new PrismaTeamArchiveQueryRepository(client).listPublic();

    // select 를 통째로 비교한다. 회원, 담당자, 소개 글 같은 칸이 끼어들면 여기서 깨진다.
    expect(findMany).toHaveBeenCalledWith({
      where: {
        confirmedAt: { not: null },
        project: { program: {
          isPublic: true,
          endsAt: { lte: expect.any(Date) },
          category: { not: "CSE 캡스톤 디자인" },
        } },
      },
      select: {
        id: true,
        name: true,
        number: true,
        award: true,
        project: { select: {
          title: true,
          description: true,
          sourceUrl: true,
          program: { select: { id: true, name: true, category: true, startsAt: true } },
        } },
        artifacts: {
          where: { type: "SOURCE_CODE" },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          select: { id: true, type: true, externalUrl: true },
        },
      },
    });
  });

  it("저장소 주소를 고르고 상 받은 팀을 앞에 세운다", async () => {
    const program = { id: "p5", name: "제5회", category: "해커톤", startsAt: new Date("2024-04-30T15:00:00Z") };
    const findMany = vi.fn(async () => [
      {
        id: "t2", name: "스근하게", number: 2, award: null,
        project: { title: "제휴 업체", description: "설명", sourceUrl: null, program },
        artifacts: [{ id: "a2", type: "SOURCE_CODE", externalUrl: "https://github.com/org/team-02" }],
      },
      {
        id: "t1", name: "삼위일체", number: 1, award: "대상",
        project: { title: "공지사항", description: "설명", sourceUrl: "https://github.com/org/team-01", program },
        artifacts: [],
      },
    ]);
    const client = { projectTeam: { findMany } } as unknown as PrismaClient;

    const projects = await new PrismaTeamArchiveQueryRepository(client).listPublic();

    expect(projects).toEqual([
      {
        id: "t1", programId: "p5", programName: "제5회", programCategory: "해커톤", startYear: 2024,
        teamName: "삼위일체", teamNumber: 1, title: "공지사항", description: "설명", award: "대상",
        repositoryUrl: "https://github.com/org/team-01",
      },
      {
        id: "t2", programId: "p5", programName: "제5회", programCategory: "해커톤", startYear: 2024,
        teamName: "스근하게", teamNumber: 2, title: "제휴 업체", description: "설명", award: null,
        repositoryUrl: "https://github.com/org/team-02",
      },
    ]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run src/modules/team/infrastructure/prisma-team-archive-query-repository.test.ts`
Expected: FAIL, `listPublic is not a function`

- [ ] **Step 3: 타입 추가**

`src/modules/team/application/archive-projects.ts` 의 `ArchiveFilters` 타입 위에 붙인다.

```ts
/**
 * 로그인 없이 보는 공개 아카이브의 카드 한 장.
 *
 * 평가위원이 사업별 결과물을 훑고 저장소로 넘어가는 화면이라 그 일에 필요한 것만 담는다.
 * 팀원과 담당자 이름, 소개 글은 칸 자체가 없다. 옮겨 온 소개 글에는 팀원 이름이 들어 있다.
 */
export type PublicArchivedProject = {
  id: string;
  programId: string;
  programName: string;
  programCategory: string;
  startYear: number;
  teamName: string;
  teamNumber: number | null;
  title: string;
  description: string;
  award: string | null;
  repositoryUrl: string | null;
};
```

- [ ] **Step 4: 조회 구현**

`prisma-team-archive-query-repository.ts`

import 를 바꾸고 더한다.

```ts
import type {
  ArchivedProject,
  ArchivedProjectReader,
  ArchiveFilters,
  PublicArchivedProject,
} from "@/modules/team/application/archive-projects";
import { HIDDEN_GRADUATION_PROGRAM_CATEGORY } from "@/modules/project-program/domain/hidden-graduation-program";
import { resolveShowcaseRepository } from "@/modules/team/domain/showcase-repository";
```

`type ArchivedProjectRow = ...` 바로 아래에 select 와 행 타입을 둔다.

```ts
// 공개 아카이브가 읽는 칸. 이름이 들어가는 칸(회원, 담당자, 작성자, 소개 글)은 고르지 않는다.
// 화면에서 실수로 꺼내 쓸 길을 조회 단계에서 막아 둔다.
const publicArchivedProjectSelect = {
  id: true,
  name: true,
  number: true,
  award: true,
  project: { select: {
    title: true,
    description: true,
    sourceUrl: true,
    program: { select: { id: true, name: true, category: true, startsAt: true } },
  } },
  artifacts: {
    where: { type: "SOURCE_CODE" as const },
    orderBy: [{ position: "asc" as const }, { createdAt: "asc" as const }],
    select: { id: true, type: true, externalUrl: true },
  },
} satisfies Prisma.ProjectTeamSelect;

type PublicArchivedProjectRow = Prisma.ProjectTeamGetPayload<{
  select: typeof publicArchivedProjectSelect;
}>;
```

클래스 안 `findClosed` 아래에 메서드를 둔다.

```ts
  /**
   * 로그인 없이 보는 공개 아카이브 목록.
   *
   * 학생에게 보이는 범위(공개, 종료, 확정 팀)에서 숨김 졸업과제 분류를 뺀다.
   * 차례는 지난 프로젝트 목록과 같다. 최근 프로그램이 먼저, 그 안에서 상 받은 팀, 팀 번호 순.
   */
  async listPublic(): Promise<PublicArchivedProject[]> {
    // ponytail: 한 번에 다 읽는다. 수백 건 수준이다. 천 건을 넘기면 대분류별로 나눠 읽는다.
    const rows = await this.client.projectTeam.findMany({
      where: {
        confirmedAt: { not: null },
        project: { program: {
          isPublic: true,
          endsAt: { lte: new Date() },
          category: { not: HIDDEN_GRADUATION_PROGRAM_CATEGORY },
        } },
      },
      select: publicArchivedProjectSelect,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return orderArchivedTeamIds(rows.map((row) => ({
      id: row.id,
      teamName: row.name,
      teamNumber: row.number,
      award: row.award,
      programStartsAt: row.project.program.startsAt,
    }))).map((id) => toPublicArchivedProject(byId.get(id)!));
  }
```

파일의 `toArchivedProject` 함수 아래에 변환 함수를 둔다.

```ts
function toPublicArchivedProject(row: PublicArchivedProjectRow): PublicArchivedProject {
  return {
    id: row.id,
    programId: row.project.program.id,
    programName: row.project.program.name,
    programCategory: row.project.program.category,
    startYear: getProgramStartYear(row.project.program.startsAt),
    teamName: row.name,
    teamNumber: row.number,
    title: row.project.title,
    description: row.project.description,
    award: row.award,
    repositoryUrl: resolveShowcaseRepository({ artifacts: row.artifacts, sourceUrl: row.project.sourceUrl })?.url ?? null,
  };
}
```

- [ ] **Step 5: 통과 확인**

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run src/modules/team/infrastructure/prisma-team-archive-query-repository.test.ts`
Expected: PASS (기존 테스트 포함 전부)
Run: `npm run typecheck`
Expected: 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add src/modules/team/application/archive-projects.ts src/modules/team/infrastructure/prisma-team-archive-query-repository.ts src/modules/team/infrastructure/prisma-team-archive-query-repository.test.ts
git commit -m "feat: 이름 칸 없는 공개용 지난 프로젝트 조회"
```

---

### Task 4: 탭, 연도, 프로그램으로 묶기

**Files:**
- Modify: `src/modules/project-program/ui/program-sidebar-items.ts:125-133` (인자 타입)
- Create: `src/app/archive/_lib/group-public-archive.ts`
- Create: `src/app/archive/_lib/group-public-archive.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/archive/_lib/group-public-archive.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { groupPublicArchive } from "@/app/archive/_lib/group-public-archive";
import type { PublicArchivedProject } from "@/modules/team/application/archive-projects";

function project(overrides: Partial<PublicArchivedProject>): PublicArchivedProject {
  return {
    id: "t", programId: "p", programName: "프로그램", programCategory: "해커톤", startYear: 2024,
    teamName: "팀", teamNumber: null, title: "제목", description: "", award: null, repositoryUrl: null,
    ...overrides,
  };
}

describe("공개 아카이브 묶기", () => {
  // 조회가 정한 차례(최근 프로그램 먼저)로 들어온다.
  const projects = [
    project({ id: "a", programId: "h7", programName: "제7회", startYear: 2026 }),
    project({ id: "b", programId: "h5", programName: "제5회", startYear: 2024 }),
    project({ id: "c", programId: "h5", programName: "제5회", startYear: 2024 }),
    project({ id: "d", programId: "b25", programName: "AI 부스터 2025", programCategory: "AI 부스터", startYear: 2025 }),
  ];

  it("운영자가 정한 차례로 탭을 세우고 첫 탭을 연다", () => {
    const view = groupPublicArchive(projects, ["AI 부스터", "해커톤"], undefined);
    expect(view.categories).toEqual([{ name: "AI 부스터", count: 1 }, { name: "해커톤", count: 3 }]);
    expect(view.selectedCategory).toBe("AI 부스터");
    expect(view.totalProjects).toBe(4);
  });

  it("고른 탭 안을 연도 내림차순, 프로그램별로 묶는다", () => {
    const view = groupPublicArchive(projects, ["AI 부스터", "해커톤"], "해커톤");
    expect(view.years.map(({ year, programs }) => [
      year,
      programs.map(({ name, projects: items }) => [name, items.map(({ id }) => id)]),
    ])).toEqual([
      [2026, [["제7회", ["a"]]]],
      [2024, [["제5회", ["b", "c"]]]],
    ]);
  });

  it("없는 탭 이름이면 첫 탭을 연다", () => {
    expect(groupPublicArchive(projects, ["AI 부스터", "해커톤"], "없는 사업").selectedCategory).toBe("AI 부스터");
  });

  it("공개된 프로젝트가 없으면 빈 화면이다", () => {
    expect(groupPublicArchive([], [], undefined)).toEqual({ categories: [], selectedCategory: null, years: [], totalProjects: 0 });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run src/app/archive/_lib/group-public-archive.test.ts`
Expected: FAIL, `Failed to resolve import "@/app/archive/_lib/group-public-archive"`

- [ ] **Step 3: 정렬 함수 인자 타입을 넓힌다**

`program-sidebar-items.ts` 의 `orderProgramSidebarCategories` 는 `category` 만 읽는다. 공개 아카이브도 같은 차례를 쓰도록 인자 타입만 넓힌다. 본문은 그대로.

```ts
export function orderProgramSidebarCategories(
  items: readonly Pick<ProgramSidebarItem, "category">[],
  categoryOrder: readonly string[] = [],
): string[] {
```

- [ ] **Step 4: 묶기 구현**

`src/app/archive/_lib/group-public-archive.ts`

```ts
import { orderProgramSidebarCategories } from "@/modules/project-program/ui/program-sidebar-items";
import type { PublicArchivedProject } from "@/modules/team/application/archive-projects";

export type PublicArchiveProgram = { id: string; name: string; projects: PublicArchivedProject[] };
export type PublicArchiveYear = { year: number; programs: PublicArchiveProgram[] };
export type PublicArchiveView = {
  categories: Array<{ name: string; count: number }>;
  selectedCategory: string | null;
  years: PublicArchiveYear[];
  totalProjects: number;
};

/**
 * 공개 아카이브 화면 하나를 세운다.
 *
 * 사업(대분류) 탭은 운영자가 정한 차례를 따른다. 사이드바와 같은 함수를 써서 두 화면의
 * 차례가 어긋나지 않게 한다. 탭을 고르지 않았거나 없는 이름이면 첫 탭을 연다.
 * 탭 안은 연도 내림차순, 그 안은 프로그램별이다. 프로젝트 차례는 조회가 정한 것을 그대로 둔다.
 */
export function groupPublicArchive(
  projects: readonly PublicArchivedProject[],
  categoryOrder: readonly string[],
  requestedCategory: string | undefined,
): PublicArchiveView {
  const names = orderProgramSidebarCategories(
    projects.map((project) => ({ category: project.programCategory })),
    categoryOrder,
  );
  const categories = names.map((name) => ({
    name,
    count: projects.filter((project) => project.programCategory === name).length,
  }));
  const selectedCategory = requestedCategory && names.includes(requestedCategory) ? requestedCategory : names[0] ?? null;

  const years = new Map<number, Map<string, PublicArchiveProgram>>();
  for (const project of projects) {
    if (project.programCategory !== selectedCategory) continue;
    const programs = years.get(project.startYear) ?? new Map<string, PublicArchiveProgram>();
    const program = programs.get(project.programId) ?? { id: project.programId, name: project.programName, projects: [] };
    program.projects.push(project);
    programs.set(project.programId, program);
    years.set(project.startYear, programs);
  }

  return {
    categories,
    selectedCategory,
    years: [...years]
      .sort(([left], [right]) => right - left)
      .map(([year, programs]) => ({ year, programs: [...programs.values()] })),
    totalProjects: projects.length,
  };
}
```

- [ ] **Step 5: 통과 확인**

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run src/app/archive/_lib/group-public-archive.test.ts src/modules/project-program`
Expected: PASS
Run: `npm run typecheck`
Expected: 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add src/modules/project-program/ui/program-sidebar-items.ts src/app/archive/_lib/group-public-archive.ts src/app/archive/_lib/group-public-archive.test.ts
git commit -m "feat: 공개 아카이브를 사업, 연도, 프로그램으로 묶기"
```

---

### Task 5: `/archive` 화면

**Files:**
- Create: `src/app/archive/_lib/graduation-project-links.ts`
- Create: `src/app/archive/_components/public-archive-card.tsx`
- Create: `src/app/archive/page.tsx`
- Modify: `src/shared/i18n/ui-messages.en.json` (끝에 항목 추가)

페이지 props 의 `searchParams` 는 Promise 다(`src/app/topics/page.tsx` 112행과 같은 모양). 처음이면 `node_modules/next/dist/docs` 의 page 문서를 먼저 확인한다.

- [ ] **Step 1: 졸업과제 링크 상수**

`src/app/archive/_lib/graduation-project-links.ts`

```ts
/**
 * 정보컴퓨터공학부 졸업과제 저장소.
 *
 * 졸업과제는 PMS 에 넣지 않고 GitHub 조직으로 보낸다. README 에 학번과 이메일이 그대로 있는
 * 레포가 있어 내용을 옮겨 오지 않는다. 2024 년 조직은 아직 찾지 못했다. 받으면 여기에 더한다.
 */
export const GRADUATION_PROJECT_LINKS = [
  { year: 2026, url: "https://github.com/pnucse-capstone2026" },
  { year: 2025, url: "https://github.com/pnucse-capstone2025" },
  { year: 2023, url: "https://github.com/pnucse-capstone" },
  { year: 2022, url: "https://github.com/PNUCSE" },
] as const;
```

- [ ] **Step 2: 카드**

`src/app/archive/_components/public-archive-card.tsx`

```tsx
import type { PublicArchivedProject } from "@/modules/team/application/archive-projects";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { GithubIcon } from "@/shared/ui/github-icon";

export function PublicArchiveCard({ project }: { project: PublicArchivedProject }) {
  const teamLabel = project.teamNumber === null ? project.teamName : `${project.teamNumber}. ${project.teamName}`;
  return (
    <article className="flex h-full flex-col rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-base font-semibold leading-snug tracking-[-0.02em] [overflow-wrap:anywhere]">{project.title}</h4>
        {project.award ? (
          <span className="shrink-0 rounded-full bg-[var(--accent-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-ink)]">
            {project.award}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
        {teamLabel} <UiText>{"팀"}</UiText>
      </p>
      {project.description ? (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--muted)] [overflow-wrap:anywhere]">{project.description}</p>
      ) : null}
      {project.repositoryUrl ? (
        <div className="mt-auto pt-4">
          <a href={project.repositoryUrl} target="_blank" rel="noreferrer" className="button-secondary inline-flex items-center gap-2">
            <GithubIcon className="size-4 shrink-0" />
            <UiText>{"GitHub에서 보기"}</UiText>
          </a>
        </div>
      ) : null}
    </article>
  );
}
```

- [ ] **Step 3: 페이지**

`src/app/archive/page.tsx`

```tsx
import Link from "next/link";
import type { Metadata } from "next";

import { PublicArchiveCard } from "@/app/archive/_components/public-archive-card";
import { GRADUATION_PROJECT_LINKS } from "@/app/archive/_lib/graduation-project-links";
import { groupPublicArchive } from "@/app/archive/_lib/group-public-archive";
import { listProgramCategoryOrder } from "@/modules/project-program/infrastructure/prisma-program-category-order-repository";
import { PrismaTeamArchiveQueryRepository } from "@/modules/team/infrastructure/prisma-team-archive-query-repository";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiNav } from "@/shared/i18n/localized-elements";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { Brand } from "@/shared/ui/brand";
import { GithubIcon } from "@/shared/ui/github-icon";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("사업별 결과물");
}

// 현장평가 평가위원이 계정 없이 들어와 보는 화면이다. 개인정보 처리방침처럼 AppShell 없이 그린다.
export default async function PublicArchivePage({ searchParams }: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedCategory = typeof params.category === "string" ? params.category : undefined;
  const [projects, categoryOrder] = await Promise.all([
    new PrismaTeamArchiveQueryRepository(prisma).listPublic(),
    listProgramCategoryOrder(prisma),
  ]);
  const view = groupPublicArchive(projects, categoryOrder, requestedCategory);

  return (
    <div className="min-h-screen bg-[var(--workspace)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-5 sm:px-8">
        <Brand href="/" />
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-semibold leading-tight tracking-[-0.035em]">
          <UiText>{"사업별 결과물"}</UiText>
        </h1>
        <p className="mt-3 max-w-2xl text-[0.9375rem] leading-7 text-[var(--muted)]">
          <UiText>{"부산대학교 AI융합교육원이 운영한 사업의 결과물입니다. GitHub 버튼을 누르면 저장소로 이동합니다."}</UiText>
        </p>
        <p className="mt-2 text-sm tabular-nums text-[var(--muted)]">
          <UiText>{`사업 ${view.categories.length}개, 프로젝트 ${view.totalProjects}개`}</UiText>
        </p>

        {view.categories.length ? (
          <UiNav aria-label="사업" className="mt-8 flex flex-wrap gap-2 border-b border-[var(--line)] pb-4">
            {view.categories.map((category) => {
              const selected = category.name === view.selectedCategory;
              return (
                <Link
                  key={category.name}
                  href={`/archive?category=${encodeURIComponent(category.name)}`}
                  aria-current={selected ? "page" : undefined}
                  className={selected ? "button-primary" : "button-secondary"}
                >
                  <UiText>{category.name}</UiText> <span className="tabular-nums">{category.count}</span>
                </Link>
              );
            })}
          </UiNav>
        ) : (
          <p className="mt-10 text-sm text-[var(--muted)]"><UiText>{"아직 공개된 결과물이 없습니다."}</UiText></p>
        )}

        <div className="mt-10 grid gap-12">
          {view.years.map((year) => (
            <section key={year.year} aria-labelledby={`archive-year-${year.year}`}>
              <h2 id={`archive-year-${year.year}`} className="text-xl font-bold tracking-[-0.03em]">
                <UiText>{`${year.year}년`}</UiText>
              </h2>
              {year.programs.map((program) => (
                <div key={program.id} className="mt-5">
                  <h3 className="text-sm font-semibold text-[var(--muted)]">
                    <UiText>{program.name}</UiText> <span className="tabular-nums">{program.projects.length}</span>
                  </h3>
                  <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {program.projects.map((project) => (
                      <li key={project.id}><PublicArchiveCard project={project} /></li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>

        <section aria-labelledby="archive-graduation" className="mt-16 border-t border-[var(--line)] pt-8">
          <h2 id="archive-graduation" className="text-xl font-bold tracking-[-0.03em]">
            <UiText>{"졸업과제"}</UiText>
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            <UiText>{"정보컴퓨터공학부 졸업과제는 연도별 GitHub 조직에서 볼 수 있습니다."}</UiText>
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {GRADUATION_PROJECT_LINKS.map((link) => (
              <li key={link.url}>
                <a href={link.url} target="_blank" rel="noreferrer" className="button-secondary inline-flex items-center gap-2">
                  <GithubIcon className="size-4 shrink-0" />
                  <UiText>{`${link.year}년 졸업과제`}</UiText>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: 번역 누락 확인 (실패해야 정상)**

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run tests/architecture/ui-localization.test.ts`
Expected: FAIL, `missing` 에 `src/app/archive/page.tsx: 사업별 결과물` 등이 나온다.

- [ ] **Step 5: 영어 문구 추가**

`src/shared/i18n/ui-messages.en.json` 의 마지막 항목

```json
  "번호·수상 저장": "Save numbers and awards"
```

을 아래로 바꾼다(앞 줄 끝에 쉼표, 새 항목 이어 붙임).

```json
  "번호·수상 저장": "Save numbers and awards",
  "사업별 결과물": "Results by program",
  "사업": "Programs",
  "부산대학교 AI융합교육원이 운영한 사업의 결과물입니다. GitHub 버튼을 누르면 저장소로 이동합니다.": "Results from programs run by the PNU AI Convergence Education Center. Use the GitHub button to open each repository.",
  "사업 {0}개, 프로젝트 {1}개": "{0} programs, {1} projects",
  "아직 공개된 결과물이 없습니다.": "No public results yet.",
  "{0}년": "{0}",
  "GitHub에서 보기": "View on GitHub",
  "졸업과제": "Capstone projects",
  "정보컴퓨터공학부 졸업과제는 연도별 GitHub 조직에서 볼 수 있습니다.": "Capstone projects from the School of Computer Science and Engineering are on GitHub, organized by year.",
  "{0}년 졸업과제": "{0} capstone projects"
```

- [ ] **Step 6: 구조 테스트 통과 확인**

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run tests/architecture`
Expected: PASS (5 files). `server-action-exports` 가 동시 부하로 시간 초과하면 그 파일만 따로 다시 돌린다(알려진 flaky).

- [ ] **Step 7: 브라우저 확인 (로그아웃 상태)**

로컬 DB 를 켠다: `docker start pnu-project-management-system-postgres-1 pnu-project-management-system-minio-1`
`preview_start` 로 `dev` 설정을 띄운 뒤 로그인하지 않은 상태로 `/archive` 를 연다.
확인할 것:
- 로그인 화면으로 튕기지 않고 열린다.
- 로컬 DB 의 공개 지난 프로그램이 사업 탭으로 나온다(데모 데이터가 없으면 "아직 공개된 결과물이 없습니다." 와 졸업과제 링크만).
- 탭을 누르면 `?category=` 가 바뀌고 연도 묶음이 바뀐다.
- 카드의 GitHub 버튼이 새 창으로 저장소를 연다.
- 375px 폭에서 가로 스크롤이 없다(`resize_window` mobile).
- 콘솔 오류 없음(`read_console_messages`).

- [ ] **Step 8: 커밋**

```bash
git checkout -- next-env.d.ts
git add src/app/archive src/shared/i18n/ui-messages.en.json
git commit -m "feat: 로그인 없이 보는 사업별 결과물 화면"
```

---

### Task 6: 로그인 화면에서 들어가는 길

**Files:**
- Modify: `src/app/_components/sign-in-landing.tsx` (상단 `UiNav` 154행 앞, 하단 footer 357행 앞)

`/archive` 는 앱 안 페이지라 `<a>` 대신 이미 import 되어 있는 `Link` 를 쓴다(`@next/next/no-html-link-for-pages`).

- [ ] **Step 1: 상단 메뉴**

`"역할별 안내"` 링크 다음, `사용 매뉴얼` `<a>` 앞에 넣는다.

```tsx
                <Link className={styles.navLink} href="/archive"><UiText>{"사업별 결과물"}</UiText></Link>
```

- [ ] **Step 2: 하단**

footer 의 `사용 매뉴얼` `<a>` 앞에 넣는다. 상단 메뉴는 `md` 미만에서 숨겨지므로 휴대폰에서는 이 링크가 길이다.

```tsx
          <Link href="/archive" className="underline underline-offset-4">
            <UiText>{"사업별 결과물"}</UiText>
          </Link>
```

- [ ] **Step 3: 확인**

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run tests/architecture/ui-localization.test.ts src/app/_components`
Expected: PASS ("사업별 결과물" 은 Task 5 에서 이미 넣었다)
브라우저에서 로그아웃 상태로 `/` 를 열어 상단과 하단 링크가 `/archive` 로 가는지 본다.

- [ ] **Step 4: 커밋**

```bash
git checkout -- next-env.d.ts
git add src/app/_components/sign-in-landing.tsx
git commit -m "feat: 로그인 화면에 사업별 결과물 링크"
```

---

### Task 7: README 요약 규칙과 스냅샷 함수

**Files:**
- Create: `scripts/github-archive.ts`
- Create: `scripts/github-archive.test.ts`

이 파일은 운영 서버의 시드용 이미지(`Dockerfile` 의 `demo-seeder`)에서도 돈다. 그 이미지에는 `scripts` 와 생성된 Prisma 클라이언트만 있으므로 **`@/` 경로를 가져오지 않는다.**

요약 규칙은 설계보다 한 가지 구체적이다. 제5회 README 는 `#`/`##` 제목 없이 `### 1. 프로젝트 소개` 로 시작하고 "1.2. 개발 목표 및 주요 내용" 아래에 소개할 만한 문단이 있다. 그래서 제목을 못 찾으면 "목표" 가 든 소제목 아래 문단을 먼저 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/github-archive.test.ts`. 개인정보 예시는 가짜 값만 쓴다.

```ts
import { describe, expect, it } from "vitest";

import {
  isTemplateRepo,
  mergeSnapshot,
  normalizeRepoUrl,
  pickTitle,
  readmeTitleAndSummary,
  scrubPersonalInfo,
  stableArchiveId,
  type SnapshotProgram,
} from "./github-archive";

const program = {
  key: "h5", org: "org", programName: "제5회", category: "해커톤", startsAt: "2024-05-01", endsAt: "2024-09-07",
};

describe("템플릿 레포 거르기", () => {
  it("템플릿과 조직 소개 레포를 뺀다", () => {
    for (const name of ["StarterTemplate", "Capstone-Template-2025", "capstone2024-template", "PNUSW-2025-team-00", ".github", "org.github.io"]) {
      expect(isTemplateRepo(name), name).toBe(true);
    }
    expect(isTemplateRepo("PNUSW-2024-team-01")).toBe(false);
  });
});

describe("README 제목과 요약", () => {
  it("해커톤 2026 형식: 첫 제목과 그 아래 인용문", () => {
    const markdown = [
      "# gridi",
      "",
      "> **기획과 개발을 잇는 AI 워크스페이스**",
      "",
      "## 목차",
      "- [1.2. 개발 목표](#12)",
      "",
      "### 1.2. 개발 목표 및 주요 내용",
      "목표 문단",
    ].join("\n");
    expect(readmeTitleAndSummary(markdown)).toEqual({ title: "gridi", summary: "기획과 개발을 잇는 AI 워크스페이스" });
  });

  it("제5회 형식: 제목이 없으면 목표 소제목 아래 문단", () => {
    const markdown = [
      '<img alt="image" src="https://github.com/user-attachments/assets/x.png"><br>',
      "",
      "### 1. 프로젝트 소개",
      "",
      "#### 1.1. 개발배경 및 필요성",
      "",
      "공지를 놓친 경험에서 시작했습니다.",
      "",
      "#### 1.2. 개발 목표 및 주요 내용",
      "",
      "흩어진 부산대 공지를 한곳에 모아 보여 줍니다.",
    ].join("\n");
    expect(readmeTitleAndSummary(markdown)).toEqual({ title: null, summary: "흩어진 부산대 공지를 한곳에 모아 보여 줍니다." });
  });

  it("졸업과제 형식: 번호 붙은 범용 제목은 건너뛰고 첫 소제목 아래 문단, 팀 소개는 안 들어간다", () => {
    const markdown = [
      "[![Review Assignment Due Date](https://classroom.github.com/assets/deadline.svg)](https://classroom.github.com/a/x)",
      "본문입니다.",
      "",
      "# 1. 프로젝트 소개",
      '  - 이번 프로젝트의 주제는 "심장질환 환자 ECG 데이터 분석" 입니다.',
      "",
      "# 2. 팀 소개",
      "  - 홍길동 부산대학교 정보컴퓨터공학부 202412345 gildong@pusan.ac.kr",
    ].join("\n");
    expect(readmeTitleAndSummary(markdown)).toEqual({
      title: null,
      summary: '이번 프로젝트의 주제는 "심장질환 환자 ECG 데이터 분석" 입니다.',
    });
  });

  it("요약은 200자에서 자른다", () => {
    const { summary } = readmeTitleAndSummary(`# 제목\n\n${"가".repeat(250)}`);
    expect(summary).toHaveLength(200);
    expect(summary.endsWith("…")).toBe(true);
  });

  it("이메일과 학번을 지운다", () => {
    expect(scrubPersonalInfo("홍길동 202412345 gildong@pusan.ac.kr 이 만들었다")).toBe("홍길동 이 만들었다");
  });
});

describe("제목 고르기", () => {
  it("README 제목, 레포 설명, 레포 이름 순이고 Classroom 기본 설명은 쓰지 않는다", () => {
    expect(pickTitle({ readmeTitle: "gridi", description: "설명", repoName: "r" })).toBe("gridi");
    expect(pickTitle({ readmeTitle: null, description: "AI 기반 Host DLP", repoName: "r" })).toBe("AI 기반 Host DLP");
    expect(pickTitle({ readmeTitle: null, description: "x created by GitHub Classroom", repoName: "team-43" })).toBe("team-43");
  });
});

describe("저장소 주소 맞추기", () => {
  it("끝 슬래시, .git, 대소문자, www, 하위 경로 차이를 지운다", () => {
    const expected = "https://github.com/org/repo";
    for (const url of [
      "https://github.com/Org/Repo",
      "https://github.com/org/repo/",
      "https://github.com/org/repo.git",
      "http://www.github.com/org/repo",
      "https://github.com/org/repo/tree/main",
    ]) {
      expect(normalizeRepoUrl(url), url).toBe(expected);
    }
  });
});

describe("스냅샷 합치기", () => {
  it("이미 있는 레포는 손으로 고친 그대로 두고 새 레포만 붙인다", () => {
    const existing: SnapshotProgram[] = [{
      program,
      repos: [{ fullName: "org/team-01", url: "u1", teamNumber: 1, teamName: "삼위일체", title: "손으로 고친 제목", summary: "고친 요약" }],
    }];
    const crawled: SnapshotProgram[] = [{
      program: { ...program, programName: "제5회 새 이름" },
      repos: [
        { fullName: "org/team-01", url: "u1", teamNumber: 1, teamName: "삼위일체", title: "새로 뽑은 제목", summary: "새 요약" },
        { fullName: "org/team-02", url: "u2", teamNumber: 2, teamName: "스근하게", title: "제휴", summary: "" },
      ],
    }];
    const [merged] = mergeSnapshot(existing, crawled);
    expect(merged!.program.programName).toBe("제5회 새 이름");
    expect(merged!.repos.map(({ fullName, title }) => [fullName, title])).toEqual([
      ["org/team-01", "손으로 고친 제목"],
      ["org/team-02", "제휴"],
    ]);
  });

  it("설정에서 빠진 프로그램도 스냅샷에서는 지우지 않는다", () => {
    const existing: SnapshotProgram[] = [{ program, repos: [] }];
    expect(mergeSnapshot(existing, [])).toEqual(existing);
  });
});

describe("고정 ID", () => {
  it("같은 입력이면 같은 UUID 다", () => {
    const id = stableArchiveId("topic", "org/team-01");
    expect(id).toBe(stableArchiveId("topic", "org/team-01"));
    expect(id).not.toBe(stableArchiveId("topic", "org/team-02"));
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run scripts/github-archive.test.ts`
Expected: FAIL, `Failed to resolve import "./github-archive"`

- [ ] **Step 3: 구현**

`scripts/github-archive.ts`

```ts
import { createHash } from "node:crypto";

// GitHub 결과물 이관에 쓰는 순수 함수와 스냅샷 모양.
// 크롤링(crawl-github-archive.ts)과 넣기(import-github-archive.ts)가 함께 쓴다.
// 넣기는 운영 서버의 시드용 이미지에서 돌고 그 이미지에는 scripts 와 생성된 Prisma 클라이언트만
// 있다. 그래서 이 파일은 `@/` 경로를 가져오지 않는다.

export type ArchiveProgram = {
  /** ID 를 유도하는 고정 키. 바꾸면 다른 프로그램이 새로 생긴다. */
  key: string;
  org: string;
  programName: string;
  category: string;
  /** KST 날짜 YYYY-MM-DD */
  startsAt: string;
  endsAt: string;
  /** 이미 만들어 둔 빈 프로그램에 채울 때만 쓴다. 있으면 프로그램 행은 건드리지 않는다. */
  programId?: string;
};

export type ArchiveTeam = { teamNumber?: number; teamName: string; title: string };

export type SnapshotRepo = {
  fullName: string;
  url: string;
  teamNumber: number | null;
  teamName: string;
  title: string;
  summary: string;
};

export type SnapshotProgram = { program: ArchiveProgram; repos: SnapshotRepo[] };

const TEMPLATE_REPO = /template|^\.github$|\.github\.io$|-team-00$/i;
const GENERIC_HEADING = /^\d+[.)]|프로젝트\s*소개|목차|개요|readme|introduction|table of contents/i;
const GOAL_HEADING = /^#{1,6}\s.*목표/;
const ANY_HEADING = /^#{1,6}\s/;
const TOP_HEADING = /^#{1,2}\s+(.+)$/;
const CLASSROOM_DESCRIPTION = /created by GitHub Classroom/i;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const STUDENT_ID = /\b20\d{7}\b/g;
const SUMMARY_LENGTH = 200;

/** 템플릿과 조직 소개 레포는 결과물이 아니다. */
export function isTemplateRepo(name: string): boolean {
  return TEMPLATE_REPO.test(name);
}

/**
 * 마크다운 한 줄에서 서식을 걷어내고 글자만 남긴다. 배지는 이미지가 먼저 지워져 빈 링크가 된다.
 * 번호 목록("1. ")은 지우지 않는다. 지우면 "# 2. 팀 소개" 가 범용 제목 검사를 빠져나가
 * 팀원 명단이 요약으로 나간다.
 */
function plainText(line: string): string {
  return line
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s*[-*+]\s+/, "")
    .replace(/[*_`~>#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 요약에 이메일과 학번이 섞여 나가지 않게 지운다. 실제 졸업과제 README 에 둘 다 있었다. */
export function scrubPersonalInfo(text: string): string {
  return text.replace(EMAIL, " ").replace(STUDENT_ID, " ").replace(/\s+/g, " ").trim();
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/** start 줄부터 처음으로 글자가 남는 문단 하나를 모은다. 소제목을 만나면 끝낸다. */
function firstParagraph(lines: readonly string[], start: number): string {
  const collected: string[] = [];
  for (const line of lines.slice(start)) {
    if (ANY_HEADING.test(line)) {
      if (collected.length) break;
      continue;
    }
    const text = plainText(line);
    if (!text) {
      if (collected.length) break;
      continue;
    }
    collected.push(text);
  }
  return collected.join(" ");
}

/**
 * README 에서 카드에 쓸 제목과 요약을 뽑는다.
 *
 * 제목은 첫 `#`/`##` 제목이다. "1. 프로젝트 소개" 처럼 어느 레포에나 있는 제목은 건너뛴다.
 * 요약은 제목이 있으면 그 바로 아래 문단, 없으면 "목표" 가 든 소제목 아래 문단, 그것도 없으면
 * 첫 소제목 아래 문단이다. 대회 템플릿이 "개발 목표 및 주요 내용" 에 소개를 적게 되어 있다.
 */
export function readmeTitleAndSummary(markdown: string): { title: string | null; summary: string } {
  const lines = markdown.split(/\r?\n/);
  let title: string | null = null;
  let titleIndex = -1;
  for (const [index, line] of lines.entries()) {
    const heading = line.match(TOP_HEADING);
    const text = heading ? plainText(heading[1]!) : "";
    if (text && !GENERIC_HEADING.test(text)) {
      title = text;
      titleIndex = index;
      break;
    }
  }
  const goalIndex = lines.findIndex((line) => GOAL_HEADING.test(line));
  const firstHeadingIndex = lines.findIndex((line) => ANY_HEADING.test(line));
  const start = titleIndex >= 0 ? titleIndex + 1 : goalIndex >= 0 ? goalIndex + 1 : firstHeadingIndex + 1;
  return { title, summary: truncate(scrubPersonalInfo(firstParagraph(lines, start)), SUMMARY_LENGTH) };
}

/** README 제목, 레포 설명, 레포 이름 순. Classroom 이 넣은 기본 설명은 의미가 없어 건너뛴다. */
export function pickTitle(input: { readmeTitle: string | null; description: string | null; repoName: string }): string {
  if (input.readmeTitle) return input.readmeTitle;
  const description = input.description?.trim();
  if (description && !CLASSROOM_DESCRIPTION.test(description)) return description;
  return input.repoName;
}

/** 같은 저장소를 같은 문자열로 맞춘다. 중복 판단에 쓴다. */
export function normalizeRepoUrl(url: string): string {
  const cleaned = url
    .trim()
    .toLowerCase()
    .replace(/^http:\/\//, "https://")
    .replace(/^https:\/\/www\./, "https://")
    .replace(/[?#].*$/, "");
  const repo = cleaned.match(/^https:\/\/github\.com\/[^/]+\/[^/]+/)?.[0] ?? cleaned.replace(/\/+$/, "");
  return repo.replace(/\.git$/, "");
}

/**
 * 새로 긁은 결과를 커밋된 스냅샷에 합친다.
 *
 * 프로그램 정보는 스크립트 설정이 이긴다. 레포는 이미 있는 항목을 그대로 둔다. PR 에서 손으로
 * 고친 제목과 요약이 다시 돌릴 때 지워지면 안 된다. 다시 뽑고 싶으면 그 항목을 지우고 돌린다.
 * 설정에서 빠진 프로그램도 지우지 않는다. 이미 운영에 들어갔을 수 있다.
 */
export function mergeSnapshot(existing: readonly SnapshotProgram[], crawled: readonly SnapshotProgram[]): SnapshotProgram[] {
  const previous = new Map(existing.map((entry) => [entry.program.key, entry]));
  const merged = crawled.map(({ program, repos }) => {
    const kept = previous.get(program.key)?.repos ?? [];
    const known = new Set(kept.map(({ fullName }) => fullName.toLowerCase()));
    return { program, repos: [...kept, ...repos.filter(({ fullName }) => !known.has(fullName.toLowerCase()))] };
  });
  const crawledKeys = new Set(crawled.map(({ program }) => program.key));
  return [...merged, ...existing.filter(({ program }) => !crawledKeys.has(program.key))];
}

/** 출처 키에서 항상 같은 UUID 를 만든다. 다시 돌려도 새 행이 생기지 않게. OPUS 이관과 같은 방식이다. */
export function stableArchiveId(...parts: string[]): string {
  const hex = createHash("sha256").update(`github:${parts.join(":")}`).digest("hex");
  const variant = ((Number.parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16);
  return [hex.slice(0, 8), hex.slice(8, 12), `4${hex.slice(13, 16)}`, `${variant}${hex.slice(17, 20)}`, hex.slice(20, 32)].join("-");
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run scripts/github-archive.test.ts`
Expected: PASS. 실패하면 어느 줄에서 문단이 시작되고 끊겼는지 `readmeTitleAndSummary` 의 `start` 와 `firstParagraph` 를 따라가 본다.

- [ ] **Step 5: 커밋**

```bash
git add scripts/github-archive.ts scripts/github-archive.test.ts
git commit -m "feat: GitHub 결과물 README 요약 규칙"
```

---

### Task 8: 크롤링 스크립트와 스냅샷

**Files:**
- Create: `scripts/crawl-github-archive.ts`
- Create(생성물): `scripts/github-archive/snapshot.json`

팀 이름과 제목은 2024-09-04 swedu 공지 "제5회 PNU 창의융합SW해커톤 최종 결과물 온라인 투표안내" 의 포스터 설명을 그대로 옮긴 것이다. 4팀과 15팀은 공지에 없다.

- [ ] **Step 1: 스크립트 작성**

`scripts/crawl-github-archive.ts`

```ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  type ArchiveProgram,
  type ArchiveTeam,
  type SnapshotProgram,
  type SnapshotRepo,
  isTemplateRepo,
  mergeSnapshot,
  pickTitle,
  readmeTitleAndSummary,
} from "./github-archive";

// 끝난 사업의 GitHub 결과물을 긁어 snapshot.json 에 합친다. 개발자 PC 에서 돌린다.
// 실행: GITHUB_TOKEN=$(gh auth token) npx tsx scripts/crawl-github-archive.ts
// 결과는 PR 에서 사람이 훑고 고친 뒤 import-github-archive.ts 로 운영에 들어간다.

type ProgramSource = ArchiveProgram & {
  /** 공지 등에서 확인한 팀. 있으면 여기 적힌 레포만 넣고 팀 번호, 팀 이름, 제목을 여기서 쓴다. */
  teams?: Record<string, ArchiveTeam>;
};

const PROGRAMS: ProgramSource[] = [
  {
    key: "pnu-convergence-sw-hackathon-5",
    org: "The-5th-PNU-Convergence-SW-Hackathon",
    programName: "제5회 PNU 창의융합SW해커톤",
    // OPUS 로 옮긴 제6회와 같은 대분류. 운영에서 이름을 바꿨으면 넣은 뒤 화면에서 합친다.
    category: "PNU 창의융합 해커톤",
    startsAt: "2024-05-01",
    endsAt: "2024-09-07",
    teams: {
      "PNUSW-2024-team-01": { teamNumber: 1, teamName: "삼위일체", title: "부산대 모든 공지사항" },
      "PNUSW-2024-team-02": { teamNumber: 2, teamName: "스근하게", title: "부산대 제휴 업체를 한눈에" },
      "PNUSW-2024-team-03": { teamNumber: 3, teamName: "따뜻한청년들2", title: "시니어 돌봄 매칭 플랫폼" },
      "PNUSW-2024-team-05": { teamNumber: 5, teamName: "인사이드아웃", title: "우울감 관리 플랫폼" },
      "PNUSW-2024-team-06": { teamNumber: 6, teamName: "아이엠그루트", title: "글쓰기를 통한 식물 테라피" },
      "PNUSW-2024-team-07": { teamNumber: 7, teamName: "피누", title: "가족 소통 어플리케이션" },
      "PNUSW-2024-team-08": { teamNumber: 8, teamName: "포포", title: "지역 유기동물 문제 해결 플랫폼" },
      "PNUSW-2024-team-09": { teamNumber: 9, teamName: "구은생선", title: "대학생 맞춤 알바 구직 서비스" },
      "PNUSW-2024-team-10": { teamNumber: 10, teamName: "히론", title: "유학생들을 위한 여행, 생활 도움 서비스" },
      "PNUSW-2024-team-11": { teamNumber: 11, teamName: "피벗", title: "부산대 맞춤형 중고거래 서비스" },
      "PNUSW-2024-team-12": { teamNumber: 12, teamName: "이륙허가", title: "부산대 공유 택시 서비스" },
      "PNUSW-2024-team-13": { teamNumber: 13, teamName: "OwO", title: "HPE를 통한 환자 관리 모듈 개발" },
      "PNUSW-2024-team-14": { teamNumber: 14, teamName: "자스민", title: "사기피해 예방 안심 결제 시스템" },
      "PNUSW-2024-team-16": { teamNumber: 16, teamName: "Mizi", title: "청년을 위한 미래 자산 관리 서비스" },
      "PNUSW-2024-team-17": { teamNumber: 17, teamName: "구름", title: "부산대 프로젝트 배포 플랫폼" },
      "PNUSW-2024-team-18": { teamNumber: 18, teamName: "어웨이크", title: "졸음운전 예방을 위한 LLM 대화모델" },
    },
  },
];

const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error("GITHUB_TOKEN 이 필요합니다. GITHUB_TOKEN=$(gh auth token) 으로 실행하세요.");

type GithubRepo = { name: string; full_name: string; html_url: string; description: string | null; private: boolean; size: number };

async function github(path: string, accept = "application/vnd.github+json"): Promise<Response> {
  const response = await fetch(`https://api.github.com/${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: accept, "X-GitHub-Api-Version": "2022-11-28" },
  });
  if (!response.ok && response.status !== 404) throw new Error(`GitHub ${response.status}: ${path}`);
  return response;
}

async function listPublicRepos(org: string): Promise<GithubRepo[]> {
  const repos: GithubRepo[] = [];
  for (let page = 1; ; page += 1) {
    const response = await github(`orgs/${org}/repos?type=public&per_page=100&page=${page}`);
    if (response.status === 404) throw new Error(`조직을 찾지 못했습니다: ${org}`);
    const batch = (await response.json()) as GithubRepo[];
    repos.push(...batch);
    if (batch.length < 100) return repos;
  }
}

async function readme(fullName: string): Promise<string | null> {
  const response = await github(`repos/${fullName}/readme`, "application/vnd.github.raw");
  return response.status === 404 ? null : response.text();
}

async function crawl(source: ProgramSource): Promise<SnapshotProgram> {
  const { teams, ...program } = source;
  const repos: SnapshotRepo[] = [];
  for (const repo of await listPublicRepos(source.org)) {
    // 포크는 빼지 않는다. 제5회 조직의 레포는 전부 팀 레포를 포크해 모은 것이다.
    if (repo.private || repo.size === 0 || isTemplateRepo(repo.name)) continue;
    const team = teams?.[repo.name];
    if (teams && !team) continue;
    const markdown = await readme(repo.full_name);
    if (markdown === null) {
      console.warn(`  README 없음, 건너뜀: ${repo.full_name}`);
      continue;
    }
    const extracted = readmeTitleAndSummary(markdown);
    repos.push({
      fullName: repo.full_name,
      url: repo.html_url,
      teamNumber: team?.teamNumber ?? null,
      teamName: team?.teamName ?? repo.name,
      title: team?.title ?? pickTitle({ readmeTitle: extracted.title, description: repo.description, repoName: repo.name }),
      summary: extracted.summary,
    });
  }
  // PR diff 가 매번 같은 차례로 나오게 팀 번호, 없으면 레포 이름 순으로 둔다.
  repos.sort((left, right) =>
    (left.teamNumber ?? Number.MAX_SAFE_INTEGER) - (right.teamNumber ?? Number.MAX_SAFE_INTEGER)
    || left.fullName.localeCompare(right.fullName));
  const missing = teams ? Object.keys(teams).filter((name) => !repos.some(({ fullName }) => fullName.endsWith(`/${name}`))) : [];
  if (missing.length) console.warn(`  설정에는 있는데 못 찾은 레포: ${missing.join(", ")}`);
  return { program, repos };
}

const here = dirname(fileURLToPath(import.meta.url));
const snapshotPath = join(here, "github-archive", "snapshot.json");

async function main() {
  const existing = JSON.parse(await readFile(snapshotPath, "utf8").catch(() => "[]")) as SnapshotProgram[];
  const crawled: SnapshotProgram[] = [];
  for (const source of PROGRAMS) {
    const entry = await crawl(source);
    console.log(`${source.programName}: ${entry.repos.length}개`);
    crawled.push(entry);
  }
  await mkdir(dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify(mergeSnapshot(existing, crawled), null, 2)}\n`);
  console.log(`저장: ${snapshotPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: 실행**

Bash 도구에서:

```bash
GITHUB_TOKEN=$(gh auth token) npx tsx scripts/crawl-github-archive.ts
```

Expected:
```
제5회 PNU 창의융합SW해커톤: 16개
저장: ...\scripts\github-archive\snapshot.json
```
"못 찾은 레포" 나 "README 없음" 경고가 나오면 그 레포를 GitHub 에서 직접 열어 보고 원인을 적는다.

- [ ] **Step 3: 스냅샷을 사람이 읽는다**

`scripts/github-archive/snapshot.json` 의 16개 `summary` 를 하나씩 읽는다. 고칠 기준:
- 이름, 학번, 이메일, 전화번호가 남아 있으면 지운다.
- "본문입니다." 같은 템플릿 문구, 목차, 링크 나열이면 README 에서 소개 문장 하나를 골라 손으로 적는다.
- 배경 설명만 길고 무엇을 만들었는지 안 보이면 한 문장으로 줄인다.
고친 뒤 다시 돌려도(Step 2) 고친 값이 남는지 확인한다(`git diff` 가 비어야 한다).

- [ ] **Step 4: 린트와 타입**

Run: `npm run typecheck` 와 `npx eslint scripts/github-archive.ts scripts/crawl-github-archive.ts`
Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add scripts/crawl-github-archive.ts scripts/github-archive/snapshot.json
git commit -m "feat: 제5회 해커톤 결과물 크롤링"
```

---

### Task 9: 넣기 스크립트와 운영 실행 자리

**Files:**
- Create: `scripts/import-github-archive.ts`
- Modify: `compose.production.yaml` (`import-opus` 서비스 아래)

- [ ] **Step 1: 스크립트 작성**

`scripts/import-github-archive.ts`

```ts
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { normalizeRepoUrl, stableArchiveId, type SnapshotProgram } from "./github-archive";

// scripts/github-archive/snapshot.json 을 지난 프로그램과 프로젝트로 넣는다.
// OPUS 이관(import-opus-archive.ts)과 같은 방식이다. 모든 ID 를 저장소 이름에서 유도해
// 몇 번을 돌려도 같은 행이 갱신될 뿐 늘지 않는다. 팀원 계정과 사진은 넣지 않는다.
// 운영 실행: docker compose -f compose.production.yaml --env-file .env.production run --rm import-github

const here = dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL 환경변수가 필요합니다.");
if (!process.argv.includes("--confirm")) {
  throw new Error("실제 데이터를 씁니다. --confirm 을 붙여 실행하세요.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const ARCHIVE_USER_ID = "github-archive-importer";
const ARCHIVE_USER_EMAIL = "github-archive@aipms.pusan.ac.kr";

// artifact 는 BEFORE INSERT 트리거가 붙어 있다. prisma upsert 는 INSERT ... ON CONFLICT 라
// 이미 있는 행에도 INSERT 트리거가 먼저 돌아 실패한다. OPUS 이관과 같이 갈라 보낸다.
async function ensureArtifact(id: string, data: Prisma.ArtifactUncheckedCreateInput): Promise<void> {
  const existing = await prisma.artifact.findUnique({ where: { id }, select: { id: true } });
  if (existing) await prisma.artifact.update({ where: { id }, data });
  else await prisma.artifact.create({ data: { ...data, id } });
}

/** 이 이관분이 아닌 프로젝트가 이미 쓰는 저장소 주소. OPUS 이관분과 PMS 운영분이 여기 걸린다. */
async function repositoriesTakenElsewhere(ownTopicIds: string[]): Promise<Set<string>> {
  const [topics, artifacts] = await Promise.all([
    prisma.topic.findMany({
      where: { sourceUrl: { not: null }, id: { notIn: ownTopicIds } },
      select: { sourceUrl: true },
    }),
    prisma.artifact.findMany({
      where: { type: "SOURCE_CODE", externalUrl: { not: null }, projectTeam: { projectId: { notIn: ownTopicIds } } },
      select: { externalUrl: true },
    }),
  ]);
  return new Set([
    ...topics.map(({ sourceUrl }) => sourceUrl!),
    ...artifacts.map(({ externalUrl }) => externalUrl!),
  ].map(normalizeRepoUrl));
}

async function main() {
  const snapshot = JSON.parse(
    await readFile(join(here, "github-archive", "snapshot.json"), "utf8"),
  ) as SnapshotProgram[];

  await prisma.user.upsert({
    where: { id: ARCHIVE_USER_ID },
    create: {
      id: ARCHIVE_USER_ID,
      name: "GitHub 이관",
      email: ARCHIVE_USER_EMAIL,
      role: "ADMIN",
      // 로그인 수단이 없는 기록용 계정이다. 활성 사용자로 세지 않도록 비활성으로 둔다.
      accountStatus: "DISABLED",
      emailVerified: false,
    },
    update: { name: "GitHub 이관", accountStatus: "DISABLED" },
  });

  const ownTopicIds = snapshot.flatMap(({ repos }) => repos.map(({ fullName }) => stableArchiveId("topic", fullName)));
  const taken = await repositoriesTakenElsewhere(ownTopicIds);

  for (const { program: source, repos } of snapshot) {
    const startsAt = new Date(`${source.startsAt}T00:00:00+09:00`);
    const endsAt = new Date(`${source.endsAt}T23:59:59+09:00`);
    const programId = source.programId ?? stableArchiveId("program", source.key);

    if (source.programId) {
      // 이미 만들어 둔 프로그램에 채운다. 이름, 기간, 공개 여부는 운영자가 화면에서 정한 대로 둔다.
      const found = await prisma.projectProgram.findUnique({ where: { id: programId }, select: { id: true } });
      if (!found) throw new Error(`프로그램 ${programId} 가 없습니다.`);
    } else {
      const program = {
        name: source.programName,
        startsAt,
        endsAt,
        projectRegistrationStartsAt: startsAt,
        projectRegistrationEndsAt: endsAt,
        // 관계자 등록 방식(studentProjectCreationEnabled=false)은 모집 기간이 필수다.
        recruitmentStartsAt: startsAt,
        recruitmentEndsAt: endsAt,
        studentProjectCreationEnabled: false,
        executionStartsAt: startsAt,
        executionEndsAt: endsAt,
        // 원본에 지도교수 정보가 없다. 켜 두면 상세 화면에 빈 지도교수 항목이 남는다.
        advisorEnabled: false,
        isPublic: true,
        firstPublishedAt: startsAt,
        endProcessedAt: endsAt,
        icon: "TROPHY" as const,
      };
      // 대분류는 처음 만들 때만 넣는다. 운영자가 화면에서 합친 대분류를 되돌리지 않는다.
      await prisma.projectProgram.upsert({
        where: { id: programId },
        create: { id: programId, category: source.category, ...program },
        update: program,
      });
    }

    let imported = 0;
    for (const repo of repos) {
      if (taken.has(normalizeRepoUrl(repo.url))) {
        console.log(`  이미 다른 프로젝트에 있어 건너뜀: ${repo.fullName}`);
        continue;
      }
      const topicId = stableArchiveId("topic", repo.fullName);
      const projectTeamId = stableArchiveId("team", repo.fullName);
      const topic = {
        programId,
        authorId: ARCHIVE_USER_ID,
        // 지난 프로젝트 조회가 담당자 이름을 그대로 읽는다. 비워 두면 조회가 실패한다.
        managerId: ARCHIVE_USER_ID,
        title: repo.title,
        description: repo.summary || repo.title,
        capacity: 1,
        status: "ACTIVE" as const,
        publishedAt: startsAt,
        recruitmentEnabled: false,
        sourceUrl: repo.url,
      };
      await prisma.topic.upsert({ where: { id: topicId }, create: { id: topicId, ...topic }, update: topic });
      const team = { name: repo.teamName, number: repo.teamNumber, confirmedAt: startsAt };
      await prisma.projectTeam.upsert({
        where: { id: projectTeamId },
        create: { id: projectTeamId, projectId: topicId, ...team },
        update: team,
      });
      await ensureArtifact(stableArchiveId("artifact", repo.fullName, "SOURCE_CODE"), {
        projectTeamId,
        registeredById: ARCHIVE_USER_ID,
        type: "SOURCE_CODE",
        title: "소스 코드",
        externalUrl: repo.url,
        position: 1,
      });
      imported += 1;
    }
    console.log(`${source.programName}: ${imported}/${repos.length}개 넣음`);
  }
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
```

- [ ] **Step 2: 운영 실행 자리**

`compose.production.yaml` 의 `import-opus` 서비스 블록(`restart: "no"` 까지) 바로 아래에 붙인다.

```yaml
  # GitHub 에서 긁은 지난 사업 결과물(scripts/github-archive/snapshot.json)을 넣는다.
  # 실행: docker compose -f compose.production.yaml --env-file .env.production run --rm import-github
  import-github:
    build:
      context: .
      target: demo-seeder
    env_file: ${ENV_FILE:-.env.production}
    profiles: ["tools"]
    depends_on:
      postgres:
        condition: service_healthy
    command: ["./node_modules/.bin/tsx", "scripts/import-github-archive.ts", "--confirm"]
    restart: "no"
```

- [ ] **Step 3: 로컬 DB 에 두 번 넣는다**

로컬 postgres 가 켜져 있어야 한다(`docker start pnu-project-management-system-postgres-1`). 스크립트가 `dotenv/config` 로 `.env` 의 `DATABASE_URL` 을 읽는다.

```bash
npx tsx scripts/import-github-archive.ts --confirm
npx tsx scripts/import-github-archive.ts --confirm
```

Expected: 두 번 다 `제5회 PNU 창의융합SW해커톤: 16/16개 넣음`.
`--confirm` 없이 돌리면 `실제 데이터를 씁니다.` 로 멈추는지도 한 번 본다.

- [ ] **Step 4: 화면 확인**

로그아웃 상태로 `/archive?category=PNU%20창의융합%20해커톤` 을 연다.
- "2024년" 아래 "제5회 PNU 창의융합SW해커톤 16" 이 한 번만 나온다(두 번 넣었는데 32 가 아니다).
- 카드가 1팀부터 번호순이고 "1. 삼위일체 팀" 처럼 보인다.
- GitHub 버튼이 `github.com/The-5th-PNU-Convergence-SW-Hackathon/PNUSW-2024-team-01` 을 연다.
로그인해서 `/topics?view=past` 에서도 같은 프로그램이 지난 프로젝트로 보이는지 본다.

- [ ] **Step 5: 커밋**

```bash
git checkout -- next-env.d.ts
git add scripts/import-github-archive.ts compose.production.yaml
git commit -m "feat: GitHub 결과물을 지난 프로젝트로 넣는 스크립트"
```

---

### Task 10: 전체 확인과 PR

- [ ] **Step 1: 전체 테스트**

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run`
Expected: 전부 PASS. `server-action-exports` 시간 초과는 그 파일만 다시 돌려 확인한다.

- [ ] **Step 2: 타입, 린트, 빌드**

```bash
npm run typecheck
npm run lint
BETTER_AUTH_URL=https://pms.example.test npm run build
git checkout -- next-env.d.ts
```
Expected: 모두 오류 없음. 빌드 출력에서 `/archive` 가 `ƒ (Dynamic)` 이다.

- [ ] **Step 3: 푸시와 PR**

```bash
git push -u origin feat/github-archive
```

PR 제목: `사업별 결과물 공개 아카이브`
PR 본문(명사 위주로 짧게, Claude 꼬리말 없이):

```
현장평가용 공개 화면 `/archive` 와 제5회 해커톤(2024) 결과물 이관.

## 내용
- 로그인 없이 보는 사업별 결과물 화면. 사업 탭, 연도별 카드, GitHub 버튼. 이름과 사진 없음
- 졸업과제는 GitHub 조직 링크만(2022, 2023, 2025, 2026)
- 로그인 화면 상단과 하단에 링크
- GitHub 크롤링 스크립트와 스냅샷, OPUS 이관 방식의 넣기 스크립트

## 운영 반영
1. 배포
2. `docker compose -f compose.production.yaml --env-file .env.production run --rm import-github`
3. 출력 `제5회 PNU 창의융합SW해커톤: 16/16개 넣음` 확인
4. 해커톤 대분류 이름이 운영과 다르면 프로그램 관리에서 합치기
5. 로그아웃 상태로 `aipms.pusan.ac.kr/archive` 확인

## 확인
- 넣기 두 번 실행 후 16개 그대로
- 공개 조회 select 에 이름 칸 없음(테스트로 고정)
```

---

## 범위 밖 (이번에 안 함)

카카오테크캠퍼스(자료 수령 후), 졸업과제 2024 링크(조직 수령 후), README 본문 렌더링, 사진, 검색, 자동 동기화, 관리자 등록 화면.
