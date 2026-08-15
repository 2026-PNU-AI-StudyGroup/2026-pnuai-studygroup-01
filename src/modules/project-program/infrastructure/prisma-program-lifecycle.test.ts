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
  it("프로그램 종료 시 승인 대기 등록과 그 팀 스냅샷을 함께 정리한다", async () => {
    const updateProgram = vi.fn(async () => ({ id: "program-1" }));
    const createAudit = vi.fn(async () => ({ id: "audit-1" }));
    const transaction = {
      $queryRaw: vi.fn(async () => [{ id: "program-1", endsAt, endProcessedAt: null }]),
      topic: {
        findMany: vi.fn(async () => [
          { id: "project-1", status: "ACTIVE", projectTeam: { confirmedAt: new Date("2026-03-01T00:00:00Z") } },
          { id: "project-2", status: "PENDING_APPROVAL", projectTeam: { confirmedAt: null } },
        ]),
        updateMany: vi.fn(async () => ({ count: 1 })),
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
          topic: { title: "등록 프로젝트" },
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
      projectTeam: { deleteMany: vi.fn(async () => ({ count: 1 })) },
      notification: { createMany: vi.fn(async () => ({ count: 1 })) },
      user: {
        findMany: vi.fn(async () => [
          { id: "student-1", email: "student1@pusan.ac.kr", emailVerified: true, accountStatus: "ACTIVE", preferredLocale: "ko", emailPreference: null },
          { id: "student-2", email: "student2@pusan.ac.kr", emailVerified: true, accountStatus: "ACTIVE", preferredLocale: "ko", emailPreference: null },
          { id: "student-3", email: "student3@pusan.ac.kr", emailVerified: true, accountStatus: "ACTIVE", preferredLocale: "ko", emailPreference: null },
        ]),
      },
      emailDelivery: { createMany: vi.fn(async () => ({ count: 3 })) },
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
    expect(transaction.topic.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["project-2"] }, status: "PENDING_APPROVAL" },
      data: { status: "REJECTED" },
    });
    expect(transaction.projectTeam.deleteMany).toHaveBeenCalledWith({
      where: { projectId: { in: ["project-2"] }, confirmedAt: null },
    });
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
