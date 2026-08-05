import { describe, expect, it, vi } from "vitest";

import {
  ProjectAssistantCommandService,
  ProjectAssistantQueryService,
} from "@/modules/project-assistant/application/manage-project-assistants";
import type {
  ProjectAssistantReader,
  ProjectAssistantWriter,
} from "@/modules/project-assistant/application/project-assistant-ports";

function writer(result: Awaited<ReturnType<ProjectAssistantWriter["invite"]>> = "INVITED") {
  return {
    invite: vi.fn(async () => result),
    respond: vi.fn(async () => "ACCEPTED" as const),
    cancelInvitation: vi.fn(async () => true),
    remove: vi.fn(async () => true),
  } satisfies ProjectAssistantWriter;
}

function reader(hasSupervisedTopic: boolean) {
  return {
    hasSupervisedTopic: vi.fn(async () => hasSupervisedTopic),
    findManagement: vi.fn(async () => null),
    listPendingInvitations: vi.fn(async () => []),
  } satisfies ProjectAssistantReader;
}

describe("프로젝트 조교 관리", () => {
  it.each(["PROFESSOR", "ADMIN"] as const)(
    "%s 계정은 프로젝트 배정 여부와 무관하게 교수 워크스페이스에 접근한다",
    async (role) => {
      const repository = reader(false);

      await expect(
        new ProjectAssistantQueryService(repository)
          .canAccessProfessorWorkspace({ id: `${role.toLowerCase()}-1`, role }),
      ).resolves.toBe(true);
      expect(repository.hasSupervisedTopic).not.toHaveBeenCalled();
    },
  );

  it("수락한 프로젝트 조교 관계가 있는 학생만 교수 워크스페이스에 접근한다", async () => {
    const assignedRepository = reader(true);
    const unassignedRepository = reader(false);
    const actor = { id: "student-1", role: "STUDENT" } as const;

    await expect(
      new ProjectAssistantQueryService(assignedRepository)
        .canAccessProfessorWorkspace(actor),
    ).resolves.toBe(true);
    await expect(
      new ProjectAssistantQueryService(unassignedRepository)
        .canAccessProfessorWorkspace(actor),
    ).resolves.toBe(false);
  });

  it.each(["STUDENT", "PROFESSOR", "ADMIN"] as const)(
    "%s 계정도 프로젝트 감독 관계가 있으면 다른 사용자를 초대할 수 있다",
    async (role) => {
      const repository = writer();
      const invitedAt = new Date("2026-07-27T09:00:00Z");
      const service = new ProjectAssistantCommandService(
        repository,
        () => invitedAt,
      );

      await service.invite(
        {
          id: "supervisor-1",
          role,
          name: "감독자",
          email: "supervisor@example.com",
          image: null,
        },
        { topicId: "topic-1", email: " Assistant@Example.com " },
      );

      expect(repository.invite).toHaveBeenCalledWith({
        topicId: "topic-1",
        actor: expect.objectContaining({ id: "supervisor-1", role }),
        email: "assistant@example.com",
        invitedAt,
      });
    },
  );

  it("계정의 전역 역할과 무관하게 받은 초대를 수락한다", async () => {
    const repository = writer();
    const respondedAt = new Date("2026-07-27T10:00:00Z");
    await new ProjectAssistantCommandService(
      repository,
      () => respondedAt,
    ).respond(
      { id: "student-1", role: "STUDENT" },
      "invitation-1",
      "ACCEPT",
    );

    expect(repository.respond).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      actor: { id: "student-1", role: "STUDENT" },
      decision: "ACCEPT",
      respondedAt,
    });
  });

  it("중복 조교 초대를 명시적인 오류로 변환한다", async () => {
    const repository = writer("ALREADY_ASSISTANT");
    const service = new ProjectAssistantCommandService(repository);

    await expect(service.invite(
      {
        id: "professor-1",
        role: "PROFESSOR",
        name: "교수",
        email: "professor@example.com",
        image: null,
      },
      { topicId: "topic-1", email: "assistant@example.com" },
    )).rejects.toEqual(
      expect.objectContaining({
        message: "이미 이 프로젝트의 조교입니다.",
      }),
    );
  });
});
