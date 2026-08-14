# 외부자문위원(External Advisor) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 교외 자문위원이 초대 링크로 로그인해 할당된 팀의 결과물·보고서를 열람하고 독립 채점표·피드백을 남기며, 자문위원·관리자는 5표(설정값) 투표한다.

**Architecture:** `User(role=ADVISOR)`로 기존 인증·파일 인프라에 통합. 토큰 로그인은 better-auth 커스텀 플러그인 엔드포인트로 세션 발급. 팀 할당·채점·피드백은 새 `advisor` 모듈(hexagonal: domain/application/infrastructure). 투표는 기존 `project-voting`에 역할별 한도만 추가.

**Tech Stack:** Next.js 16 App Router + RSC + Server Actions, Prisma 7.8(@prisma/adapter-pg), better-auth, vitest, zod.

**Spec:** `docs/superpowers/specs/2026-08-14-external-advisor-design.md`
**Branch:** `feat/external-advisor`

**공통 규칙 (모든 태스크):**
- 커밋 메시지에 `Co-Authored-By`·`#N` 금지.
- 한국어 문자열 리터럴을 UI에 추가하면 `src/shared/i18n/ui-messages.en.json`에 키 추가(테스트 `tests/architecture/ui-localization.test.ts`가 강제).
- 테스트 실행은 `node --env-file=.env ./node_modules/vitest/vitest.mjs run <paths>` (vitest가 .env를 자동 로드하지 않음).
- 마이그레이션·prisma generate 후 dev 서버가 떠 있으면 stale 클라이언트 → `preview_stop` 후 `.next` 삭제하고 재시작.

---

### Task 1: 스키마 마이그레이션 + ADVISOR 역할

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/modules/identity/domain/user-role.ts`
- Modify: `src/app/_components/app-shell.tsx` (역할 라벨·네비)
- Modify: tsc가 지적하는 역할 유니온 파일들

- [ ] **Step 1: schema.prisma 수정**

`enum UserRole`에 `ADVISOR` 추가:

```prisma
enum UserRole {
  STUDENT
  PROFESSOR
  ADMIN
  ADVISOR
}
```

`ProgramVotingPolicy` 모델(line ~687)에 필드 추가:

```prisma
  staffVoteLimit     Int                      @default(5)
```

새 모델 4개 추가(파일 하단, `model ProjectAssistant` 근처에 배치). `User`에 대응 relation 필드도 추가해야 함(`advisorAccessTokens AdvisorAccessToken[]`, `projectAdvisors ProjectAdvisor[] @relation("ProjectAdvisorUser")`, `grantedProjectAdvisors ProjectAdvisor[] @relation("ProjectAdvisorGrantor")`, `advisorEvaluations AdvisorEvaluation[]`, `advisorFeedbacks AdvisorFeedback[]`; `Topic`에 `advisors ProjectAdvisor[]`, `Team`에 `advisorEvaluations AdvisorEvaluation[]`·`advisorFeedbacks AdvisorFeedback[]`):

```prisma
model AdvisorAccessToken {
  id        String    @id @default(uuid())
  userId    String
  tokenHash String    @unique
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@map("advisor_access_token")
}

model ProjectAdvisor {
  id          String   @id @default(uuid())
  topicId     String
  userId      String
  grantedById String
  createdAt   DateTime @default(now())
  topic       Topic    @relation(fields: [topicId], references: [id], onDelete: Cascade)
  user        User     @relation("ProjectAdvisorUser", fields: [userId], references: [id], onDelete: Cascade)
  grantedBy   User     @relation("ProjectAdvisorGrantor", fields: [grantedById], references: [id], onDelete: Restrict)

  @@unique([topicId, userId])
  @@index([userId, createdAt])
  @@map("project_advisor")
}

model AdvisorEvaluation {
  id        String         @id @default(uuid())
  teamId    String
  advisorId String
  rubricId  String
  createdAt DateTime       @default(now())
  team      Team           @relation(fields: [teamId], references: [id], onDelete: Cascade)
  advisor   User           @relation(fields: [advisorId], references: [id], onDelete: Cascade)
  rubric    RubricDefinition @relation(fields: [rubricId], references: [id], onDelete: Restrict)
  scores    AdvisorScore[]

  @@unique([teamId, advisorId, rubricId])
  @@index([teamId])
  @@map("advisor_evaluation")
}

model AdvisorScore {
  id           String            @id @default(uuid())
  evaluationId String
  criterionId  String
  points       Int
  updatedAt    DateTime          @updatedAt
  evaluation   AdvisorEvaluation @relation(fields: [evaluationId], references: [id], onDelete: Cascade)
  criterion    RubricCriterion   @relation(fields: [criterionId], references: [id], onDelete: Restrict)

  @@unique([evaluationId, criterionId])
  @@map("advisor_score")
}

model AdvisorFeedback {
  id        String   @id @default(uuid())
  teamId    String
  advisorId String
  body      String
  createdAt DateTime @default(now())
  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  advisor   User     @relation(fields: [advisorId], references: [id], onDelete: Cascade)

  @@index([teamId, createdAt])
  @@map("advisor_feedback")
}
```

(`RubricDefinition`에 `advisorEvaluations AdvisorEvaluation[]`, `RubricCriterion`에 `advisorScores AdvisorScore[]` relation 추가.)

- [ ] **Step 2: 마이그레이션 생성·적용**

Run: `npx prisma migrate dev --name external_advisor`
Expected: 마이그레이션 폴더 생성, `prisma generate` 자동 실행. (assistant가 직접 못 돌리면 사용자에게 요청.)

- [ ] **Step 3: USER_ROLES에 ADVISOR 추가**

`src/modules/identity/domain/user-role.ts:1`:

```ts
export const USER_ROLES = ["STUDENT", "PROFESSOR", "ADMIN", "ADVISOR"] as const;
```

- [ ] **Step 4: tsc 돌려서 역할 스윕**

Run: `npx tsc --noEmit`

`UserRole`이 넓어지며 깨지는 곳을 전부 수정. 반드시 확인할 알려진 지점:

1. `src/app/_components/app-shell.tsx:136-138` 역할 라벨 — ADVISOR 케이스 추가:
```ts
const roleLabel = locale === "ko"
  ? role === "STUDENT" ? "학생" : role === "PROFESSOR" ? "교수" : role === "ADVISOR" ? "자문위원" : "관리자"
  : role === "STUDENT" ? "Student" : role === "PROFESSOR" ? "Professor" : role === "ADVISOR" ? "Advisor" : "Administrator";
```
2. `src/app/_components/app-shell.tsx:50-72` `navigationFor` — STUDENT/ADMIN 분기 뒤, 기존 fallback(교수) 앞에 ADVISOR 분기 추가:
```ts
  if (role === "ADVISOR") {
    return [
      { href: "/advisor", label: locale === "ko" ? "담당 프로젝트" : "My assignments", icon: "home" },
      { href: "/topics", label: label.explore, icon: "search" },
    ];
  }
```
3. `src/app/admin/users/page.tsx` — 역할 필터/라벨에 ADVISOR 표기 추가(존재하면).
4. 그 외 tsc 오류 나는 곳: 유니온이 `"STUDENT" | "PROFESSOR" | "ADMIN"`으로 좁게 선언된 타입은 **의미상 자문위원이 못 오는 자리면 그대로 두고**(예: 보고서 피드백 authorRole), 실제 CurrentActor가 흐르는 자리면 `UserRole`로 교체.

Expected: `npx tsc --noEmit` 클린.

- [ ] **Step 5: 기존 테스트 회귀 확인 + 커밋**

Run: `node --env-file=.env ./node_modules/vitest/vitest.mjs run tests/routes tests/architecture`
Expected: 기존 baseline 실패 외 신규 실패 0.

```bash
git add prisma/ src/
git commit -m "feat: ADVISOR 역할·자문위원 데이터모델 마이그레이션"
```

---

### Task 2: 토큰 도메인 (advisor 모듈 시작)

**Files:**
- Create: `src/modules/advisor/domain/advisor-access-token.ts`
- Create: `src/modules/advisor/domain/advisor-access-token.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```ts
// src/modules/advisor/domain/advisor-access-token.test.ts
import { describe, expect, it } from "vitest";
import {
  generateAdvisorToken,
  hashAdvisorToken,
  isTokenUsable,
} from "@/modules/advisor/domain/advisor-access-token";

describe("advisor access token", () => {
  it("원문 토큰은 43자 이상 URL-safe 문자열이고 해시는 sha256 hex다", () => {
    const { token, tokenHash } = generateAdvisorToken();
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(tokenHash).toBe(hashAdvisorToken(token));
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("만료·회수 토큰은 사용 불가", () => {
    const now = new Date("2026-08-14T00:00:00Z");
    const future = new Date("2026-09-01T00:00:00Z");
    const past = new Date("2026-08-01T00:00:00Z");
    expect(isTokenUsable({ expiresAt: future, revokedAt: null }, now)).toBe(true);
    expect(isTokenUsable({ expiresAt: past, revokedAt: null }, now)).toBe(false);
    expect(isTokenUsable({ expiresAt: future, revokedAt: past }, now)).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --env-file=.env ./node_modules/vitest/vitest.mjs run src/modules/advisor/domain/advisor-access-token.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

```ts
// src/modules/advisor/domain/advisor-access-token.ts
import { createHash, randomBytes } from "node:crypto";

export const ADVISOR_TOKEN_TTL_DAYS = 90;

export function generateAdvisorToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashAdvisorToken(token) };
}

export function hashAdvisorToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function advisorTokenExpiry(from = new Date()): Date {
  return new Date(from.getTime() + ADVISOR_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function isTokenUsable(
  token: { expiresAt: Date; revokedAt: Date | null },
  now = new Date(),
): boolean {
  return token.revokedAt === null && token.expiresAt > now;
}
```

- [ ] **Step 4: 통과 확인**

Run: 위와 동일. Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/modules/advisor/
git commit -m "feat: 자문위원 접근 토큰 도메인(생성·해시·유효성)"
```

---

### Task 3: 토큰 로그인 (better-auth 플러그인 + 접속 페이지)

**Files:**
- Create: `src/modules/advisor/infrastructure/advisor-token-auth-plugin.ts`
- Modify: `src/modules/identity/infrastructure/auth.ts:148` (plugins 배열)
- Create: `src/app/advisor-access/[token]/page.tsx` (⚠️ `/advisor` 레이아웃(로그인 게이트) 밖이어야 하므로 별도 세그먼트)

**주의:** better-auth 커스텀 엔드포인트 API는 설치된 버전 기준으로 임포트 경로 확인(`better-auth/api`의 `createAuthEndpoint`, `better-auth/cookies`의 `setSessionCookie`). dev-mock 라우트(`src/app/api/development-auth/sign-in/route.ts`)가 세션 쿠키 세팅 참고 자료.

- [ ] **Step 1: 플러그인 작성**

```ts
// src/modules/advisor/infrastructure/advisor-token-auth-plugin.ts
import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import type { BetterAuthPlugin } from "better-auth";
import { z } from "zod";

import { hashAdvisorToken, isTokenUsable } from "@/modules/advisor/domain/advisor-access-token";
import { prisma } from "@/shared/infrastructure/database/prisma";

// 초대 토큰을 검증해 자문위원 세션을 발급하는 better-auth 플러그인.
export function advisorTokenAuth(): BetterAuthPlugin {
  return {
    id: "advisor-token-auth",
    endpoints: {
      advisorSignIn: createAuthEndpoint(
        "/advisor-token/sign-in",
        { method: "POST", body: z.object({ token: z.string().min(20) }) },
        async (ctx) => {
          const tokenHash = hashAdvisorToken(ctx.body.token);
          const record = await prisma.advisorAccessToken.findUnique({
            where: { tokenHash },
            select: {
              expiresAt: true,
              revokedAt: true,
              user: { select: { id: true, role: true, isActive: true } },
            },
          });
          if (
            !record ||
            !isTokenUsable(record) ||
            record.user.role !== "ADVISOR" ||
            !record.user.isActive
          ) {
            return ctx.json({ status: "invalid" }, { status: 401 });
          }
          const session = await ctx.context.internalAdapter.createSession(record.user.id, ctx);
          const user = await ctx.context.internalAdapter.findUserById(record.user.id);
          await setSessionCookie(ctx, { session, user: user! });
          return ctx.json({ status: "ok" });
        },
      ),
    },
  };
}
```

- [ ] **Step 2: auth.ts에 플러그인 연결**

`src/modules/identity/infrastructure/auth.ts:148`:

```ts
plugins: developmentMockAuthEnabled ? [testUtils(), advisorTokenAuth()] : [advisorTokenAuth()],
```

임포트 추가: `import { advisorTokenAuth } from "@/modules/advisor/infrastructure/advisor-token-auth-plugin";`
**tsc·순환임포트 주의**: auth.ts ← plugin ← prisma 는 기존 auth.ts도 prisma를 쓰므로 안전.

- [ ] **Step 3: 접속 페이지 작성**

토큰 URL로 들어오면 클라이언트에서 플러그인 엔드포인트로 POST 후 `/advisor` 이동. 실패 시 안내.

```tsx
// src/app/advisor-access/[token]/page.tsx
import { AdvisorAccessClient } from "./access-client";

export default async function AdvisorAccessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <AdvisorAccessClient token={token} />;
}
```

```tsx
// src/app/advisor-access/[token]/access-client.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UiText } from "@/modules/translation/ui/i18n-provider";

export function AdvisorAccessClient({ token }: { token: string }) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/advisor-token/sign-in", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    }).then((response) => {
      if (cancelled) return;
      if (response.ok) router.replace("/advisor");
      else setFailed(true);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [router, token]);
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <p className="text-sm font-semibold">
        <UiText>{failed
          ? "초대 링크가 만료되었거나 회수되었습니다. 관리자에게 재발급을 요청해 주세요."
          : "자문위원 확인 중입니다."}</UiText>
      </p>
    </main>
  );
}
```

- [ ] **Step 4: 검증**

Run: `npx tsc --noEmit` → 클린.
수동 스모크(로컬): DB에 ADVISOR User+토큰 심고 `/advisor/access/<token>` 접속 → `/advisor` 리다이렉트(다음 태스크 전이라 404여도 세션 쿠키 확인). 세션 쿠키가 안 붙으면 better-auth 버전의 플러그인 API를 dev-mock 라우트 방식(쿠키 수동 세팅)으로 대체.

- [ ] **Step 5: i18n 키 + 커밋**

`ui-messages.en.json`에: `"초대 링크가 만료되었거나 회수되었습니다. 관리자에게 재발급을 요청해 주세요."`, `"자문위원 확인 중입니다."`

```bash
git add src/modules/advisor/ src/modules/identity/ src/app/advisor/ src/shared/i18n/
git commit -m "feat: 자문위원 초대 토큰 로그인(better-auth 플러그인·접속 페이지)"
```

---

### Task 4: 관리자 — 자문위원 등록·토큰·팀 할당 (백엔드)

**Files:**
- Create: `src/modules/advisor/application/manage-advisors.ts`
- Create: `src/modules/advisor/application/manage-advisors.test.ts`
- Create: `src/modules/advisor/infrastructure/prisma-advisor-admin-repository.ts`

- [ ] **Step 1: 실패 테스트 (서비스 정책)**

```ts
// src/modules/advisor/application/manage-advisors.test.ts
import { describe, expect, it, vi } from "vitest";
import { AdvisorAdminService, AdvisorOperationError } from "@/modules/advisor/application/manage-advisors";

const admin = { id: "admin-1", role: "ADMIN" as const };
const student = { id: "stu-1", role: "STUDENT" as const };

function repository() {
  return {
    registerAdvisor: vi.fn().mockResolvedValue({ userId: "adv-1" }),
    issueToken: vi.fn().mockResolvedValue(true),
    revokeTokens: vi.fn().mockResolvedValue(true),
    assignTeams: vi.fn().mockResolvedValue(true),
  };
}

describe("AdvisorAdminService", () => {
  it("관리자만 자문위원을 등록할 수 있다", async () => {
    const repo = repository();
    const service = new AdvisorAdminService(repo);
    await expect(service.register(student, { name: "김위원", email: "advisor@example.com" }))
      .rejects.toBeInstanceOf(AdvisorOperationError);
    await service.register(admin, { name: "김위원", email: "advisor@example.com" });
    expect(repo.registerAdvisor).toHaveBeenCalledOnce();
  });

  it("등록 시 토큰을 발급하고 원문 토큰을 반환한다", async () => {
    const service = new AdvisorAdminService(repository());
    const result = await service.register(admin, { name: "김위원", email: "advisor@example.com" });
    expect(result.inviteToken).toMatch(/^[A-Za-z0-9_-]{43,}$/);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --env-file=.env ./node_modules/vitest/vitest.mjs run src/modules/advisor/application/manage-advisors.test.ts`
Expected: FAIL

- [ ] **Step 3: 서비스 구현**

```ts
// src/modules/advisor/application/manage-advisors.ts
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import {
  advisorTokenExpiry,
  generateAdvisorToken,
} from "@/modules/advisor/domain/advisor-access-token";

export class AdvisorOperationError extends Error {}

export interface AdvisorAdminRepository {
  registerAdvisor(input: { name: string; email: string }): Promise<{ userId: string } | null>;
  issueToken(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<boolean>;
  revokeTokens(input: { userId: string; revokedAt: Date }): Promise<boolean>;
  assignTeams(input: { userId: string; programId: string; topicIds: string[]; grantedById: string }): Promise<boolean>;
}

export class AdvisorAdminService {
  constructor(private readonly repository: AdvisorAdminRepository) {}

  private assertAdmin(actor: CurrentActor) {
    if (actor.role !== "ADMIN") throw new AdvisorOperationError("관리자만 자문위원을 관리할 수 있습니다.");
  }

  async register(actor: CurrentActor, input: { name: string; email: string }) {
    this.assertAdmin(actor);
    const advisor = await this.repository.registerAdvisor(input);
    if (!advisor) throw new AdvisorOperationError("자문위원 정보를 확인해 주세요.");
    const inviteToken = await this.reissueToken(actor, advisor.userId);
    return { userId: advisor.userId, inviteToken };
  }

  async reissueToken(actor: CurrentActor, userId: string) {
    this.assertAdmin(actor);
    const now = new Date();
    await this.repository.revokeTokens({ userId, revokedAt: now });
    const { token, tokenHash } = generateAdvisorToken();
    const issued = await this.repository.issueToken({ userId, tokenHash, expiresAt: advisorTokenExpiry(now) });
    if (!issued) throw new AdvisorOperationError("초대 토큰을 발급하지 못했습니다.");
    return token;
  }

  async revoke(actor: CurrentActor, userId: string) {
    this.assertAdmin(actor);
    await this.repository.revokeTokens({ userId, revokedAt: new Date() });
  }

  async assignTeams(actor: CurrentActor, input: { userId: string; programId: string; topicIds: string[] }) {
    this.assertAdmin(actor);
    const saved = await this.repository.assignTeams({ ...input, grantedById: actor.id });
    if (!saved) throw new AdvisorOperationError("팀 할당을 저장하지 못했습니다.");
  }
}
```

- [ ] **Step 4: 통과 확인 후 리포지토리 구현**

```ts
// src/modules/advisor/infrastructure/prisma-advisor-admin-repository.ts
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import type { AdvisorAdminRepository } from "@/modules/advisor/application/manage-advisors";
import { normalizeEmail } from "@/modules/identity/domain/user-role";

export class PrismaAdvisorAdminRepository implements AdvisorAdminRepository {
  constructor(private readonly client: PrismaClient) {}

  // 동일 이메일 기존 ADVISOR는 재사용, 타 역할 이메일이면 거부(null).
  async registerAdvisor(input: { name: string; email: string }) {
    const email = normalizeEmail(input.email);
    const existing = await this.client.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (existing) return existing.role === "ADVISOR" ? { userId: existing.id } : null;
    const created = await this.client.user.create({
      data: {
        id: randomUUID(),
        email,
        name: input.name.trim(),
        role: "ADVISOR",
        emailVerified: false,
        isActive: true,
        onboardingRequired: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: { id: true },
    });
    return { userId: created.id };
  }

  async issueToken(input: { userId: string; tokenHash: string; expiresAt: Date }) {
    await this.client.advisorAccessToken.create({
      data: { id: randomUUID(), userId: input.userId, tokenHash: input.tokenHash, expiresAt: input.expiresAt },
    });
    return true;
  }

  async revokeTokens(input: { userId: string; revokedAt: Date }) {
    await this.client.advisorAccessToken.updateMany({
      where: { userId: input.userId, revokedAt: null },
      data: { revokedAt: input.revokedAt },
    });
    return true;
  }

  // 전체 교체 방식(프로그램 스코프): 이 프로그램의 topic만 동기화 — 다른 프로그램 할당은 보존.
  async assignTeams(input: { userId: string; programId: string; topicIds: string[]; grantedById: string }) {
    await this.client.$transaction(async (transaction) => {
      await transaction.projectAdvisor.deleteMany({
        where: { userId: input.userId, topic: { programId: input.programId }, topicId: { notIn: input.topicIds } },
      });
      const existing = await transaction.projectAdvisor.findMany({
        where: { userId: input.userId, topic: { programId: input.programId } },
        select: { topicId: true },
      });
      const have = new Set(existing.map((row) => row.topicId));
      const toAdd = input.topicIds.filter((topicId) => !have.has(topicId));
      if (toAdd.length > 0) {
        await transaction.projectAdvisor.createMany({
          data: toAdd.map((topicId) => ({
            id: randomUUID(),
            topicId,
            userId: input.userId,
            grantedById: input.grantedById,
          })),
        });
      }
    });
    return true;
  }
}
```

**주의:** `user.create`에 필요한 not-null 컬럼(better-auth 스키마)은 실제 `User` 모델을 열어 확인하고 맞출 것(예: `image` nullable 여부).

Run: `node --env-file=.env ./node_modules/vitest/vitest.mjs run src/modules/advisor/` → PASS, `npx tsc --noEmit` 클린.

- [ ] **Step 5: 커밋**

```bash
git add src/modules/advisor/
git commit -m "feat: 자문위원 등록·토큰 발급·팀 할당 서비스"
```

---### Task 5: 관리자 — 프로그램 자문위원 탭 (UI + 액션)

**Files:**
- Create: `src/app/admin/programs/_actions/advisor-actions.ts`
- Create: `src/app/admin/programs/_components/program-advisor-panel.tsx`
- Modify: `src/app/admin/programs/[programId]/page.tsx` (탭 추가 — 기존 `?tab=` 허브 패턴 따름)
- Create: `src/modules/advisor/infrastructure/prisma-advisor-admin-query.ts` (목록·집계 조회)

- [ ] **Step 1: 조회 쿼리 구현**

```ts
// src/modules/advisor/infrastructure/prisma-advisor-admin-query.ts
import type { PrismaClient } from "@/generated/prisma/client";

export type ProgramAdvisorRow = {
  userId: string;
  name: string;
  email: string;
  assignedTopicIds: string[];
  activeToken: { expiresAt: Date } | null;
};

// 프로그램 화면용: 전체 ADVISOR + 이 프로그램 topic 할당 현황.
export async function listProgramAdvisors(client: PrismaClient, programId: string): Promise<ProgramAdvisorRow[]> {
  const advisors = await client.user.findMany({
    where: { role: "ADVISOR", isActive: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, name: true, email: true,
      projectAdvisors: { where: { topic: { programId } }, select: { topicId: true } },
      advisorAccessTokens: {
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" }, take: 1, select: { expiresAt: true },
      },
    },
  });
  return advisors.map((advisor) => ({
    userId: advisor.id,
    name: advisor.name,
    email: advisor.email,
    assignedTopicIds: advisor.projectAdvisors.map((row) => row.topicId),
    activeToken: advisor.advisorAccessTokens[0] ?? null,
  }));
}

export type AdvisorScoreMatrixRow = {
  teamId: string; teamName: string;
  scores: Array<{ advisorId: string; advisorName: string; total: number }>;
  average: number | null;
};

// 점수 집계: 프로그램 내 팀 × 자문위원 총점 매트릭스.
export async function advisorScoreMatrix(client: PrismaClient, programId: string): Promise<AdvisorScoreMatrixRow[]> {
  const teams = await client.team.findMany({
    where: { programId },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true,
      advisorEvaluations: {
        select: {
          advisorId: true,
          advisor: { select: { name: true } },
          scores: { select: { points: true } },
        },
      },
    },
  });
  return teams.map((team) => {
    const scores = team.advisorEvaluations.map((evaluation) => ({
      advisorId: evaluation.advisorId,
      advisorName: evaluation.advisor.name,
      total: evaluation.scores.reduce((sum, score) => sum + score.points, 0),
    }));
    return {
      teamId: team.id, teamName: team.name, scores,
      average: scores.length ? scores.reduce((sum, s) => sum + s.total, 0) / scores.length : null,
    };
  });
}
```

- [ ] **Step 2: 서버 액션 작성**

```ts
// src/app/admin/programs/_actions/advisor-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { AdvisorAdminService, AdvisorOperationError } from "@/modules/advisor/application/manage-advisors";
import { PrismaAdvisorAdminRepository } from "@/modules/advisor/infrastructure/prisma-advisor-admin-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type AdvisorActionState = { status: "idle" | "error" | "success"; message: string; inviteLink?: string };

function service() {
  return new AdvisorAdminService(new PrismaAdvisorAdminRepository(prisma));
}

function inviteLink(token: string) {
  return `/advisor/access/${token}`;
}

const registerSchema = z.object({ programId: z.string().uuid(), name: z.string().trim().min(1).max(100), email: z.string().email() });

export async function registerAdvisorAction(_state: AdvisorActionState, formData: FormData): Promise<AdvisorActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "자문위원 이름과 이메일을 확인해 주세요." };
  try {
    const result = await service().register(actor, parsed.data);
    revalidatePath(`/admin/programs/${parsed.data.programId}`);
    return { status: "success", message: "자문위원을 등록했습니다. 초대 링크를 복사해 전달하세요.", inviteLink: inviteLink(result.inviteToken) };
  } catch (error) {
    if (error instanceof AdvisorOperationError) return { status: "error", message: error.message };
    throw error;
  }
}

const reissueSchema = z.object({ programId: z.string().uuid(), userId: z.string().uuid() });

export async function reissueAdvisorTokenAction(_state: AdvisorActionState, formData: FormData): Promise<AdvisorActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = reissueSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "재발급할 자문위원을 확인해 주세요." };
  try {
    const token = await service().reissueToken(actor, parsed.data.userId);
    revalidatePath(`/admin/programs/${parsed.data.programId}`);
    return { status: "success", message: "초대 링크를 재발급했습니다.", inviteLink: inviteLink(token) };
  } catch (error) {
    if (error instanceof AdvisorOperationError) return { status: "error", message: error.message };
    throw error;
  }
}

export async function revokeAdvisorTokenAction(_state: AdvisorActionState, formData: FormData): Promise<AdvisorActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = reissueSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "회수할 자문위원을 확인해 주세요." };
  try {
    await service().revoke(actor, parsed.data.userId);
    revalidatePath(`/admin/programs/${parsed.data.programId}`);
    return { status: "success", message: "초대 링크를 회수했습니다." };
  } catch (error) {
    if (error instanceof AdvisorOperationError) return { status: "error", message: error.message };
    throw error;
  }
}

const assignSchema = z.object({ programId: z.string().uuid(), userId: z.string().uuid(), topicIds: z.string() });

export async function assignAdvisorTeamsAction(_state: AdvisorActionState, formData: FormData): Promise<AdvisorActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = assignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "할당할 팀을 확인해 주세요." };
  const topicIds = parsed.data.topicIds.split(",").filter(Boolean);
  try {
    await service().assignTeams(actor, { userId: parsed.data.userId, programId: parsed.data.programId, topicIds });
    revalidatePath(`/admin/programs/${parsed.data.programId}`);
    return { status: "success", message: "팀 할당을 저장했습니다." };
  } catch (error) {
    if (error instanceof AdvisorOperationError) return { status: "error", message: error.message };
    throw error;
  }
}
```

- [ ] **Step 3: 패널 컴포넌트 + 탭 연결**

`program-advisor-panel.tsx`(client): 등록 폼(이름·이메일) / 위원 목록(이메일·토큰 만료일·초대링크 복사 버튼(navigator.clipboard, 성공 시 액션이 돌려준 `inviteLink`를 origin 붙여 복사)·재발급·회수) / 위원별 팀 할당 체크박스(프로그램의 팀 목록, `topicIds` hidden input에 콤마 조인) / 점수 매트릭스 테이블(read-only). 기존 폼 컴포넌트(`useActionState`, `FormSection`, `ChoiceCard`) 패턴 재사용.

`[programId]/page.tsx`: 기존 탭 배열에 `{ key: "advisors", label: "자문위원" }` 추가, 해당 탭에서 `listProgramAdvisors`·`advisorScoreMatrix`·프로그램 팀 목록(topic+team name) 조회해 패널 렌더. 파일 열어 기존 탭 렌더 분기 패턴 그대로 따를 것.

- [ ] **Step 4: 검증**

Run: `npx tsc --noEmit` 클린 + `node --env-file=.env ./node_modules/vitest/vitest.mjs run tests/architecture/ui-localization.test.ts` (신규 한국어 문자열 키 추가 확인).
수동: admin으로 프로그램 → 자문위원 탭 → 등록 → 링크 복사 → 시크릿 창에서 접속 → 세션 성공.

- [ ] **Step 5: 커밋**

```bash
git add src/app/admin/ src/modules/advisor/ src/shared/i18n/
git commit -m "feat: 프로그램 관리 자문위원 탭(등록·초대링크·팀 할당·점수 집계)"
```

---

### Task 6: 자문위원 화면 — 담당 목록·프로젝트 상세(열람)

**Files:**
- Create: `src/modules/advisor/infrastructure/prisma-advisor-workspace-query.ts`
- Create: `src/app/advisor/layout.tsx` (ADVISOR 게이트 + AppShell)
- Create: `src/app/advisor/page.tsx` (담당 목록)
- Create: `src/app/advisor/[topicId]/page.tsx` (상세: 소개·결과물·보고서·채점·피드백)

- [ ] **Step 1: 조회 쿼리**

```ts
// src/modules/advisor/infrastructure/prisma-advisor-workspace-query.ts
import type { PrismaClient } from "@/generated/prisma/client";

// 자문위원 담당 목록.
export async function listAssignedProjects(client: PrismaClient, advisorId: string) {
  const rows = await client.projectAdvisor.findMany({
    where: { userId: advisorId },
    orderBy: { createdAt: "asc" },
    select: {
      topic: {
        select: {
          id: true, title: true,
          program: { select: { id: true, name: true } },
          team: { select: { id: true, name: true, status: true } },
        },
      },
    },
  });
  return rows.map(({ topic }) => topic);
}

// 상세: 할당 검증 포함(비할당이면 null → notFound).
export async function findAssignedProject(client: PrismaClient, advisorId: string, topicId: string) {
  const assignment = await client.projectAdvisor.findUnique({
    where: { topicId_userId: { topicId, userId: advisorId } },
    select: {
      topic: {
        select: {
          id: true, title: true, description: true,
          program: { select: { id: true, name: true, endsAt: true } },
          divisionId: true,
          team: {
            select: {
              id: true, name: true, showcaseIntro: true,
              artifacts: {
                orderBy: [{ position: "asc" }, { createdAt: "asc" }],
                select: { id: true, type: true, title: true, fileId: true, externalUrl: true, createdAt: true },
              },
              reports: {
                orderBy: { dueAt: "asc" },
                select: {
                  id: true, titleSnapshot: true,
                  versions: {
                    orderBy: { version: "desc" }, take: 1,
                    select: { version: true, fileId: true, submittedAt: true, file: { select: { originalName: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  return assignment?.topic ?? null;
}
```

**주의:** `Topic ↔ Team` 관계 필드명은 스키마 확인(`team Team?`인지 역참조인지). 팀 없는 topic(편성 전)은 상세에서 "팀이 아직 구성되지 않았습니다" 표시.

- [ ] **Step 2: 레이아웃 + 게이트**

```tsx
// src/app/advisor/layout.tsx
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/app/_components/app-shell";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";

export default async function AdvisorLayout({ children }: { children: ReactNode }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADVISOR" && actor.role !== "ADMIN") redirect("/topics");
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/advisor">
      {children}
    </AppShell>
  );
}
```

**주의:** `/advisor/access/[token]`은 이 레이아웃 밖이어야 함(로그인 전) — access 폴더는 상위 `src/app/advisor/access/[token]/page.tsx`가 이 layout을 상속하므로, **access를 `src/app/advisor-access/[token]/`로 빼거나** route group `(advisor)`으로 레이아웃 분리. 계획: `src/app/advisor-access/[token]/`로 배치하고 Task 3의 경로·플러그인 링크(`/advisor-access/<token>`)를 이에 맞춤.

- [ ] **Step 3: 목록·상세 페이지**

`page.tsx`: `listAssignedProjects` 카드 그리드(팀명·주제·프로그램·상태 뱃지, 링크 `/advisor/[topicId]`). 빈 상태 "할당된 프로젝트가 없습니다".

`[topicId]/page.tsx`: `findAssignedProject` → notFound 처리. 섹션: ① 소개(`renderMarkdown(showcaseIntro ?? description)` — `@/shared/ui/render-markdown`) ② 결과물(artifacts 페이지의 `ArtifactMedia` 패턴 재사용: 유튜브 임베드·이미지·파일받기 링크 `/api/files/{fileId}`) ③ 보고서(최신 버전 파일명+다운로드 링크) ④ 채점표·피드백(Task 7에서 삽입할 자리 — 이번엔 렌더 안 함).

- [ ] **Step 4: 검증**

Run: `npx tsc --noEmit` + ui-localization 테스트.
수동: 토큰 로그인 → `/advisor` 목록 → 상세 → 비할당 topicId URL 직접 접근 시 404.

- [ ] **Step 5: 커밋**

```bash
git add src/app/advisor* src/modules/advisor/ src/shared/i18n/
git commit -m "feat: 자문위원 담당 프로젝트 목록·상세 열람 화면"
```

---

### Task 7: 채점표·피드백 (자문위원 쓰기 + 팀 노출)

**Files:**
- Create: `src/modules/advisor/application/advisor-review.ts` + `.test.ts`
- Create: `src/modules/advisor/infrastructure/prisma-advisor-review-repository.ts`
- Create: `src/app/advisor/_actions/advisor-review-actions.ts`
- Create: `src/app/advisor/_components/advisor-scoring-form.tsx`, `advisor-feedback-form.tsx`
- Modify: `src/app/advisor/[topicId]/page.tsx` (섹션 삽입)
- Modify: `src/app/teams/[teamId]/evaluations/page.tsx` (자문위원 피드백 섹션)

- [ ] **Step 1: 서비스 실패 테스트**

```ts
// src/modules/advisor/application/advisor-review.test.ts
import { describe, expect, it, vi } from "vitest";
import { AdvisorReviewService, AdvisorOperationError } from "@/modules/advisor/application/advisor-review";

const advisor = { id: "adv-1", role: "ADVISOR" as const };
const programEndsAt = new Date("2026-12-31T00:00:00Z");

function repository(overrides = {}) {
  return {
    findAssignment: vi.fn().mockResolvedValue({ teamId: "team-1", programEndsAt, rubric: { id: "rubric-1", criteria: [{ id: "c1", maxPoints: 30 }, { id: "c2", maxPoints: 70 }] } }),
    saveScores: vi.fn().mockResolvedValue(true),
    addFeedback: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("AdvisorReviewService", () => {
  it("배점 초과 점수는 거부한다", async () => {
    const service = new AdvisorReviewService(repository());
    await expect(service.saveScores(advisor, { topicId: "t", scores: [{ criterionId: "c1", points: 31 }] }, new Date("2026-08-14")))
      .rejects.toBeInstanceOf(AdvisorOperationError);
  });

  it("프로그램 종료 후 쓰기는 거부한다", async () => {
    const service = new AdvisorReviewService(repository());
    await expect(service.saveScores(advisor, { topicId: "t", scores: [{ criterionId: "c1", points: 10 }] }, new Date("2027-01-01")))
      .rejects.toBeInstanceOf(AdvisorOperationError);
  });

  it("비할당 프로젝트는 거부한다", async () => {
    const service = new AdvisorReviewService(repository({ findAssignment: vi.fn().mockResolvedValue(null) }));
    await expect(service.addFeedback(advisor, { topicId: "t", body: "좋아요" }, new Date("2026-08-14")))
      .rejects.toBeInstanceOf(AdvisorOperationError);
  });
});
```

- [ ] **Step 2: 실패 확인 → 서비스 구현**

```ts
// src/modules/advisor/application/advisor-review.ts
import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export class AdvisorOperationError extends Error {}

export type AdvisorAssignmentContext = {
  teamId: string;
  programEndsAt: Date;
  rubric: { id: string; criteria: Array<{ id: string; maxPoints: number }> } | null;
};

export interface AdvisorReviewRepository {
  findAssignment(advisorId: string, topicId: string): Promise<AdvisorAssignmentContext | null>;
  saveScores(input: { teamId: string; advisorId: string; rubricId: string; scores: Array<{ criterionId: string; points: number }> }): Promise<boolean>;
  addFeedback(input: { teamId: string; advisorId: string; body: string; createdAt: Date }): Promise<boolean>;
}

export class AdvisorReviewService {
  constructor(private readonly repository: AdvisorReviewRepository) {}

  private async assertWritable(actor: CurrentActor, topicId: string, now: Date) {
    if (actor.role !== "ADVISOR") throw new AdvisorOperationError("자문위원만 사용할 수 있습니다.");
    const assignment = await this.repository.findAssignment(actor.id, topicId);
    if (!assignment) throw new AdvisorOperationError("할당된 프로젝트가 아닙니다.");
    if (now > assignment.programEndsAt) throw new AdvisorOperationError("프로그램이 종료되어 더 이상 작성할 수 없습니다.");
    return assignment;
  }

  async saveScores(actor: CurrentActor, input: { topicId: string; scores: Array<{ criterionId: string; points: number }> }, now = new Date()) {
    const assignment = await this.assertWritable(actor, input.topicId, now);
    if (!assignment.rubric) throw new AdvisorOperationError("채점표가 준비되지 않았습니다.");
    const maxByCriterion = new Map(assignment.rubric.criteria.map((criterion) => [criterion.id, criterion.maxPoints]));
    for (const score of input.scores) {
      const max = maxByCriterion.get(score.criterionId);
      if (max === undefined || !Number.isSafeInteger(score.points) || score.points < 0 || score.points > max) {
        throw new AdvisorOperationError("점수는 0부터 항목 배점까지만 입력할 수 있습니다.");
      }
    }
    const saved = await this.repository.saveScores({
      teamId: assignment.teamId,
      advisorId: actor.id,
      rubricId: assignment.rubric.id,
      scores: input.scores,
    });
    if (!saved) throw new AdvisorOperationError("점수를 저장하지 못했습니다.");
  }

  async addFeedback(actor: CurrentActor, input: { topicId: string; body: string }, now = new Date()) {
    const assignment = await this.assertWritable(actor, input.topicId, now);
    const body = input.body.trim();
    if (body.length < 1 || body.length > 4000) throw new AdvisorOperationError("피드백 내용을 확인해 주세요.");
    const saved = await this.repository.addFeedback({ teamId: assignment.teamId, advisorId: actor.id, body, createdAt: now });
    if (!saved) throw new AdvisorOperationError("피드백을 저장하지 못했습니다.");
  }
}
```

Run 테스트 → PASS.

- [ ] **Step 3: 리포지토리 구현**

```ts
// src/modules/advisor/infrastructure/prisma-advisor-review-repository.ts
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import type { AdvisorAssignmentContext, AdvisorReviewRepository } from "@/modules/advisor/application/advisor-review";

export class PrismaAdvisorReviewRepository implements AdvisorReviewRepository {
  constructor(private readonly client: PrismaClient) {}

  // 팀 분과에 맞는 루브릭(분과 지정 우선, 없으면 공통) 1개 선택.
  async findAssignment(advisorId: string, topicId: string): Promise<AdvisorAssignmentContext | null> {
    const assignment = await this.client.projectAdvisor.findUnique({
      where: { topicId_userId: { topicId, userId: advisorId } },
      select: {
        topic: {
          select: {
            divisionId: true,
            program: { select: { id: true, endsAt: true } },
            team: { select: { id: true } },
          },
        },
      },
    });
    const topic = assignment?.topic;
    if (!topic?.team) return null;
    const rubric = await this.client.rubricDefinition.findFirst({
      where: {
        programId: topic.program.id,
        archivedAt: null,
        OR: [{ divisionId: topic.divisionId }, { divisionId: null }],
      },
      orderBy: [{ divisionId: { sort: "desc", nulls: "last" } }, { position: "asc" }],
      select: { id: true, criteria: { orderBy: { position: "asc" }, select: { id: true, maxPoints: true } } },
    });
    return {
      teamId: topic.team.id,
      programEndsAt: topic.program.endsAt,
      rubric: rubric ? { id: rubric.id, criteria: rubric.criteria } : null,
    };
  }

  async saveScores(input: { teamId: string; advisorId: string; rubricId: string; scores: Array<{ criterionId: string; points: number }> }) {
    await this.client.$transaction(async (transaction) => {
      const evaluation = await transaction.advisorEvaluation.upsert({
        where: { teamId_advisorId_rubricId: { teamId: input.teamId, advisorId: input.advisorId, rubricId: input.rubricId } },
        create: { id: randomUUID(), teamId: input.teamId, advisorId: input.advisorId, rubricId: input.rubricId },
        update: {},
        select: { id: true },
      });
      for (const score of input.scores) {
        await transaction.advisorScore.upsert({
          where: { evaluationId_criterionId: { evaluationId: evaluation.id, criterionId: score.criterionId } },
          create: { id: randomUUID(), evaluationId: evaluation.id, criterionId: score.criterionId, points: score.points },
          update: { points: score.points },
        });
      }
    });
    return true;
  }

  async addFeedback(input: { teamId: string; advisorId: string; body: string; createdAt: Date }) {
    await this.client.advisorFeedback.create({
      data: { id: randomUUID(), teamId: input.teamId, advisorId: input.advisorId, body: input.body, createdAt: input.createdAt },
    });
    return true;
  }
}
```

**주의:** `orderBy divisionId nulls` 문법이 Prisma 버전에서 안 되면 두 번 조회(분과 지정 먼저, 없으면 공통)로 대체.

- [ ] **Step 4: 액션 + 폼 + 페이지 삽입**

`advisor-review-actions.ts`: `saveAdvisorScoresAction`(scores는 `criterionId:points` 콤마 페어 or `score-<criterionId>` 필드 수집), `addAdvisorFeedbackAction`. 기존 액션 패턴(`useActionState` 시그니처, 에러 메시지 매핑) 동일.

`advisor-scoring-form.tsx`: 루브릭 항목별 숫자 입력(0~maxPoints, 기존 저장값 defaultValue) + 총점 표시 + 저장. `advisor-feedback-form.tsx`: textarea + 등록, 기존 작성 목록 표시.

`[topicId]/page.tsx`: 채점표 데이터(본인 evaluation의 scores)와 피드백 목록(본인 것) 조회해 두 폼 렌더. 프로그램 종료 후엔 읽기 전용 안내.

`src/app/teams/[teamId]/evaluations/page.tsx`: 하단에 "자문위원 피드백" 섹션 — `advisorFeedback.findMany({ where: { teamId }, orderBy: { createdAt: "asc" }, select: { id, body, createdAt, advisor: { select: { name } } } })` 를 마크다운 렌더로 표시. 접근권은 페이지 기존 게이트 그대로(팀원+운영진). **자문위원 점수**는 같은 페이지에서 actor가 ADMIN 또는 이 팀 지도교수일 때만 위원별 총점 표(팀원에겐 렌더 자체를 안 함) — 스펙 "점수 열람 = ADMIN·지도교수" 충족.

- [ ] **Step 5: 검증 + 커밋**

Run: `npx tsc --noEmit`, advisor 모듈 테스트, ui-localization.
수동: 자문위원으로 채점 저장→재저장(수정), 피드백 작성→팀 계정으로 평가 탭에서 확인.

```bash
git add src/modules/advisor/ src/app/advisor/ src/app/teams/ src/shared/i18n/
git commit -m "feat: 자문위원 채점표·피드백 작성 + 팀 평가탭 피드백 노출"
```

---

### Task 8: 파일·보고서 다운로드 advisor 분기

**Files:**
- Modify: `src/app/api/files/[fileId]/route.ts:38-46` (`teamActorWhere`)
- Modify: `src/app/api/teams/[teamId]/submissions/route.ts` (동일 패턴 확인 후 분기)

- [ ] **Step 1: `/api/files` 분기**

`teamActorWhere`에 ADVISOR 절 추가:

```ts
function teamActorWhere(actor: { id: string; role: UserRole }): Prisma.TeamWhereInput {
  if (actor.role === "ADMIN") return {};
  if (actor.role === "ADVISOR") {
    return { topic: { advisors: { some: { userId: actor.id } } } };
  }
  return {
    OR: [
      teamSupervisorWhere(actor),
      { members: { some: { studentId: actor.id } } },
    ],
  };
}
```

임포트 `UserRole` 타입으로 시그니처 교체(`"STUDENT" | "PROFESSOR" | "ADMIN"` 유니온 제거).

- [ ] **Step 2: 보고서 zip 라우트 분기**

`src/app/api/teams/[teamId]/submissions/route.ts` 열어 접근 체크 확인 — 같은 방식으로 ADVISOR = 할당 topic 팀이면 허용.

- [ ] **Step 3: 검증**

수동: 자문위원 세션으로 할당 팀 파일 다운로드 200/302, 비할당 팀 파일 404.
Run: `npx tsc --noEmit`.

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/
git commit -m "feat: 파일·보고서 다운로드에 자문위원 할당팀 접근 허용"
```

---

### Task 9: 투표 — staffVoteLimit (자문위원·관리자 5표)

**Files:**
- Modify: `src/modules/project-program/domain/project-program-policy.ts:7-14,67-79`
- Modify: `src/modules/project-voting/application/manage-project-voting.ts:74-97`
- Modify: `src/modules/project-voting/infrastructure/prisma-project-voting-repository.ts` (policy select 매핑)
- Modify: `src/modules/project-program/infrastructure/prisma-project-program-repository.ts` (설정 저장/조회 매핑)
- Modify: `src/app/admin/programs/_actions/program-actions.ts` (투표 설정 폼 파싱)
- Modify: 투표 설정 폼 컴포넌트(투표 탭 — `staffVoteLimit` 숫자 입력 추가)
- Test: `src/modules/project-voting/application/manage-project-voting.test.ts`

- [ ] **Step 1: 실패 테스트 추가**

기존 `manage-project-voting.test.ts`에 추가(기존 목 리포지토리 패턴 재사용):

```ts
it("자문위원·관리자는 staffVoteLimit을 적용받는다", async () => {
  // 기존 테스트의 ballot fixture에서 policy를 { voteLimit: 3, staffVoteLimit: 5, ... }로 두고
  const advisor = { id: "adv-1", role: "ADVISOR" as const, name: "김위원", email: "a@example.com", image: null };
  // 4개 선택 → 학생이면 실패했겠지만 자문위원은 성공해야 한다
  await expect(service.saveVotes(advisor, programId, ["t1", "t2", "t3", "t4"])).resolves.toBeUndefined();
  const student = { id: "stu-1", role: "STUDENT" as const, name: "학생", email: "s@example.com", image: null };
  await expect(service.saveVotes(student, programId, ["t1", "t2", "t3", "t4"])).rejects.toThrow();
});
```

- [ ] **Step 2: 타입·정규화 수정**

`project-program-policy.ts`:

```ts
export type ProgramVotingPolicyDetails = {
  startsAt: Date;
  endsAt: Date;
  voteLimit: number;
  staffVoteLimit: number;
  voteLimitScope?: VoteLimitScope;
  selfVotingAllowed: boolean;
  identityVisibility: VotingIdentityVisibility;
};
```

`normalizeProgramVotingPolicy`에 검증 추가:

```ts
  if (!Number.isSafeInteger(input.staffVoteLimit) || input.staffVoteLimit < 1) {
    throw new InvalidProjectProgramError("자문위원·관리자 가능 투표수는 1 이상이어야 합니다.");
  }
```

tsc가 지적하는 모든 정책 생성처(fixture 포함)에 `staffVoteLimit: 5` 채우기.

- [ ] **Step 3: 서비스 역할별 한도 적용**

`manage-project-voting.ts`의 `ProjectVotingService`:

```ts
  private withEffectiveLimit(actor: CurrentUser, ballot: ProgramVoteBallot): ProgramVoteBallot {
    const isStaffVoter = actor.role === "ADMIN" || actor.role === "ADVISOR";
    if (!isStaffVoter) return ballot;
    return { ...ballot, policy: { ...ballot.policy, voteLimit: ballot.policy.staffVoteLimit } };
  }

  async getBallot(actor: CurrentUser, programId: string) {
    const ballot = await this.repository.findBallot(programId, actor.id, this.now());
    return ballot ? this.withEffectiveLimit(actor, ballot) : null;
  }

  async saveVotes(actor: CurrentUser, programId: string, topicIds: readonly string[]) {
    const raw = await this.repository.findBallot(programId, actor.id, this.now());
    if (!raw) throw new ProjectVotingOperationError("투표 설정이 없는 프로그램입니다.");
    const ballot = this.withEffectiveLimit(actor, raw);
    const selectedTopicIds = normalizeVoteSelection(topicIds, ballot.policy, ballot.candidates);
    // ...이하 기존 그대로
  }
```

`getBallot`이 effective limit을 이미 반영하므로 액션(`project-vote-actions.ts`)·투표 UI는 **무수정**.

- [ ] **Step 4: 저장·조회 매핑 + 설정 폼**

- `prisma-project-voting-repository.ts` findBallot의 policy 매핑에 `staffVoteLimit: votingPolicy.staffVoteLimit` 추가.
- `prisma-project-program-repository.ts` 투표 정책 저장/조회에 staffVoteLimit 추가.
- 투표 설정 폼(투표 탭): 기존 `voteLimit` 입력 옆에 "자문위원·관리자 가능 투표수" 숫자 입력(name=`staffVoteLimit`, defaultValue 5), `program-actions.ts` 파싱에 `staffVoteLimit: Number(formData.get("staffVoteLimit"))` 추가.

- [ ] **Step 5: 검증 + 커밋**

Run: `node --env-file=.env ./node_modules/vitest/vitest.mjs run src/modules/project-voting src/modules/project-program` → PASS, `npx tsc --noEmit` 클린.

```bash
git add src/modules/ src/app/admin/ src/shared/i18n/
git commit -m "feat: 투표 한도 역할 분리(자문위원·관리자 staffVoteLimit, 기본 5표)"
```

---

### Task 10: 전체 검증·마무리

- [ ] **Step 1: 전체 테스트**

Run: `node --env-file=.env ./node_modules/vitest/vitest.mjs run`
Expected: 기존 baseline 실패(모듈 경계 2건·prisma 수집 등) 외 신규 실패 0.

- [ ] **Step 2: 라이브 스모크 (dev)**

`.next` 삭제 후 dev 재시작(마이그레이션 후 stale 클라이언트 방지). 시나리오:
1. admin → 프로그램 자문위원 탭 → 등록·링크 복사
2. 시크릿 창 → 링크 접속 → `/advisor` 목록
3. 상세 → 결과물·보고서 확인 → 채점 저장 → 피드백 작성
4. `/topics` 투표 5표 확인(4표째가 학생 한도 넘는지)
5. 팀 계정 → 평가 탭 피드백 노출, 점수 비노출
6. 자문위원으로 학생/관리자 URL 직접 접근 → 차단

- [ ] **Step 3: 커밋·푸시**

```bash
git push origin feat/external-advisor
```

PR 제목: `외부자문위원(초대 토큰·팀 할당·독립 채점·피드백·투표 5표)`
