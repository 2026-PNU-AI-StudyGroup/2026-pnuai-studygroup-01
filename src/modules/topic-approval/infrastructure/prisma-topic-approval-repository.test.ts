import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaTopicApprovalRepository } from "@/modules/topic-approval/infrastructure/prisma-topic-approval-repository";

vi.mock("@/modules/translation/application/translation-queue", () => ({
  enqueueTranslations: vi.fn(async () => undefined),
}));

const requestedAt = new Date("2026-08-01T00:00:00Z");
const proposal = {
  academicCycleId: "cycle-1",
  programId: "program-1",
  authorId: "student-1",
  title: "학생 제안",
  description: "설명",
  requiredSkills: ["TypeScript"],
  preferredSkills: [],
  roleExpectations: "개발",
  availabilityRequirement: "주 1회",
  applicationMode: "INDIVIDUAL_OR_TEAM" as const,
  applicationQuestions: [{ label: "동기", maxLength: 500, required: true }],
  capacity: 4,
  recruitmentStartsAt: new Date("2026-08-01T00:00:00Z"),
  recruitmentEndsAt: new Date("2026-08-10T00:00:00Z"),
  executionStartsAt: new Date("2026-08-11T00:00:00Z"),
  executionEndsAt: new Date("2026-09-10T00:00:00Z"),
  submissionStartsAt: new Date("2026-09-01T00:00:00Z"),
  submissionEndsAt: new Date("2026-09-20T00:00:00Z"),
  route: "ADMIN" as const,
  requestedProfessorId: null,
  requestedAt,
};

describe("학생 제안 프로젝트의 기존 팀 연결", () => {
  beforeEach(() => vi.clearAllMocks());

  it("저장 시점에도 지도교수가 없는 프로그램의 교수 승인 요청을 거부한다", async () => {
    const createTopic = vi.fn();
    const transaction = {
      projectProgram: { findFirst: vi.fn(async () => ({ id: "program-1", advisorEnabled: false })) },
      user: { findFirst: vi.fn() },
      topic: { create: createTopic },
    };
    const client = {
      $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
    } as unknown as PrismaClient;

    await expect(new PrismaTopicApprovalRepository(client).create({
      ...proposal,
      route: "PROFESSOR",
      requestedProfessorId: "professor-1",
    })).resolves.toBeNull();

    expect(transaction.user.findFirst).not.toHaveBeenCalled();
    expect(createTopic).not.toHaveBeenCalled();
  });

  it("기존 팀을 선택하면 정원을 현재 팀원 수로 고정하고 추가 모집을 끈다", async () => {
    const createTopic = vi.fn(async () => ({ id: "topic-1" }));
    const transaction = {
      projectProgram: { findFirst: vi.fn(async () => ({ id: "program-1" })) },
      studentTeam: {
        findFirst: vi.fn(async () => ({
          id: "student-team-1",
          members: [
            { studentId: "student-1", student: { role: "STUDENT", isActive: true } },
            { studentId: "student-2", student: { role: "STUDENT", isActive: true } },
          ],
        })),
      },
      teamMember: { count: vi.fn(async () => 0) },
      topic: { create: createTopic },
    };
    const client = {
      $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
    } as unknown as PrismaClient;

    await new PrismaTopicApprovalRepository(client).create({
      ...proposal,
      studentTeamId: "student-team-1",
    });

    expect(createTopic).toHaveBeenCalledWith({
      data: expect.objectContaining({
        managerId: null,
        applicationMode: "TEAM_ONLY",
        recruitmentEnabled: false,
        capacity: 2,
        approvalRequest: {
          create: expect.objectContaining({ studentTeamId: "student-team-1" }),
        },
      }),
    });
  });

  it("기존 팀을 선택하지 않으면 기존 모집 설정을 그대로 유지한다", async () => {
    const createTopic = vi.fn(async () => ({ id: "topic-1" }));
    const transaction = {
      projectProgram: { findFirst: vi.fn(async () => ({ id: "program-1" })) },
      studentTeam: { findFirst: vi.fn() },
      teamMember: { count: vi.fn() },
      topic: { create: createTopic },
    };
    const client = {
      $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
    } as unknown as PrismaClient;

    await new PrismaTopicApprovalRepository(client).create(proposal);

    expect(transaction.studentTeam.findFirst).not.toHaveBeenCalled();
    expect(createTopic).toHaveBeenCalledWith({
      data: expect.objectContaining({
        managerId: null,
        applicationMode: "INDIVIDUAL_OR_TEAM",
        recruitmentEnabled: true,
        capacity: 4,
        approvalRequest: {
          create: expect.objectContaining({ studentTeamId: undefined }),
        },
      }),
    });
  });

  it("교수 승인자를 학생 제안의 담당자로 지정한다", async () => {
    const updateTopic = vi.fn(async () => ({ id: "topic-1" }));
    const transaction = {
      $queryRaw: vi.fn(async () => [{
        id: "request-1",
        topicId: "topic-1",
        route: "PROFESSOR",
        requestedProfessorId: "professor-1",
        studentTeamId: null,
        status: "PENDING",
      }]),
      topic: {
        findFirst: vi.fn(async () => ({
          id: "topic-1",
          academicCycleId: "cycle-1",
          authorId: "student-1",
          title: "학생 제안",
          capacity: 4,
          recruitmentEnabled: true,
        })),
        update: updateTopic,
      },
      topicApprovalRequest: { update: vi.fn(async () => ({ id: "request-1" })) },
    };
    const client = {
      $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
    } as unknown as PrismaClient;

    await expect(new PrismaTopicApprovalRepository(client).decide({
      requestId: "request-1",
      actorId: "professor-1",
      actorRole: "PROFESSOR",
      decision: "APPROVE",
      reviewComment: "승인",
      decidedAt: requestedAt,
    })).resolves.toBe("APPROVED");

    expect(updateTopic).toHaveBeenCalledWith({
      where: { id: "topic-1" },
      data: {
        managerId: "professor-1",
        status: "PUBLISHED",
        publishedAt: requestedAt,
      },
    });
  });

  it("이전된 현재 팀장도 기존 팀 제안 상태를 조회한다", async () => {
    const findMany = vi.fn(async () => []);
    const client = {
      topicApprovalRequest: { findMany },
    } as unknown as PrismaClient;

    await new PrismaTopicApprovalRepository(client).listVisible({
      id: "student-2",
      role: "STUDENT",
      name: "새 팀장",
      email: "student2@pusan.ac.kr",
      image: null,
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [
          { requesterId: "student-2" },
          {
            studentTeam: {
              leaderId: "student-2",
              deletedAt: null,
            },
          },
        ],
      },
    }));
  });

  it("교수 지도 화면 조회는 지정된 교수의 승인 대기 요청으로 제한한다", async () => {
    const findMany = vi.fn(async () => []);
    const client = {
      topicApprovalRequest: { findMany },
    } as unknown as PrismaClient;
    const professor = {
      id: "professor-1",
      role: "PROFESSOR" as const,
      name: "박교수",
      email: "professor@pusan.ac.kr",
      image: null,
    };

    await new PrismaTopicApprovalRepository(client).listVisible(professor, "PENDING");

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        AND: [
          { route: "PROFESSOR", requestedProfessorId: "professor-1" },
          { status: "PENDING" },
        ],
      },
    }));
  });

  it("승인 시 기존 팀원을 모두 확정 참여시키고 실행 팀을 바로 확정한다", async () => {
    const createApplications = vi.fn(async () => ({ count: 2 }));
    const createExecutionTeam = vi.fn(async () => ({ id: "execution-team-1" }));
    const createMembers = vi.fn(async () => ({ count: 2 }));
    const updateTopic = vi.fn(async () => ({ id: "topic-1" }));
    const queryRaw = vi.fn()
      .mockResolvedValueOnce([{
        id: "request-1",
        topicId: "topic-1",
        route: "ADMIN",
        requestedProfessorId: null,
        studentTeamId: "student-team-1",
        status: "PENDING",
      }])
      .mockResolvedValueOnce([{ id: "student-team-1", leaderId: "student-2", name: "기존 팀" }]);
    const transaction = {
      $queryRaw: queryRaw,
      topic: {
        findFirst: vi.fn(async () => ({
          id: "topic-1",
          academicCycleId: "cycle-1",
          authorId: "student-1",
          title: "학생 제안",
          capacity: 2,
          recruitmentEnabled: false,
        })),
        update: updateTopic,
      },
      studentTeamMember: {
        findMany: vi.fn(async () => [
          { studentId: "student-1", student: { role: "STUDENT", isActive: true } },
          { studentId: "student-2", student: { role: "STUDENT", isActive: true } },
        ]),
      },
      teamMember: { count: vi.fn(async () => 0), createMany: createMembers },
      topicApplicationGroup: { create: vi.fn(async () => ({ id: "group-1" })) },
      topicApplication: { createMany: createApplications },
      team: { create: createExecutionTeam },
      topicApprovalRequest: { update: vi.fn(async () => ({ id: "request-1" })) },
    };
    const client = {
      $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
    } as unknown as PrismaClient;

    const result = await new PrismaTopicApprovalRepository(client).decide({
      requestId: "request-1",
      actorId: "admin-1",
      actorRole: "ADMIN",
      decision: "APPROVE",
      reviewComment: "승인",
      decidedAt: requestedAt,
    });

    expect(result).toBe("APPROVED");
    expect(createApplications).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ studentId: "student-1", status: "ACCEPTED", participantRole: "MEMBER" }),
        expect.objectContaining({ studentId: "student-2", status: "ACCEPTED", participantRole: "LEADER" }),
      ]),
    });
    expect(createExecutionTeam).toHaveBeenCalledWith({
      data: expect.objectContaining({ professorId: "admin-1", status: "CONFIRMED", name: "기존 팀" }),
      select: { id: true },
    });
    expect(createMembers).toHaveBeenCalled();
    expect(updateTopic).toHaveBeenCalledWith({
      where: { id: "topic-1" },
      data: {
        managerId: "admin-1",
        status: "PUBLISHED",
        publishedAt: requestedAt,
      },
    });
  });
});
