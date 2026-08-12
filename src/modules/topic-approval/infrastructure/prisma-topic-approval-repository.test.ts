import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { PrismaTopicApprovalRepository } from "@/modules/topic-approval/infrastructure/prisma-topic-approval-repository";

vi.mock("@/modules/translation/application/translation-queue", () => ({
  enqueueTranslations: vi.fn(async () => undefined),
}));

const requestedAt = new Date("2026-08-01T00:00:00Z");
const recruitmentEndsAt = new Date("2026-08-10T00:00:00Z");

function uniqueConflict(target: string[]) {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "7.8.0",
    meta: { target },
  });
}

const proposal = {
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
  recruitmentEndsAt,
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
      $queryRaw: vi.fn().mockResolvedValue([{
        id: "program-1",
        status: "OPEN",
        advisorEnabled: false,
        studentProjectCreationEnabled: true,
      }]),
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
    const sql = (transaction.$queryRaw.mock.calls[0][0] as { strings: readonly string[] }).strings.join("?");
    expect(sql).toContain('FROM "project_program"');
    expect(sql).toContain("FOR SHARE");
  });

  it("기존 팀을 선택하면 정원을 현재 팀원 수로 고정하고 추가 모집을 끈다", async () => {
    const createTopic = vi.fn(async () => ({ id: "topic-1" }));
    const transaction = {
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([{
          id: "program-1",
          isPublic: true,
          lifecycleStatus: "ACTIVE",
          advisorEnabled: true,
          studentProjectCreationEnabled: true,
          projectRegistrationStartsAt: new Date("2026-07-01T00:00:00Z"),
          projectRegistrationEndsAt: new Date("2026-08-20T00:00:00Z"),
        }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: "student-team-1", compositionVersion: 1 }]),
      studentTeam: {
        findFirst: vi.fn(async () => ({
          id: "student-team-1",
          compositionVersion: 1,
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
    const lockSql = transaction.$queryRaw.mock.calls.map(([query]) =>
      (query as { strings: readonly string[] }).strings.join("?"),
    );
    expect(lockSql[0]).toContain('FROM "project_program"');
    expect(lockSql[0]).toContain("FOR SHARE");
    expect(lockSql[2]).toContain('FROM "student_team"');
    expect(lockSql[2]).toContain("FOR UPDATE");
  });

  it("기존 팀을 선택하지 않으면 기존 모집 설정을 그대로 유지한다", async () => {
    const createTopic = vi.fn(async () => ({ id: "topic-1" }));
    const transaction = {
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([{
          id: "program-1",
          isPublic: true,
          lifecycleStatus: "ACTIVE",
          advisorEnabled: true,
          studentProjectCreationEnabled: true,
          projectRegistrationStartsAt: new Date("2026-07-01T00:00:00Z"),
          projectRegistrationEndsAt: new Date("2026-08-20T00:00:00Z"),
        }])
        .mockResolvedValueOnce([]),
      studentTeam: { findFirst: vi.fn() },
      teamMember: { count: vi.fn() },
      topic: { create: createTopic },
    };
    const client = {
      $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
    } as unknown as PrismaClient;

    await new PrismaTopicApprovalRepository(client).create(proposal);

    expect(transaction.studentTeam.findFirst).not.toHaveBeenCalled();
    expect(transaction.$queryRaw).toHaveBeenCalledTimes(2);
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

  it("기존 팀 없이도 지원을 받지 않는 프로젝트 제안을 저장한다", async () => {
    const createTopic = vi.fn(async () => ({ id: "topic-1" }));
    const transaction = {
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([{
          id: "program-1",
          isPublic: true,
          lifecycleStatus: "ACTIVE",
          advisorEnabled: true,
          studentProjectCreationEnabled: true,
          projectRegistrationStartsAt: new Date("2026-07-01T00:00:00Z"),
          projectRegistrationEndsAt: new Date("2026-08-20T00:00:00Z"),
        }])
        .mockResolvedValueOnce([]),
      studentTeam: { findFirst: vi.fn() },
      teamMember: { count: vi.fn() },
      topic: { create: createTopic },
    };
    const client = {
      $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
    } as unknown as PrismaClient;

    await new PrismaTopicApprovalRepository(client).create({ ...proposal, recruitmentEnabled: false });

    expect(createTopic).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recruitmentEnabled: false,
        approvalRequest: { create: expect.objectContaining({ studentTeamId: undefined }) },
      }),
    });
  });

  it("교수 승인자를 학생 제안의 담당자로 지정한다", async () => {
    const updateTopic = vi.fn(async () => ({ id: "topic-1" }));
    const request = {
      id: "request-1",
      topicId: "topic-1",
      requesterId: "student-1",
      topic: { title: "학생 제안" },
      route: "PROFESSOR" as const,
      requestedProfessorId: "professor-1",
      studentTeamId: null,
      status: "PENDING" as const,
    };
    const queryRaw = vi.fn()
      .mockResolvedValueOnce([{
        lifecycleStatus: "ACTIVE",
        projectRegistrationStartsAt: new Date("2026-07-01T00:00:00Z"),
        projectRegistrationEndsAt: new Date("2026-08-20T00:00:00Z"),
        recruitmentEndsAt,
      }])
      .mockResolvedValueOnce([{
        id: "topic-1",
        programId: "program-1",
        authorId: "student-1",
        title: "학생 제안",
        capacity: 4,
        recruitmentEnabled: true,
        recruitmentEndsAt,
        status: "PENDING_APPROVAL",
      }])
      .mockResolvedValueOnce([request]);
    const transaction = {
      $queryRaw: queryRaw,
      topic: {
        update: updateTopic,
      },
      topicApprovalRequest: {
        findUnique: vi.fn(async () => request),
        update: vi.fn(async () => ({ id: "request-1" })),
      },
      notification: { createMany: vi.fn(async () => ({ count: 1 })) },
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
    expect(queryRaw).toHaveBeenCalledTimes(3);
    const lockSql = queryRaw.mock.calls.map(([query]) =>
      (query as { strings: readonly string[] }).strings.join("?"),
    );
    expect(lockSql[0]).toContain('FOR UPDATE OF "project_program"');
    expect(lockSql[1]).toContain('FROM "topic"');
    expect(lockSql[1]).toContain("FOR UPDATE");
    expect(lockSql[2]).toContain('FROM "topic_approval_request"');
  });

  it("지원받지 않는 제안은 기존 팀 없이 모집 종료 뒤에도 승인한다", async () => {
    const decidedAt = new Date("2026-08-15T00:00:00Z");
    const updateTopic = vi.fn(async () => ({ id: "topic-1" }));
    const request = {
      id: "request-1",
      topicId: "topic-1",
      requesterId: "student-1",
      topic: { title: "학생 제안" },
      route: "ADMIN" as const,
      requestedProfessorId: null,
      studentTeamId: null,
      studentTeamVersion: null,
      status: "PENDING" as const,
    };
    const queryRaw = vi.fn()
      .mockResolvedValueOnce([{
        lifecycleStatus: "ACTIVE",
        projectRegistrationStartsAt: new Date("2026-07-01T00:00:00Z"),
        projectRegistrationEndsAt: new Date("2026-08-20T00:00:00Z"),
        recruitmentEndsAt,
      }])
      .mockResolvedValueOnce([{
        id: "topic-1",
        programId: "program-1",
        authorId: "student-1",
        title: "학생 제안",
        capacity: 4,
        recruitmentEnabled: false,
        status: "PENDING_APPROVAL",
      }])
      .mockResolvedValueOnce([request]);
    const transaction = {
      $queryRaw: queryRaw,
      topic: { update: updateTopic },
      topicApprovalRequest: {
        findUnique: vi.fn(async () => request),
        update: vi.fn(async () => ({ id: "request-1" })),
      },
      notification: { createMany: vi.fn(async () => ({ count: 1 })) },
    };
    const client = {
      $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
    } as unknown as PrismaClient;

    await expect(new PrismaTopicApprovalRepository(client).decide({
      requestId: "request-1",
      actorId: "admin-1",
      actorRole: "ADMIN",
      decision: "APPROVE",
      reviewComment: "승인",
      decidedAt,
    })).resolves.toBe("APPROVED");

    expect(updateTopic).toHaveBeenCalledWith({
      where: { id: "topic-1" },
      data: { managerId: "admin-1", status: "PUBLISHED", publishedAt: decidedAt },
    });
  });

  it("종료된 프로그램의 대기 요청은 승인하지 않는다", async () => {
    const updateTopic = vi.fn();
    const updateRequest = vi.fn();
    const request = {
      id: "request-1",
      topicId: "topic-1",
      requesterId: "student-1",
      topic: { title: "학생 제안" },
      route: "ADMIN" as const,
      requestedProfessorId: null,
      studentTeamId: null,
      status: "PENDING" as const,
    };
    const queryRaw = vi.fn().mockResolvedValueOnce([{ lifecycleStatus: "CLOSED" }]);
    const transaction = {
      $queryRaw: queryRaw,
      topic: { update: updateTopic, updateMany: vi.fn(async () => ({ count: 0 })) },
      topicApprovalRequest: {
        findUnique: vi.fn(async () => request),
        update: updateRequest,
      },
      notification: { createMany: vi.fn(async () => ({ count: 1 })) },
    };
    const client = {
      $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
    } as unknown as PrismaClient;

    await expect(new PrismaTopicApprovalRepository(client).decide({
      requestId: "request-1",
      actorId: "admin-1",
      actorRole: "ADMIN",
      decision: "APPROVE",
      reviewComment: "승인",
      decidedAt: requestedAt,
    })).resolves.toBe("UNAVAILABLE");

    expect(updateTopic).not.toHaveBeenCalled();
    expect(updateRequest).not.toHaveBeenCalled();
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it("거절은 최신 승인 요청 상태를 잠근 뒤 반영한다", async () => {
    const request = {
      id: "request-1",
      topicId: "topic-1",
      requesterId: "student-1",
      topic: { title: "학생 제안" },
      route: "ADMIN" as const,
      requestedProfessorId: null,
      studentTeamId: null,
      status: "PENDING" as const,
    };
    const updateRequest = vi.fn(async () => ({ id: "request-1" }));
    const queryRaw = vi.fn().mockResolvedValueOnce([request]);
    const transaction = {
      $queryRaw: queryRaw,
      topic: { updateMany: vi.fn(async () => ({ count: 1 })) },
      topicApprovalRequest: {
        findUnique: vi.fn(async () => request),
        update: updateRequest,
      },
      notification: { createMany: vi.fn(async () => ({ count: 1 })) },
    };
    const client = {
      $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
    } as unknown as PrismaClient;

    await expect(new PrismaTopicApprovalRepository(client).decide({
      requestId: "request-1",
      actorId: "admin-1",
      actorRole: "ADMIN",
      decision: "REJECT",
      reviewComment: "반려",
      decidedAt: requestedAt,
    })).resolves.toBe("REJECTED");

    expect(updateRequest).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: {
        status: "REJECTED",
        reviewComment: "반려",
        decidedById: "admin-1",
        decidedAt: requestedAt,
      },
    });
    const sql = (queryRaw.mock.calls[0][0] as { strings: readonly string[] }).strings.join("?");
    expect(sql).toContain('FROM "topic_approval_request"');
    expect(sql).toContain("FOR UPDATE");
  });

  it("프로그램별 학생 소속 고유키 충돌은 승인 불가로 처리한다", async () => {
    const conflict = uniqueConflict(["programId", "studentId"]);
    const repository = new PrismaTopicApprovalRepository({
      $transaction: vi.fn().mockRejectedValue(conflict),
    } as unknown as PrismaClient);
    const unrelatedConflict = uniqueConflict(["topicId"]);
    const unrelatedRepository = new PrismaTopicApprovalRepository({
      $transaction: vi.fn().mockRejectedValue(unrelatedConflict),
    } as unknown as PrismaClient);

    await expect(repository.decide({
      requestId: "request-1",
      actorId: "admin-1",
      actorRole: "ADMIN",
      decision: "APPROVE",
      reviewComment: "승인",
      decidedAt: requestedAt,
    })).resolves.toBe("UNAVAILABLE");
    await expect(unrelatedRepository.decide({
      requestId: "request-1",
      actorId: "admin-1",
      actorRole: "ADMIN",
      decision: "APPROVE",
      reviewComment: "승인",
      decidedAt: requestedAt,
    })).rejects.toBe(unrelatedConflict);
  });

  it("이전된 현재 팀장도 기존 팀 제안 상태를 조회한다", async () => {
    const findMany = vi.fn(async () => []);
    const client = {
      topicApprovalRequest: { findMany, count: vi.fn(async () => 0) },
    } as unknown as PrismaClient;

    await new PrismaTopicApprovalRepository(client).listVisiblePage({
      id: "student-2",
      role: "STUDENT",
      name: "새 팀장",
      email: "student2@pusan.ac.kr",
      image: null,
    }, 1, 20);

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
      topicApprovalRequest: { findMany, count: vi.fn(async () => 0) },
    } as unknown as PrismaClient;
    const professor = {
      id: "professor-1",
      role: "PROFESSOR" as const,
      name: "박교수",
      email: "professor@pusan.ac.kr",
      image: null,
    };

    await new PrismaTopicApprovalRepository(client).listVisiblePage(professor, 1, 20, "PENDING");

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        AND: [
          { route: "PROFESSOR", requestedProfessorId: "professor-1" },
          { status: "PENDING" },
        ],
      },
    }));
  });

  it("승인 상세는 지정된 교수에게만 전체 제안 정보를 반환한다", async () => {
    const findFirst = vi.fn(async () => ({
      id: "request-1",
      topicId: "topic-1",
      requesterId: "student-1",
      route: "PROFESSOR" as const,
      requestedProfessorId: "professor-1",
      studentTeamId: null,
      status: "PENDING" as const,
      reviewComment: "",
      decidedById: null,
      decidedAt: null,
      createdAt: requestedAt,
      updatedAt: requestedAt,
      requester: { name: "김학생" },
      requestedProfessor: { name: "박교수" },
      topic: {
        title: "학생 제안",
        description: "상세 설명",
        requiredSkills: ["TypeScript"],
        preferredSkills: ["Figma"],
        roleExpectations: "개발",
        availabilityRequirement: "주 1회",
        applicationMode: "INDIVIDUAL_OR_TEAM" as const,
        capacity: 4,
        recruitmentStartsAt: proposal.recruitmentStartsAt,
        recruitmentEndsAt: proposal.recruitmentEndsAt,
        executionStartsAt: proposal.executionStartsAt,
        executionEndsAt: proposal.executionEndsAt,
        submissionStartsAt: proposal.submissionStartsAt,
        submissionEndsAt: proposal.submissionEndsAt,
        program: { name: "캡스톤", category: "교과" },
        applicationQuestions: [{ id: "question-1", label: "지원 동기", maxLength: 500, required: true }],
      },
    }));
    const client = { topicApprovalRequest: { findFirst } } as unknown as PrismaClient;
    const professor = { id: "professor-1", role: "PROFESSOR" as const, name: "박교수", email: "professor@pusan.ac.kr", image: null };

    const result = await new PrismaTopicApprovalRepository(client).findVisible(professor, "request-1");

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: [{ id: "request-1" }, { route: "PROFESSOR", requestedProfessorId: "professor-1" }] },
    }));
    expect(result).toMatchObject({
      id: "request-1",
      topicTitle: "학생 제안",
      requesterName: "김학생",
      requestedProfessorName: "박교수",
      description: "상세 설명",
      programName: "캡스톤",
      applicationQuestions: [{ label: "지원 동기" }],
    });
  });

  it("승인 시 기존 팀원을 모두 확정 참여시키고 실행 팀을 바로 확정한다", async () => {
    const createApplications = vi.fn(async () => ({ count: 2 }));
    const createExecutionTeam = vi.fn(async () => ({ id: "execution-team-1" }));
    const createMembers = vi.fn(async () => ({ count: 2 }));
    const findApplications = vi.fn()
      .mockResolvedValueOnce([{ id: "other-application-1", groupId: null }])
      .mockResolvedValueOnce([{
        id: "other-application-1",
        studentId: "student-1",
        topic: { title: "다른 주제" },
      }]);
    const rejectApplications = vi.fn(async () => ({ count: 1 }));
    const rejectRecruitmentApplications = vi.fn(async () => ({ count: 1 }));
    const createNotifications = vi.fn(async () => ({ count: 1 }));
    const updateTopic = vi.fn(async () => ({ id: "topic-1" }));
    const request = {
      id: "request-1",
      topicId: "topic-1",
      requesterId: "student-1",
      topic: { title: "학생 제안" },
      route: "ADMIN" as const,
      requestedProfessorId: null,
      studentTeamId: "student-team-1",
      studentTeamVersion: 1,
      status: "PENDING" as const,
    };
    const queryRaw = vi.fn()
      .mockResolvedValueOnce([{
        lifecycleStatus: "ACTIVE",
        projectRegistrationStartsAt: new Date("2026-07-01T00:00:00Z"),
        projectRegistrationEndsAt: new Date("2026-08-20T00:00:00Z"),
        recruitmentEndsAt,
      }])
      .mockResolvedValueOnce([{
        id: "topic-1",
        programId: "program-1",
        authorId: "student-1",
        title: "학생 제안",
        capacity: 2,
        recruitmentEnabled: false,
        recruitmentEndsAt,
        status: "PENDING_APPROVAL",
      }])
      .mockResolvedValueOnce([{ id: "student-team-1", leaderId: "student-2", name: "기존 팀", compositionVersion: 1 }])
      .mockResolvedValueOnce([request]);
    const transaction = {
      $queryRaw: queryRaw,
      topic: {
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
      topicApplication: {
        createMany: createApplications,
        findMany: findApplications,
        updateMany: rejectApplications,
      },
      recruitmentApplication: { updateMany: rejectRecruitmentApplications },
      notification: { createMany: createNotifications },
      team: {
        create: createExecutionTeam,
        findUnique: vi.fn(async () => ({
          id: "execution-team-1",
          programId: "program-1",
          status: "CONFIRMED",
          topic: { divisionId: null, division: null },
        })),
      },
      programReportDefinition: { findMany: vi.fn(async () => []) },
      rubricDefinition: { findMany: vi.fn(async () => []) },
      topicApprovalRequest: {
        findUnique: vi.fn(async () => request),
        update: vi.fn(async () => ({ id: "request-1" })),
      },
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
      studentTeamVersion: 1,
      teamCompositionConfirmed: true,
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
      data: expect.objectContaining({ programId: "program-1", professorId: "admin-1", status: "CONFIRMED", name: "기존 팀" }),
      select: { id: true },
    });
    expect(createMembers).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ programId: "program-1", studentId: "student-1" }),
        expect.objectContaining({ programId: "program-1", studentId: "student-2" }),
      ]),
    });
    expect(findApplications).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({
        studentId: { in: ["student-1", "student-2"] },
        status: "PENDING",
        topic: { programId: "program-1" },
      }),
    }));
    expect(rejectApplications).toHaveBeenCalledWith({
      where: { id: { in: ["other-application-1"] }, status: "PENDING" },
      data: {
        status: "REJECTED",
        decidedAt: requestedAt,
        decidedById: "admin-1",
        reviewComment: "같은 프로그램의 다른 프로젝트 참여가 확정되어 자동 미선정되었습니다.",
      },
    });
    expect(rejectRecruitmentApplications).toHaveBeenCalledWith({
      where: { topicApplicationId: { in: ["other-application-1"] }, status: "PENDING" },
      data: { status: "REJECTED", decidedAt: requestedAt },
    });
    expect(createNotifications).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([expect.objectContaining({
        recipientId: "student-1",
        dedupeKey: "application:other-application-1:REJECTED",
      })]),
    }));
    expect(updateTopic).toHaveBeenCalledWith({
      where: { id: "topic-1" },
      data: {
        managerId: "admin-1",
        status: "PUBLISHED",
        publishedAt: requestedAt,
        capacity: 2,
      },
    });
    const lockSql = queryRaw.mock.calls.map(([query]) =>
      (query as { strings: readonly string[] }).strings.join("?"),
    );
    expect(lockSql[0]).toContain('FOR UPDATE OF "project_program"');
    expect(lockSql[1]).toContain('FROM "topic"');
    expect(lockSql[2]).toContain('FROM "student_team"');
    expect(lockSql[3]).toContain('FROM "topic_approval_request"');
  });
});
