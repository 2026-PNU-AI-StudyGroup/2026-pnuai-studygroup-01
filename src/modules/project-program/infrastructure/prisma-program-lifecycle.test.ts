import type { PrismaClient } from "@/generated/prisma/client";
import { describe, expect, it, vi } from "vitest";

import { finalizeProgram } from "@/modules/project-program/infrastructure/prisma-program-lifecycle";

const endsAt = new Date("2026-12-20T15:00:00.000Z");

function clientWith(transaction: Record<string, unknown>) {
  return {
    $transaction: vi.fn(async (callback: (value: typeof transaction) => unknown) => callback(transaction)),
  } as unknown as PrismaClient;
}

describe("프로그램 종료 후처리", () => {
  it("프로젝트 상태는 바꾸지 않고 대기 업무만 한 번 정리한다", async () => {
    const updateProgram = vi.fn(async () => ({ id: "program-1" }));
    const createAudit = vi.fn(async () => ({ id: "audit-1" }));
    const transaction = {
      $queryRaw: vi.fn(async () => [{ id: "program-1", endsAt, endProcessedAt: null }]),
      topic: {
        findMany: vi.fn(async () => [
          { id: "project-1", projectTeam: { confirmedAt: new Date("2026-03-01T00:00:00Z") } },
          { id: "project-2", projectTeam: null },
        ]),
      },
      topicApplication: {
        findMany: vi.fn(async () => [{ id: "application-1", studentId: "student-1", topic: { title: "프로젝트" } }]),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      topicApprovalRequest: {
        findMany: vi.fn(async () => [{
          id: "approval-1",
          topicId: "project-2",
          requesterId: "student-2",
          topic: { title: "제안 프로젝트" },
        }]),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      recruitmentPost: { updateMany: vi.fn(async () => ({ count: 1 })) },
      recruitmentApplication: { updateMany: vi.fn(async () => ({ count: 1 })) },
      projectGuidanceRequest: {
        findMany: vi.fn(async () => [{
          id: "guidance-1",
          requesterId: "student-3",
          projectTeam: { projectId: "project-1", name: "프로젝트 팀" },
        }]),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      projectProgram: { update: updateProgram },
      notification: { createMany: vi.fn(async () => ({ count: 1 })) },
      auditLog: { create: createAudit },
    };

    await expect(finalizeProgram(clientWith(transaction), {
      programId: "program-1",
      actor: { kind: "SYSTEM" },
      processedAt: endsAt,
    })).resolves.toBe(true);

    expect(updateProgram).toHaveBeenCalledWith({
      where: { id: "program-1" },
      data: { endsAt, endProcessedAt: endsAt },
    });
    expect(createAudit).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorKind: "SYSTEM",
        actorId: null,
        action: "PROGRAM_CLOSED",
        metadata: expect.objectContaining({ completedProjectCount: 1, canceledProjectCount: 1 }),
      }),
    });
    expect(transaction.topic).not.toHaveProperty("update");
    expect(transaction.topic).not.toHaveProperty("updateMany");
    expect(transaction.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          recipientId: "student-2",
          type: "TOPIC_APPROVAL",
          dedupeKey: "program-close:topic-approval:approval-1",
        }),
        expect.objectContaining({
          recipientId: "student-3",
          type: "PROJECT_REQUEST",
          dedupeKey: "program-close:guidance:guidance-1",
        }),
      ]),
      skipDuplicates: true,
    });
  });

  it("이미 처리한 종료 이벤트는 명시적인 종료일 호출도 반복 실행하지 않는다", async () => {
    const findProjects = vi.fn();
    const transaction = {
      $queryRaw: vi.fn(async () => [{ id: "program-1", endsAt, endProcessedAt: endsAt }]),
      topic: { findMany: findProjects },
    };

    await expect(finalizeProgram(clientWith(transaction), {
      programId: "program-1",
      actor: { kind: "USER", id: "admin-1" },
      processedAt: new Date(endsAt.getTime() + 1_000),
      endsAt: new Date(endsAt.getTime() + 1_000),
    })).resolves.toBe(false);
    expect(findProjects).not.toHaveBeenCalled();
  });
});
