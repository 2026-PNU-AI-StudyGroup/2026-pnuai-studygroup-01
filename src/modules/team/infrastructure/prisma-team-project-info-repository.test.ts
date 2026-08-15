import { describe, expect, it, vi } from "vitest";

import { PrismaTeamProjectInfoRepository } from "@/modules/team/infrastructure/prisma-team-project-info-repository";

vi.mock("@/modules/translation/application/translation-queue", () => ({
  enqueueTranslations: vi.fn(async () => undefined),
}));

const leader = { id: "student-1", role: "STUDENT" as const };

function row(role: "LEADER" | "MEMBER", ended = false) {
  return {
    id: "team-1",
    name: "기존 프로젝트",
    confirmedAt: new Date("2026-03-01T00:00:00Z"),
    project: {
      id: "topic-1",
      title: "기존 프로젝트",
      description: "기존 설명",
      status: "ACTIVE" as const,
      managerId: "professor-1",
      program: { name: "캡스톤디자인", endsAt: ended ? new Date("2020-01-01T00:00:00Z") : new Date("2030-01-01T00:00:00Z") },
      assistants: [],
    },
    memberships: [{
      userId: "student-1",
      role,
    }],
  };
}

function client(teamRow: ReturnType<typeof row>) {
  const findFirst = vi.fn(async () => teamRow);
  const updateTeam = vi.fn(async () => ({ id: "team-1" }));
  const updateTopic = vi.fn(async () => ({ id: "topic-1" }));
  const queryRaw = vi.fn()
    .mockResolvedValueOnce([{ id: "team-1" }])
    .mockResolvedValueOnce([{ id: "member-1" }]);
  const transaction = vi.fn(async (operation: (transaction: unknown) => unknown) => operation({
    $queryRaw: queryRaw,
    projectTeam: { findFirst, update: updateTeam },
    topic: { update: updateTopic },
  }));
  return {
    value: { projectTeam: { findFirst }, $transaction: transaction } as never,
    findFirst,
    updateTeam,
    updateTopic,
    queryRaw,
  };
}

describe("PrismaTeamProjectInfoRepository", () => {
  it("팀장은 진행 중 프로젝트의 제목과 설명을 수정한다", async () => {
    const db = client(row("LEADER"));

    await expect(new PrismaTeamProjectInfoRepository(db.value).update("team-1", leader, {
      title: "새 프로젝트",
      description: "새 설명",
    })).resolves.toBe("UPDATED");

    expect(db.updateTeam).not.toHaveBeenCalled();
    expect(db.updateTopic).toHaveBeenCalledWith({
      where: { id: "topic-1" },
      data: { title: "새 프로젝트", description: "새 설명" },
    });
    expect(db.queryRaw).toHaveBeenCalledTimes(2);
    expect((db.queryRaw.mock.calls[0][0] as { strings: readonly string[] }).strings.join("?"))
      .toContain('FOR UPDATE OF "project_team", "topic"');
    expect((db.queryRaw.mock.calls[1][0] as { strings: readonly string[] }).strings.join("?"))
      .toContain('FROM "project_team_membership"');
  });

  it("일반 팀원의 저장 요청을 저장소 경계에서 거부한다", async () => {
    const db = client(row("MEMBER"));

    await expect(new PrismaTeamProjectInfoRepository(db.value).update("team-1", leader, {
      title: "새 프로젝트",
      description: "새 설명",
    })).resolves.toBe("FORBIDDEN");

    expect(db.updateTeam).not.toHaveBeenCalled();
    expect(db.updateTopic).not.toHaveBeenCalled();
  });

  it("종료된 프로젝트는 팀장도 수정할 수 없다", async () => {
    const db = client(row("LEADER", true));

    await expect(new PrismaTeamProjectInfoRepository(db.value).update("team-1", leader, {
      title: "새 프로젝트",
      description: "새 설명",
    })).resolves.toBe("NOT_IN_PROGRESS");

    expect(db.updateTeam).not.toHaveBeenCalled();
    expect(db.updateTopic).not.toHaveBeenCalled();
  });
});
