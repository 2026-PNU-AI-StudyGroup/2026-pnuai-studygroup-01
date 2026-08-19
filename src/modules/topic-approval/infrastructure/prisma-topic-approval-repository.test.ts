import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaTopicApprovalRepository } from "@/modules/topic-approval/infrastructure/prisma-topic-approval-repository";

vi.mock("@/modules/translation/application/translation-queue", () => ({
  enqueueTranslations: vi.fn(async () => undefined),
}));

vi.mock("@/modules/report/infrastructure/program-deliverable-assignment", () => ({
  assignProgramDeliverablesToTeam: vi.fn(async () => undefined),
}));

const requestedAt = new Date("2026-08-16T00:00:00Z");
const registration = {
  programId: "program-1", authorId: "student-1", title: "학생 등록", description: "설명",
  requiredSkills: ["TypeScript"], preferredSkills: [], roleExpectations: "개발", availabilityRequirement: "주 1회",
  applicationMode: "TEAM_ONLY" as const, applicationQuestions: [{ label: "동기", maxLength: 500, required: true }], capacity: 4,
  recruitmentStartsAt: new Date("2026-08-01T00:00:00Z"), recruitmentEndsAt: new Date("2026-08-20T00:00:00Z"),
  executionStartsAt: new Date("2026-08-21T00:00:00Z"), executionEndsAt: new Date("2026-09-20T00:00:00Z"),
  route: "ADMIN" as const, requestedProfessorId: null,
  sourceStudentTeamId: "student-team-1", projectRepresentativeId: "student-2", projectTeamName: "프로젝트 스냅샷 팀", requestedAt,
};

function openProgram() {
  return {
    id: "program-1", isPublic: true, endsAt: new Date("2026-12-31T00:00:00Z"), advisorEnabled: true,
    studentProjectCreationEnabled: true, projectTeamMinSize: 2, projectTeamMaxSize: 6,
    projectRegistrationStartsAt: new Date("2026-08-01T00:00:00Z"), projectRegistrationEndsAt: new Date("2026-08-20T00:00:00Z"),
  };
}

describe("PrismaTopicApprovalRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("등록 시 학생팀을 복사한 승인 대기 프로젝트팀을 만든다", async () => {
    const create = vi.fn(async () => ({ id: "topic-1" }));
    const cancelInvitations = vi.fn(async () => ({ count: 1 }));
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValueOnce([openProgram()]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "student-team-1" }]),
      studentTeam: { findFirst: vi.fn(async () => ({ id: "student-team-1",
        members: [
          { studentId: "student-1", student: { role: "STUDENT", accountStatus: "ACTIVE" } },
          { studentId: "student-2", student: { role: "STUDENT", accountStatus: "ACTIVE" } },
        ],
      })) },
      studentTeamInvitation: { updateMany: cancelInvitations },
      topic: { create }, user: { findMany: vi.fn(async () => []) },
      notification: { createMany: vi.fn(async () => ({ count: 0 })) }, emailDelivery: { createMany: vi.fn(async () => ({ count: 0 })) },
    };
    const client = { $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)) } as unknown as PrismaClient;

    await expect(new PrismaTopicApprovalRepository(client).create(registration)).resolves.toBeTruthy();

    expect(cancelInvitations).toHaveBeenCalledWith({
      where: { teamId: "student-team-1", status: "PENDING" },
      data: { status: "CANCELED" },
    });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({
      status: "PENDING_APPROVAL", capacity: 2,
      approvalRequests: { create: expect.objectContaining({ requesterId: "student-1", route: "ADMIN" }) },
      projectTeam: { create: expect.objectContaining({
        name: "프로젝트 스냅샷 팀",
        memberships: { create: expect.arrayContaining([
          expect.objectContaining({ userId: "student-1", role: "MEMBER" }),
          expect.objectContaining({ userId: "student-2", role: "LEADER" }),
        ]) },
      }) },
    }) });
  });

  it("프로젝트 대표가 원본 학생팀 구성원이 아니면 생성하지 않는다", async () => {
    const create = vi.fn();
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValueOnce([openProgram()]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "student-team-1" }]),
      studentTeam: { findFirst: vi.fn(async () => ({ id: "student-team-1",
        members: [
          { studentId: "student-1", student: { role: "STUDENT", accountStatus: "ACTIVE" } },
          { studentId: "student-2", student: { role: "STUDENT", accountStatus: "ACTIVE" } },
        ],
        _count: { invitations: 0 },
      })) },
      topic: { create },
    };
    const client = { $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)) } as unknown as PrismaClient;

    await expect(new PrismaTopicApprovalRepository(client).create({ ...registration, projectRepresentativeId: "student-3" })).resolves.toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it("학생은 자신이 요청한 승인 건만 조회한다", async () => {
    const findMany = vi.fn(async () => []);
    const client = { topicApprovalRequest: { findMany, count: vi.fn(async () => 0) } } as unknown as PrismaClient;

    await new PrismaTopicApprovalRepository(client).listVisiblePage({
      id: "student-2", role: "STUDENT", name: "학생", email: "student@pusan.ac.kr", image: null,
    }, 1, 20);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { requesterId: "student-2" } }));
  });

  it("반려하면 승인 대기 프로젝트팀을 함께 삭제한다", async () => {
    const request = {
      id: "request-1", topicId: "topic-1", requesterId: "student-1", route: "ADMIN" as const,
      requestedProfessorId: null, status: "PENDING" as const, topic: { title: "학생 등록" },
    };
    const removeTeam = vi.fn(async () => ({ count: 1 }));
    const transaction = {
      $queryRaw: vi.fn(async () => [request]),
      topicApprovalRequest: { findUnique: vi.fn(async () => request), update: vi.fn(async () => request) },
      topic: { updateMany: vi.fn(async () => ({ count: 1 })) }, projectTeam: { deleteMany: removeTeam },
      notification: { createMany: vi.fn(async () => ({ count: 0 })) }, user: { findMany: vi.fn(async () => []) },
      emailDelivery: { createMany: vi.fn(async () => ({ count: 0 })) },
    };
    const client = { $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)) } as unknown as PrismaClient;

    await expect(new PrismaTopicApprovalRepository(client).decide({
      requestId: "request-1", actorId: "admin-1", actorRole: "ADMIN", decision: "REJECT", reviewComment: "반려", decidedAt: requestedAt,
    })).resolves.toBe("REJECTED");
    expect(removeTeam).toHaveBeenCalledWith({ where: { projectId: "topic-1", confirmedAt: null } });
  });

  it("등록자가 철회하면 승인 요청과 대기 팀을 함께 종료한다", async () => {
    const removeTeam = vi.fn(async () => ({ count: 1 }));
    const transaction = {
      $queryRaw: vi.fn(async () => [{ requestId: "request-1", requesterId: "student-1" }]),
      topicApprovalRequest: { update: vi.fn(async () => ({ id: "request-1" })) },
      topic: { update: vi.fn(async () => ({ id: "topic-1" })) },
      projectTeam: { deleteMany: removeTeam },
    };
    const client = { $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)) } as unknown as PrismaClient;

    await expect(new PrismaTopicApprovalRepository(client).withdraw({
      projectId: "topic-1", requesterId: "student-1", withdrawnAt: requestedAt,
    })).resolves.toBe("WITHDRAWN");
    expect(removeTeam).toHaveBeenCalledWith({ where: { projectId: "topic-1", confirmedAt: null } });
  });

  it("승인하면 승인 대기 프로젝트팀을 새로 만들지 않고 확정한다", async () => {
    const request = {
      id: "request-1", topicId: "topic-1", requesterId: "student-1", route: "ADMIN" as const,
      requestedProfessorId: null, status: "PENDING" as const, topic: { title: "학생 등록" },
    };
    const confirmTeam = vi.fn(async () => ({ id: "team-1" }));
    const createGroup = vi.fn(async () => ({ id: "group-1" }));
    const transaction = {
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([{ projectRegistrationStartsAt: new Date("2026-08-01T00:00:00Z"), projectRegistrationEndsAt: new Date("2026-08-20T00:00:00Z"), endsAt: new Date("2026-12-31T00:00:00Z"), studentProjectCreationEnabled: true }])
        .mockResolvedValueOnce([{ id: "topic-1", programId: "program-1", authorId: "student-1", title: "학생 등록", capacity: 2, recruitmentEnabled: false, status: "PENDING_APPROVAL" }])
        .mockResolvedValueOnce([request]),
      topicApprovalRequest: { findUnique: vi.fn(async () => request), update: vi.fn(async () => request) },
      projectTeam: {
        findUnique: vi.fn(async () => ({
          id: "team-1", confirmedAt: null,
          memberships: [
            { id: "membership-1", userId: "student-1", role: "LEADER", user: { role: "STUDENT", accountStatus: "ACTIVE" } },
            { id: "membership-2", userId: "student-2", role: "MEMBER", user: { role: "STUDENT", accountStatus: "ACTIVE" } },
          ],
        })),
        update: confirmTeam,
      },
      topicApplicationGroup: { create: createGroup },
      topicApplication: { createMany: vi.fn(async () => ({ count: 2 })) },
      projectTeamMembership: { update: vi.fn(async () => ({ id: "membership-1" })) },
      topic: { update: vi.fn(async () => ({ id: "topic-1" })) },
      notification: { createMany: vi.fn(async () => ({ count: 0 })) },
      user: { findMany: vi.fn(async () => []) },
      emailDelivery: { createMany: vi.fn(async () => ({ count: 0 })) },
    };
    const client = { $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)) } as unknown as PrismaClient;

    await expect(new PrismaTopicApprovalRepository(client).decide({
      requestId: "request-1", actorId: "admin-1", actorRole: "ADMIN", decision: "APPROVE", reviewComment: "승인", decidedAt: requestedAt,
    })).resolves.toBe("APPROVED");
    expect(confirmTeam).toHaveBeenCalledWith({
      where: { id: "team-1" },
      data: { confirmedAt: requestedAt, updatedAt: requestedAt },
    });
    expect(createGroup).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ leaderId: "student-1" }) }));
  });
});
