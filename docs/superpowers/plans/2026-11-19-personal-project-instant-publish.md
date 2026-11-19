# 개인 프로젝트 바로 올리기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로그램 옵션 "개인 프로젝트 바로 올리기"를 켜면, 학생이 한 화면(프로젝트명, 설명, GitHub)에서 저장하는 즉시 프로젝트가 공개되고 1인 팀이 확정된다.

**Architecture:** `project_program` 에 불리언 칸 하나를 더한다. 학생 저장은 학생 팀과 승인 요청을 거치지 않는 새 경로(`PrismaPersonalProjectPublisher`)가 한 트랜잭션에서 프로젝트(ACTIVE), 확정된 1인 팀, GitHub 결과물을 만든다. 저장 뒤 같은 기능 브랜치의 `importGithubThumbnail` 로 대표 이미지를 채운다.

**Tech Stack:** Next.js 16 서버 액션, Prisma 7(PostgreSQL), vitest.

**설계 근거:** `docs/superpowers/specs/2026-11-18-github-readme-showcase-design.md` 의 "학생 흐름 1" 과 사용자 결정(2026-11-19).
- 담당자(`topic.managerId`): 프로그램 담당자(`program_manager`) 중 활성 계정 첫 사람(`createdAt` 순). 없으면 프로그램을 만든 관리자(`createdById`). 둘 다 없으면 null(DB 가 허용).
- 학생 1명당 이 프로그램에서 프로젝트 1개. 이미 이 프로그램의 프로젝트 팀(확정 전 포함)에 있으면 막는다.
- 옵션은 "학생이 등록" 방식(`studentProjectCreationEnabled`)일 때만 켤 수 있다. DB CHECK 로도 묶는다.

**알려진 제약 (운영 설정으로 해결):** 결과물 등록과 대표 이미지 저장은 프로그램 **진행 기간(executionStartsAt~EndsAt)** 안에서만 된다(기존 `authorizeTeam`). 수업 프로그램은 등록 기간과 진행 기간이 겹치게 설정해야 저장 직후 썸네일이 채워진다.

**작업 위치:** 워크트리 `.claude/worktrees/docs+agentic-readme`, 브랜치 `docs/agentic-github-readme`(GitHub README 작업과 같은 PR). 시험은 `node --env-file=.env node_modules/vitest/vitest.mjs run <파일>`.

---

## 파일 구조

| 파일 | 할 일 |
| --- | --- |
| Create `prisma/migrations/20261119000000_program_instant_publish/migration.sql` | 칸과 CHECK |
| Modify `prisma/schema.prisma` | `ProjectProgram.studentProjectInstantPublish` |
| Modify `src/modules/project-program/infrastructure/prisma-project-program-repository.ts` | 켜고 끄기, 방식 바꿀 때 함께 끄기, 조회 select |
| Modify `src/modules/project-program/application/manage-project-programs.ts` | 포트, 서비스 메서드, 타입 |
| Modify `src/app/topics/_management/program-actions.ts` | 관리자 액션 |
| Modify `src/app/topics/_management/program-management-forms.tsx` | 운영 설정 패널의 켜고 끄기 |
| Create `src/modules/topic/application/publish-personal-project.ts` (+ test) | 입력 검증, 결과 문구 |
| Create `src/modules/topic/infrastructure/prisma-personal-project-publisher.ts` | 한 트랜잭션 저장 |
| Create `src/app/_actions/publish-personal-project-action.ts` | 학생 서버 액션 |
| Create `src/modules/topic/ui/personal-project-form.tsx` | 한 화면 폼 |
| Modify `src/app/topics/_components/project-registration-modal.tsx` | 옵션이 켜진 프로그램이면 한 화면 폼 |
| Modify `src/shared/i18n/ui-messages.en.json` | 새 문구 영어(끝에 덧붙임) |

---

### Task 1: 칸과 제약

**Files:** migration, `prisma/schema.prisma`, `prisma-project-program-repository.ts`, `manage-project-programs.ts`

- [ ] **Step 1: 마이그레이션**

`prisma/migrations/20261119000000_program_instant_publish/migration.sql`:

```sql
ALTER TABLE "project_program"
  ADD COLUMN "studentProjectInstantPublish" BOOLEAN NOT NULL DEFAULT false;

-- 바로 올리기는 학생이 등록하는 방식에서만 뜻이 있다.
ALTER TABLE "project_program"
  ADD CONSTRAINT "project_program_instant_publish_requires_student_registration"
  CHECK (NOT "studentProjectInstantPublish" OR "studentProjectCreationEnabled");
```

`prisma/schema.prisma` 의 `ProjectProgram` 에서 `studentProjectCreationEnabled` 아래에:

```prisma
  // 켜면 학생이 만든 프로젝트를 승인 없이 바로 공개하고 1인 팀으로 확정한다(수업 개인 과제).
  studentProjectInstantPublish  Boolean                   @default(false)
```

Run: `npx prisma migrate deploy` 그리고 `npm run db:generate`
Expected: 마이그레이션 1개 적용, 클라이언트 생성

- [ ] **Step 2: 방식을 바꿀 때 함께 끈다**

CHECK 를 어기지 않도록, 학생 등록 방식을 끄는 두 곳에서 이 칸도 false 로 만든다.

`prisma-project-program-repository.ts` 의 `changeStudentProjectPolicy` 안 `transaction.projectProgram.update` 의 `data` 에 추가:

```ts
          ...(input.enabled ? {} : { studentProjectInstantPublish: false }),
```

같은 파일 `updateSchedule` 에서 `transitionToDirect` 로 `studentProjectCreationEnabled: false` 를 쓰는 update 의 `data` 에도 추가:

```ts
          ...(transitionToDirect ? { studentProjectInstantPublish: false } : {}),
```

(`updateSchedule` 안에 `studentProjectCreationEnabled` 를 쓰는 곳이 여러 군데면, 실제로 DB 에 쓰는 update 에만 넣는다.)

- [ ] **Step 3: 켜고 끄는 저장소 메서드**

같은 파일, `changeStudentProjectPolicy` 아래:

```ts
  async setStudentProjectInstantPublish(id: string, enabled: boolean): Promise<"UPDATED" | "NOT_STUDENT_REGISTRATION" | "NOT_FOUND"> {
    const program = await this.client.projectProgram.findUnique({ where: { id }, select: { studentProjectCreationEnabled: true } });
    if (!program) return "NOT_FOUND";
    if (enabled && !program.studentProjectCreationEnabled) return "NOT_STUDENT_REGISTRATION";
    await this.client.projectProgram.update({ where: { id }, data: { studentProjectInstantPublish: enabled } });
    return "UPDATED";
  }
```

`manage-project-programs.ts` 의 저장소 포트(인터페이스, `changeStudentProjectPolicy` 선언 근처)에 같은 시그니처를 추가한다. 이 포트를 구현하는 시험용 가짜 저장소가 있으면 `vi.fn()` 이나 빈 구현을 더해 타입을 맞춘다.

- [ ] **Step 4: 화면까지 값이 가게 한다**

- `ProjectProgramRecord` 타입(`manage-project-programs.ts` 위쪽)에 `studentProjectInstantPublish?: boolean;` 을 더한다. `list()` 는 행 전체를 펼치므로 값은 이미 실려 온다.
- 같은 파일의 `findPublicActive`/`findOpen` 결과 타입과 저장소의 해당 `select` 에 `studentProjectInstantPublish: true` 를 더한다.
- 프로그램 상세(관리) 화면이 패널에 넘기는 프로그램 객체에 이 값이 있는지 확인한다(`src/app/topics/_management/program-management-workspace.tsx` 의 `ProgramOperationPanel` 호출).

- [ ] **Step 5: 서비스 메서드**

`manage-project-programs.ts`, `updateAdvisorEnabled` 아래:

```ts
  async updateInstantPublish(actor: CurrentActor, id: string, enabled: boolean) {
    assertProgramAdmin(actor);
    const outcome = await this.repository.setStudentProjectInstantPublish(id, enabled);
    if (outcome === "UPDATED") return;
    throw new ProjectProgramOperationError(
      outcome === "NOT_STUDENT_REGISTRATION"
        ? "학생이 등록하는 방식의 프로그램에서만 켤 수 있습니다."
        : "설정할 프로그램이 없습니다.",
    );
  }
```

- [ ] **Step 6: 확인과 커밋**

Run: `npx tsc --noEmit` 그리고 `node --env-file=.env node_modules/vitest/vitest.mjs run src/modules/project-program`
Expected: 통과

```bash
git add prisma src/modules/project-program
git commit -m "feat: 프로그램에 개인 프로젝트 바로 올리기 칸을 둔다"
```

---

### Task 2: 관리자 켜고 끄기

**Files:** `src/app/topics/_management/program-actions.ts`, `src/app/topics/_management/program-management-forms.tsx`, `src/shared/i18n/ui-messages.en.json`

- [ ] **Step 1: 액션**

`program-actions.ts` 에서 `updateProgramOperationAction` 이 쓰는 모양(상태 타입, `service()`, 오류 처리, `revalidatePath`)을 그대로 따라 추가한다:

```ts
export async function updateProgramInstantPublishAction(_state: ProgramActionState, formData: FormData): Promise<ProgramActionState> {
  // 액터 확인, 오류 처리, revalidate 는 updateProgramOperationAction 과 같게
  const parsed = z.object({ programId: z.string().uuid(), instantPublish: z.enum(["true", "false"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "설정 값을 확인해 주세요." };
  await service().updateInstantPublish(actor, parsed.data.programId, parsed.data.instantPublish === "true");
  return { status: "success", message: parsed.data.instantPublish === "true" ? "개인 프로젝트 바로 올리기를 켰습니다." : "개인 프로젝트 바로 올리기를 껐습니다." };
}
```

(`ProgramActionState` 는 이 파일이 실제로 쓰는 상태 타입 이름으로 바꾼다. "use server" 파일이라 async 함수만 export 한다.)

- [ ] **Step 2: 패널**

`ProgramOperationPanel` 의 props 타입에 `studentProjectInstantPublish?: boolean` 을 더한다. 저장된 값 `program.studentProjectCreationEnabled` 가 true 일 때만, 기존 `<form>` **밖**(그 아래)에 별도 폼을 둔다:

```tsx
    {program.studentProjectCreationEnabled ? <InstantPublishForm programId={program.id} enabled={program.studentProjectInstantPublish ?? false} /> : null}
```

같은 파일에 컴포넌트를 추가한다. 스타일은 같은 파일의 `fieldset`/`ChoiceCard`/`ActionBar` 를 그대로 쓴다:

```tsx
function InstantPublishForm({ programId, enabled }: { programId: string; enabled: boolean }) {
  const [value, setValue] = useState(enabled);
  const [state, action, pending] = useActionState(updateProgramInstantPublishAction, initialProgramActionState);
  return <form action={action} aria-busy={pending} className={styles.form}>
    <input type="hidden" name="programId" value={programId} />
    <fieldset className={formStyles.radioGroup}>
      <legend><UiText>{"개인 프로젝트 바로 올리기"}</UiText></legend>
      <ChoiceCard variant="inline" name="instantPublish" value="false" checked={!value} onChange={() => setValue(false)} required label="승인 후 공개 (팀 프로젝트)" />
      <ChoiceCard variant="inline" name="instantPublish" value="true" checked={value} onChange={() => setValue(true)} required label="바로 공개 (1인 개인 프로젝트, 수업용)" />
    </fieldset>
    <p className="text-sm text-[var(--muted)]"><UiText>{"바로 공개를 고르면 학생이 저장하는 즉시 프로젝트가 공개되고 학생 혼자인 팀이 확정됩니다. 학생 1명당 프로젝트 1개입니다."}</UiText></p>
    <ActionBar state={state} pending={pending} label="바로 올리기 설정 저장" />
  </form>;
}
```

- [ ] **Step 3: 영어 문구와 확인**

`tests/architecture/ui-localization.test.ts` 가 요구하는 새 한국어 문구의 영어를 `ui-messages.en.json` 끝에 덧붙인다(중복 키 금지).

Run: `npx tsc --noEmit`, `npx eslint src/app/topics/_management`, `node --env-file=.env node_modules/vitest/vitest.mjs run tests/architecture src/app/topics`
Expected: 통과

```bash
git add src/app/topics/_management src/shared/i18n/ui-messages.en.json
git commit -m "feat: 운영 설정에서 개인 프로젝트 바로 올리기를 켜고 끈다"
```

---

### Task 3: 바로 올리기 저장

**Files:**
- Create: `src/modules/topic/application/publish-personal-project.ts`
- Test: `src/modules/topic/application/publish-personal-project.test.ts`
- Create: `src/modules/topic/infrastructure/prisma-personal-project-publisher.ts`

- [ ] **Step 1: 실패하는 시험**

```ts
import { describe, expect, it, vi } from "vitest";

import { PersonalProjectError, publishPersonalProject, type PersonalProjectPublisher } from "@/modules/topic/application/publish-personal-project";

const student = { id: "student-1", role: "STUDENT" as const };
const programId = "11111111-1111-4111-8111-111111111111";
const now = new Date("2026-11-20T00:00:00Z");

function publisher(outcome: Awaited<ReturnType<PersonalProjectPublisher["publish"]>>) {
  return { publish: vi.fn(async () => outcome) } satisfies PersonalProjectPublisher;
}

describe("publishPersonalProject", () => {
  it("다듬은 값과 정리한 GitHub 주소로 저장한다", async () => {
    const fake = publisher({ status: "PUBLISHED", projectId: "p", teamId: "t" });
    await expect(publishPersonalProject(student, { programId, title: "  일정 비서 ", description: " 메일로 일정을 잡는다 ", repoUrl: "https://github.com/Alice/Agent/tree/main" }, fake, now))
      .resolves.toEqual({ status: "PUBLISHED", projectId: "p", teamId: "t", repoUrl: "https://github.com/alice/agent" });
    expect(fake.publish).toHaveBeenCalledWith({ programId, studentId: "student-1", title: "일정 비서", description: "메일로 일정을 잡는다", divisionId: null, repoUrl: "https://github.com/alice/agent", now });
  });

  it("GitHub 칸이 비어 있으면 링크 없이 저장한다", async () => {
    const fake = publisher({ status: "PUBLISHED", projectId: "p", teamId: "t" });
    await publishPersonalProject(student, { programId, title: "a", description: "b", repoUrl: "  " }, fake, now);
    expect(fake.publish).toHaveBeenCalledWith(expect.objectContaining({ repoUrl: null }));
  });

  it("학생이 아니거나 값이 잘못되면 저장하지 않는다", async () => {
    const fake = publisher({ status: "PUBLISHED", projectId: "p", teamId: "t" });
    await expect(publishPersonalProject({ id: "x", role: "PROFESSOR" }, { programId, title: "a", description: "b" }, fake, now)).rejects.toBeInstanceOf(PersonalProjectError);
    await expect(publishPersonalProject(student, { programId, title: " ", description: "b" }, fake, now)).rejects.toThrow("프로젝트명");
    await expect(publishPersonalProject(student, { programId, title: "a", description: " " }, fake, now)).rejects.toThrow("설명");
    await expect(publishPersonalProject(student, { programId, title: "a", description: "b", repoUrl: "https://gitlab.com/a/b" }, fake, now)).rejects.toThrow("GitHub");
    expect(fake.publish).not.toHaveBeenCalled();
  });

  it("저장소 결과를 안내 문구로 바꾼다", async () => {
    await expect(publishPersonalProject(student, { programId, title: "a", description: "b" }, publisher({ status: "ALREADY_IN_PROGRAM" }), now)).rejects.toThrow("이미 이 프로그램");
    await expect(publishPersonalProject(student, { programId, title: "a", description: "b" }, publisher({ status: "UNAVAILABLE" }), now)).rejects.toThrow("등록 기간");
    await expect(publishPersonalProject(student, { programId, title: "a", description: "b" }, publisher({ status: "INVALID_DIVISION" }), now)).rejects.toThrow("분과");
  });
});
```

Run: `node --env-file=.env node_modules/vitest/vitest.mjs run src/modules/topic/application/publish-personal-project.test.ts`
Expected: FAIL, 모듈 없음

- [ ] **Step 2: 서비스**

`CurrentActor` 의 실제 모양(`src/modules/identity/domain/current-actor.ts`)에 맞춘다. `role` 이 `UserRole` 이면 시험의 `"PROFESSOR"` 그대로 쓸 수 있다.

```ts
import { parseGithubRepo } from "@/modules/github-readme/domain/readme";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export class PersonalProjectError extends Error {}

export type PublishPersonalProjectOutcome =
  | { status: "PUBLISHED"; projectId: string; teamId: string }
  | { status: "UNAVAILABLE" | "ALREADY_IN_PROGRAM" | "INVALID_DIVISION" };

export interface PersonalProjectPublisher {
  publish(input: {
    programId: string;
    studentId: string;
    title: string;
    description: string;
    divisionId: string | null;
    repoUrl: string | null;
    now: Date;
  }): Promise<PublishPersonalProjectOutcome>;
}

const FAILURE_MESSAGES = {
  UNAVAILABLE: "지금은 이 프로그램에 프로젝트를 올릴 수 없습니다. 등록 기간과 프로그램 설정을 확인해 주세요.",
  ALREADY_IN_PROGRAM: "이미 이 프로그램에 프로젝트가 있습니다. 학생 1명당 프로젝트 1개만 올릴 수 있습니다.",
  INVALID_DIVISION: "분과를 다시 선택해 주세요.",
} as const;

/** 수업 개인 과제처럼 승인 없이 바로 공개하는 1인 프로젝트를 올린다. */
export async function publishPersonalProject(
  actor: CurrentActor,
  input: { programId: string; title: string; description: string; divisionId?: string; repoUrl?: string },
  publisher: PersonalProjectPublisher,
  now = new Date(),
): Promise<{ status: "PUBLISHED"; projectId: string; teamId: string; repoUrl: string | null }> {
  if (actor.role !== "STUDENT") throw new PersonalProjectError("학생만 개인 프로젝트를 올릴 수 있습니다.");
  const title = input.title.trim();
  const description = input.description.trim();
  if (!title || title.length > 200) throw new PersonalProjectError("프로젝트명은 1자 이상 200자 이하로 입력해 주세요.");
  if (!description || description.length > 10_000) throw new PersonalProjectError("설명을 입력해 주세요.");
  const rawRepoUrl = input.repoUrl?.trim() ?? "";
  const repo = rawRepoUrl ? parseGithubRepo(rawRepoUrl) : null;
  if (rawRepoUrl && !repo) throw new PersonalProjectError("GitHub 레포 주소를 확인해 주세요. 예: https://github.com/아이디/레포");
  const repoUrl = repo ? `https://github.com/${repo.owner}/${repo.repo}` : null;

  const outcome = await publisher.publish({
    programId: input.programId,
    studentId: actor.id,
    title,
    description,
    divisionId: input.divisionId || null,
    repoUrl,
    now,
  });
  if (outcome.status === "PUBLISHED") return { ...outcome, repoUrl };
  throw new PersonalProjectError(FAILURE_MESSAGES[outcome.status]);
}
```

Run: 같은 시험. Expected: PASS

- [ ] **Step 3: 저장소**

기존 승인 경로(`src/modules/topic-approval/infrastructure/prisma-topic-approval-repository.ts` 의 `create()` 와 `decide()` 승인 분기)를 참고한다. 아래 Prisma 이름(`programDivision`, `programManager`, `projectTeamMembership`, `artifact`)과 `enqueueTranslations` 시그니처는 실제 코드로 확인하고 맞춘다.

```ts
import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { activeProjectTeamMembershipInProgram } from "@/modules/project-team/domain/project-team-membership-scope";
import { assignProgramDeliverablesToTeam } from "@/modules/report/infrastructure/program-deliverable-assignment";
import type { PersonalProjectPublisher, PublishPersonalProjectOutcome } from "@/modules/topic/application/publish-personal-project";
import { enqueueTranslations } from "@/modules/translation/application/translation-queue";

type LockedProgram = {
  isPublic: boolean;
  endsAt: Date;
  projectRegistrationStartsAt: Date;
  projectRegistrationEndsAt: Date;
  studentProjectCreationEnabled: boolean;
  studentProjectInstantPublish: boolean;
  createdById: string | null;
};

/**
 * 승인 요청과 학생 팀을 거치지 않고 프로젝트를 공개하고 1인 팀을 확정한다.
 * 프로그램 행을 잠가 같은 학생이 두 번 눌러도 프로젝트가 하나만 생긴다.
 * 지원서 행은 만들지 않는다. 팀원 행의 sourceApplicationId 는 선택 칸이다.
 */
export class PrismaPersonalProjectPublisher implements PersonalProjectPublisher {
  constructor(private readonly client: PrismaClient) {}

  publish(input: Parameters<PersonalProjectPublisher["publish"]>[0]): Promise<PublishPersonalProjectOutcome> {
    return this.client.$transaction(async (transaction) => {
      const program = (await transaction.$queryRaw<LockedProgram[]>(Prisma.sql`
        SELECT "isPublic", "endsAt", "projectRegistrationStartsAt", "projectRegistrationEndsAt",
               "studentProjectCreationEnabled", "studentProjectInstantPublish", "createdById"
        FROM "project_program"
        WHERE "id" = ${input.programId}
        FOR UPDATE
      `))[0];
      if (
        !program ||
        !program.isPublic ||
        program.endsAt <= input.now ||
        program.projectRegistrationStartsAt > input.now ||
        program.projectRegistrationEndsAt <= input.now ||
        !program.studentProjectCreationEnabled ||
        !program.studentProjectInstantPublish
      ) return { status: "UNAVAILABLE" };

      const student = await transaction.user.findFirst({
        where: { id: input.studentId, role: "STUDENT", accountStatus: "ACTIVE" },
        select: { id: true },
      });
      if (!student) return { status: "UNAVAILABLE" };

      const divisions = await transaction.programDivision.findMany({ where: { programId: input.programId }, select: { id: true } });
      if (
        (divisions.length > 0 && !input.divisionId) ||
        (input.divisionId && !divisions.some(({ id }) => id === input.divisionId))
      ) return { status: "INVALID_DIVISION" };

      const existing = await transaction.projectTeamMembership.findFirst({
        where: { userId: input.studentId, ...activeProjectTeamMembershipInProgram(input.programId) },
        select: { id: true },
      });
      if (existing) return { status: "ALREADY_IN_PROGRAM" };

      // 담당자: 프로그램 담당자 중 활성 계정 첫 사람, 없으면 프로그램을 만든 관리자.
      const manager = await transaction.programManager.findFirst({
        where: { programId: input.programId, user: { accountStatus: "ACTIVE" } },
        orderBy: { createdAt: "asc" },
        select: { userId: true },
      });

      const projectId = randomUUID();
      const teamId = randomUUID();
      await transaction.topic.create({
        data: {
          id: projectId,
          programId: input.programId,
          divisionId: input.divisionId,
          authorId: input.studentId,
          managerId: manager?.userId ?? program.createdById,
          title: input.title,
          description: input.description,
          requiredSkills: [],
          preferredSkills: [],
          roleExpectations: "",
          availabilityRequirement: "",
          applicationMode: "TEAM_ONLY",
          recruitmentEnabled: false,
          capacity: 1,
          status: "ACTIVE",
          publishedAt: input.now,
          createdAt: input.now,
          updatedAt: input.now,
          projectTeam: {
            create: {
              id: teamId,
              name: input.title.slice(0, 100),
              confirmedAt: input.now,
              createdAt: input.now,
              updatedAt: input.now,
              memberships: { create: { userId: input.studentId, role: "LEADER", joinedAt: input.now } },
            },
          },
        },
      });
      if (input.repoUrl) {
        await transaction.artifact.create({
          data: {
            projectTeamId: teamId,
            registeredById: input.studentId,
            type: "SOURCE_CODE",
            title: "GitHub",
            externalUrl: input.repoUrl,
            createdAt: input.now,
          },
        });
      }
      // 프로젝트가 ACTIVE 가 된 뒤에 불러야 한다. 프로그램 행 잠금은 위에서 잡았다.
      await assignProgramDeliverablesToTeam(transaction, teamId, input.now);
      await enqueueTranslations(transaction, [input.title, input.description]);
      return { status: "PUBLISHED", projectId, teamId };
    });
  }
}
```

- [ ] **Step 4: 확인과 커밋**

Run: `npx tsc --noEmit`, `npx eslint src/modules/topic`, `node --env-file=.env node_modules/vitest/vitest.mjs run src/modules/topic tests/architecture`
Expected: 통과. 경계 시험이 application 의 github-readme domain 참조를 막으면(막지 않을 것으로 본다) 보고한다.

```bash
git add src/modules/topic
git commit -m "feat: 승인 없이 1인 프로젝트를 바로 공개하는 저장 경로"
```

---

### Task 4: 학생 화면

**Files:**
- Create: `src/app/_actions/publish-personal-project-action.ts`
- Create: `src/modules/topic/ui/personal-project-form.tsx`
- Modify: `src/app/topics/_components/project-registration-modal.tsx`
- Modify: `src/shared/i18n/ui-messages.en.json`

- [ ] **Step 1: 서버 액션**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { importGithubThumbnail } from "@/modules/github-readme/infrastructure/github-thumbnail-import";
import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";
import { PersonalProjectError, publishPersonalProject } from "@/modules/topic/application/publish-personal-project";
import { PrismaPersonalProjectPublisher } from "@/modules/topic/infrastructure/prisma-personal-project-publisher";
import type { PersonalProjectActionState } from "@/modules/topic/ui/personal-project-form";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function publishPersonalProjectAction(
  _state: PersonalProjectActionState,
  formData: FormData,
): Promise<PersonalProjectActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = z.object({
    programId: z.string().uuid(),
    title: z.string().max(400),
    description: z.string().max(20_000),
    divisionId: z.string().uuid().optional(),
    repoUrl: z.string().max(2048).optional(),
  }).safeParse({
    programId: formData.get("programId"),
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    divisionId: formData.get("divisionId") || undefined,
    repoUrl: formData.get("repoUrl") || undefined,
  });
  if (!parsed.success) return { status: "error", message: "입력 내용을 확인해 주세요." };
  try {
    const result = await publishPersonalProject(actor, parsed.data, new PrismaPersonalProjectPublisher(prisma));
    // 공개는 끝났다. 대표 이미지는 채우지 못해도 결과는 성공이다.
    if (result.repoUrl) {
      await importGithubThumbnail(actor, { teamId: result.teamId, repoUrl: result.repoUrl, replace: false }).catch(() => null);
    }
    revalidatePath("/topics");
    revalidatePath("/dashboard");
    revalidatePath("/projects", "layout");
    return { status: "success", message: "프로젝트를 공개했습니다.", projectId: result.projectId };
  } catch (error) {
    if (error instanceof PersonalProjectError) return { status: "error", message: error.message };
    throw error;
  }
}
```

- [ ] **Step 2: 한 화면 폼**

`src/modules/topic/ui/personal-project-form.tsx`. `topic-form.tsx` 의 `StudentProjectRegistrationWizard` 에 이번 브랜치에서 넣은 GitHub 칸과 `loadReadme`(함수형 setState 로 이미 쓴 값 보존)를 같은 방식으로 쓰되, GitHub 칸에는 `name="repoUrl"` 을 붙여 함께 저장한다. 입력 컴포넌트(`FormField`, `TextInput`, `Textarea`, `CustomSelect`)와 버튼 클래스는 `topic-form.tsx` 에서 쓰는 것을 그대로 가져온다.

```tsx
"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

// FormField, TextInput, Textarea, CustomSelect, UiText 는 topic-form.tsx 와 같은 경로에서 가져온다.

export type PersonalProjectActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string; projectId: string };

type Preview = (repoUrl: string) => Promise<{ status: "success"; preview: { title: string; summary: string } } | { status: "error"; message: string }>;

export function PersonalProjectForm({ action, previewGithubReadme, program }: {
  action: (state: PersonalProjectActionState, formData: FormData) => Promise<PersonalProjectActionState>;
  previewGithubReadme: Preview;
  program: { id: string; name: string; divisions?: Array<{ id: string; name: string }> };
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" } as PersonalProjectActionState);
  const [repoUrl, setRepoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [readmeMessage, setReadmeMessage] = useState("");
  const [readmePending, startReadme] = useTransition();

  function loadReadme() {
    if (!repoUrl.trim()) return;
    setReadmeMessage("");
    startReadme(async () => {
      const result = await previewGithubReadme(repoUrl.trim());
      if (result.status === "error") {
        setReadmeMessage(result.message);
        return;
      }
      setTitle((current) => current.trim() ? current : result.preview.title);
      if (result.preview.summary) setDescription((current) => current.trim() ? current : result.preview.summary);
      setReadmeMessage("README 에서 제목과 설명을 가져왔습니다. 확인하고 고쳐 주세요.");
    });
  }

  if (state.status === "success") {
    return (
      <div className="grid gap-4">
        <p role="status" className="font-semibold"><UiText>{state.message}</UiText></p>
        <p className="text-sm text-[var(--muted)]"><UiText>{"결과물 화면에서 대표 이미지와 시연 영상을 확인하고 바꿀 수 있습니다."}</UiText></p>
        <Link className="button-primary w-fit" href={`/projects/${state.projectId}/artifacts`}><UiText>{"결과물 화면으로"}</UiText></Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="programId" value={program.id} />
      <p className="text-sm text-[var(--muted)]"><UiText>{"저장하면 바로 공개됩니다. 이 프로그램에는 프로젝트를 1개만 올릴 수 있습니다."}</UiText></p>
      {program.divisions?.length ? (
        <FormField id="personal-division" label="분과" required>
          <CustomSelect id="personal-division" name="divisionId" ariaLabel="분과" required value={divisionId} onValueChange={setDivisionId} placeholder="분과를 선택하세요" options={program.divisions.map((division) => ({ value: division.id, label: division.name }))} />
        </FormField>
      ) : null}
      <FormField id="personal-github" label="GitHub 레포" optional description="공개 레포 주소를 넣으면 README 로 제목과 설명을 채우고, README 첫 그림을 대표 이미지로 씁니다.">
        <div className="flex gap-2">
          <TextInput id="personal-github" name="repoUrl" type="url" inputMode="url" placeholder="https://github.com/아이디/레포" value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} />
          <button type="button" className="button-secondary shrink-0" onClick={loadReadme} disabled={readmePending || !repoUrl.trim()}>
            <UiText>{readmePending ? "가져오는 중" : "README 가져오기"}</UiText>
          </button>
        </div>
        {readmeMessage ? <p role="status" className="mt-2 text-sm text-[var(--muted)]"><UiText>{readmeMessage}</UiText></p> : null}
      </FormField>
      <FormField id="personal-title" label="프로젝트명" required>
        <TextInput id="personal-title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required />
      </FormField>
      <FormField id="personal-description" label="설명" required>
        <Textarea id="personal-description" name="description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={10_000} required rows={4} />
      </FormField>
      {state.status === "error" ? <p role="alert" className="text-sm text-[var(--danger)]"><UiText>{state.message}</UiText></p> : null}
      <div className="flex justify-end">
        <button type="submit" className="button-primary" disabled={pending}><UiText>{pending ? "올리는 중" : "프로젝트 올리기"}</UiText></button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: 모달에서 고르기**

`project-registration-modal.tsx`:
- `const instantProgram = programs.find(({ id }) => id === defaultProgramId && id) ?? (programs.length === 1 ? programs[0] : undefined);` 를 구하고 `instantProgram?.studentProjectInstantPublish` 이면 `TopicForm` 대신 `PersonalProjectForm` 을 그린다(`action={publishPersonalProjectAction}`, `previewGithubReadme={previewGithubReadmeAction}`, `program={instantProgram}`).
- 이때 단계 표시는 `["프로젝트 정보"]` 한 단계로 한다(`useState` 초깃값을 조건에 맞춰 준다).
- 닫기 확인(`formSnapshot`)은 그대로 둔다. 성공 뒤 닫을 때 `router.refresh()` 가 이미 있으면 그대로, 없으면 `closeHref` 로 이동하는 기존 흐름을 따른다.
- 모달 제목 "프로젝트 등록" 은 그대로 둔다.

`src/app/topics/page.tsx` 는 바꾸지 않는다(프로그램 목록이 행 전체를 실어 오므로 새 칸이 이미 있다). 확인만 한다.

- [ ] **Step 4: 영어 문구, 확인, 커밋**

`ui-localization` 시험이 요구하는 영어를 `ui-messages.en.json` 끝에 덧붙인다.

Run: `npx tsc --noEmit`, `npm run lint`, `node --env-file=.env node_modules/vitest/vitest.mjs run tests/architecture src/modules/topic src/app/topics`
Expected: 통과

```bash
git add src/app/_actions/publish-personal-project-action.ts src/modules/topic/ui/personal-project-form.tsx src/app/topics/_components/project-registration-modal.tsx src/shared/i18n/ui-messages.en.json
git commit -m "feat: 학생이 한 화면에서 개인 프로젝트를 바로 올린다"
```

---

### Task 5: 로컬 확인

- [ ] 전체 검사: `npx tsc --noEmit`, `npm run lint`, `node --env-file=.env node_modules/vitest/vitest.mjs run`
- [ ] 개발 서버에서 관리자(목 ADMIN)로 학생 등록 방식 프로그램의 운영 설정에서 "바로 공개" 를 켠다. 등록 기간과 진행 기간이 지금을 포함하게 로컬 DB 를 맞춘다(확인 뒤 되돌림).
- [ ] 학생(목 STUDENT)으로 "프로젝트 등록" 을 열면 한 화면 폼이 나온다. GitHub 링크, README 가져오기, 저장. 바로 공개되고, 결과물 화면에 GitHub 링크와 대표 이미지가 있다. `topic.managerId` 가 프로그램 담당자(없으면 만든 관리자)다.
- [ ] 같은 학생이 다시 올리면 "이미 이 프로그램에 프로젝트가 있습니다" 가 뜬다.
- [ ] 학생 등록 방식을 끄면(직접 지원 방식으로 바꾸기) 바로 올리기도 꺼진다.
