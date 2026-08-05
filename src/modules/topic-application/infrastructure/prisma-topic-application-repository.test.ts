import { describe, expect, it, vi } from "vitest";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { PrismaTopicApplicationDecisionRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-decision-repository";
import { PrismaTopicApplicationQueryRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-query-repository";

function knownError(code: string, target?: string[]) {
  return new Prisma.PrismaClientKnownRequestError("transaction conflict", {
    code,
    clientVersion: "7.8.0",
    meta: target ? { target } : undefined,
  });
}

describe("Prisma 지원 결정 저장소", () => {
  it("내 프로젝트 상태 필터를 목록과 페이지 수 계산에 동일하게 적용한다", async () => {
    const count = vi.fn().mockResolvedValue(1);
    const groupBy = vi.fn().mockResolvedValue([
      { status: "PENDING", _count: { _all: 2 } },
      { status: "REJECTED", _count: { _all: 1 } },
    ]);
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = new PrismaTopicApplicationQueryRepository({
      topicApplication: { count, groupBy, findMany },
    } as unknown as PrismaClient);

    const page = await repository.listByStudent("student-1", 3, 20, "REJECTED");

    expect(count).toHaveBeenCalledWith({
      where: { studentId: "student-1", status: "REJECTED" },
    });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: "student-1", status: "REJECTED" },
      skip: 0,
      take: 20,
    }));
    expect(page).toMatchObject({
      page: 1,
      total: 1,
      counts: { PENDING: 2, ACCEPTED: 0, REJECTED: 1 },
    });
  });

  it("교수 상세 조회에 지원서와 주제 담당자 조건을 함께 적용한다", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const repository = new PrismaTopicApplicationQueryRepository({ topicApplication: { findFirst } } as unknown as PrismaClient);

    await repository.findVisibleById("application-1", {
      id: "professor-1",
      role: "PROFESSOR",
    });

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: "application-1",
        topic: {
          OR: [
            { managerId: "professor-1" },
            { assistants: { some: { userId: "professor-1" } } },
          ],
        },
        OR: [{ groupId: null }, { participantRole: "LEADER" }],
      },
    }));
  });

  it("관리자 상세 조회에는 지원서 식별자만 적용한다", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const repository = new PrismaTopicApplicationQueryRepository({ topicApplication: { findFirst } } as unknown as PrismaClient);

    await repository.findVisibleById("application-1", {
      id: "admin-1",
      role: "ADMIN",
    });

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "application-1", topic: {}, OR: [{ groupId: null }, { participantRole: "LEADER" }] },
    }));
  });

  it("교수 검토 목록에서 최신 대기 지원을 처리 이력보다 먼저 반환한다", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { id: "accepted", topicId: "topic-1", studentId: "student-1", status: "ACCEPTED", message: "완료", skills: [], desiredRole: "개발", availability: "저녁", createdAt: new Date("2026-07-17"), topic: { title: "지난 주제", managerId: "professor-1", assistants: [] }, student: { name: "김학생", email: "student1@pusan.ac.kr" } },
      { id: "pending-new", topicId: "topic-2", studentId: "student-2", status: "PENDING", message: "신규", skills: [], desiredRole: "기획", availability: "주말", createdAt: new Date("2026-07-16"), topic: { title: "현재 주제", managerId: "professor-1", assistants: [] }, student: { name: "이학생", email: "student2@pusan.ac.kr" } },
      { id: "rejected", topicId: "topic-3", studentId: "student-3", status: "REJECTED", message: "이력", skills: [], desiredRole: "분석", availability: "평일", createdAt: new Date("2026-07-15"), topic: { title: "지난 주제", managerId: "professor-1", assistants: [] }, student: { name: "박학생", email: "student3@pusan.ac.kr" } },
      { id: "pending-old", topicId: "topic-4", studentId: "student-4", status: "PENDING", message: "대기", skills: [], desiredRole: "개발", availability: "저녁", createdAt: new Date("2026-07-14"), topic: { title: "현재 주제", managerId: "professor-1", assistants: [] }, student: { name: "최학생", email: "student4@pusan.ac.kr" } },
    ]);
    const repository = new PrismaTopicApplicationQueryRepository({ topicApplication: { findMany } } as unknown as PrismaClient);

    const applications = await repository.listAll();

    expect(applications.map(({ id }) => id)).toEqual(["pending-new", "pending-old", "accepted", "rejected"]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { createdAt: "desc" } }));
  });

  it("학생-프로그램 유니크 충돌만 중복 소속으로 분류한다", async () => {
    const studentConflict = new PrismaTopicApplicationDecisionRepository({
      $transaction: vi
        .fn()
        .mockRejectedValue(
          knownError("P2002", ["programId", "studentId"]),
        ),
    } as unknown as PrismaClient);
    const otherConflict = new PrismaTopicApplicationDecisionRepository({
      $transaction: vi
        .fn()
        .mockRejectedValue(knownError("P2002", ["topicId"])),
    } as unknown as PrismaClient);

    await expect(
      studentConflict.accept(
        "application-1",
        { id: "professor-1", isAdmin: false },
        new Date(),
      ),
    ).resolves.toBe("STUDENT_ALREADY_ASSIGNED");
    await expect(
      otherConflict.accept(
        "application-1",
        { id: "professor-1", isAdmin: false },
        new Date(),
      ),
    ).resolves.toBe("CONFLICT");
  });

  it("수락한 학생의 같은 프로그램 내 다른 대기 지원을 자동 거절한다", async () => {
    const decidedAt = new Date("2026-07-19T00:00:00Z");
    const findMany = vi.fn()
      .mockResolvedValueOnce([{ id: "application-2", groupId: null }])
      .mockResolvedValueOnce([{
        id: "application-2",
        studentId: "student-1",
        topic: { title: "다른 주제" },
      }]);
    const updateMany = vi.fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    const queryRaw = vi.fn()
      .mockResolvedValueOnce([{ status: "OPEN" }])
      .mockResolvedValueOnce([{ status: "PUBLISHED" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "student-1", role: "STUDENT", isActive: true }]);
    const transaction = {
      $queryRaw: queryRaw,
      topicApplication: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ studentId: "student-1", topicId: "topic-1", groupId: null })
          .mockResolvedValueOnce({
            id: "application-1",
            topicId: "topic-1",
            studentId: "student-1",
            status: "PENDING",
            topic: {
              id: "topic-1",
              title: "선택 주제",
              authorId: "professor-1",
              managerId: "professor-1",
              assistants: [],
              programId: "program-1",
              capacity: 2,
              status: "PUBLISHED",
            },
            recruitmentApplication: null,
          }),
        findMany,
        updateMany,
      },
      teamMember: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({ id: "member-1" })),
      },
      team: { upsert: vi.fn(async () => ({ id: "team-1" })) },
      recruitmentApplication: { updateMany: vi.fn(async () => ({ count: 1 })) },
      notification: { createMany: vi.fn(async () => ({ count: 1 })) },
    };
    const client = {
      $transaction: vi.fn(async (operation: (tx: typeof transaction) => unknown) => operation(transaction)),
    } as unknown as PrismaClient;

    await expect(new PrismaTopicApplicationDecisionRepository(client).accept(
      "application-1",
      { id: "professor-1", isAdmin: false },
      decidedAt,
    )).resolves.toBe("ACCEPTED");

    expect(findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          { studentId: "student-1", topic: { programId: "program-1" } },
        ]),
      }),
    }));
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: { in: ["application-2"] }, status: "PENDING" },
      data: {
        status: "REJECTED",
        decidedAt,
        decidedById: "professor-1",
        reviewComment: "다른 지원이 선정되었거나 프로젝트 정원이 충족되어 자동 미선정되었습니다.",
      },
    });
  });

  it("담당자가 없는 공개 주제는 실행 팀으로 전환하지 않는다", async () => {
    const queryRaw = vi.fn()
      .mockResolvedValueOnce([{ status: "OPEN" }])
      .mockResolvedValueOnce([{ status: "PUBLISHED" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "student-1", role: "STUDENT", isActive: true }]);
    const transaction = {
      $queryRaw: queryRaw,
      topicApplication: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({
            studentId: "student-1",
            topicId: "topic-1",
            groupId: null,
          })
          .mockResolvedValueOnce({
            id: "application-1",
            topicId: "topic-1",
            studentId: "student-1",
            status: "PENDING",
            topic: {
              id: "topic-1",
              title: "학생 제안",
              authorId: "student-1",
              managerId: null,
              assistants: [],
              programId: "program-1",
              capacity: 4,
              status: "PUBLISHED",
            },
            recruitmentApplication: null,
          }),
      },
    };
    const client = {
      $transaction: vi.fn(async (operation: (tx: typeof transaction) => unknown) => operation(transaction)),
    } as unknown as PrismaClient;

    await expect(new PrismaTopicApplicationDecisionRepository(client).accept(
      "application-1",
      { id: "admin-1", isAdmin: true },
      new Date(),
    )).resolves.toBe("CONFLICT");
  });

  it("거절 시 프로그램·주제·팀·사용자를 잠근 뒤 지원 상태를 변경한다", async () => {
    const order: string[] = [];
    let rawCall = 0;
    const transaction = {
      $queryRaw: vi.fn(async () => {
        rawCall += 1;
        order.push(`lock-${rawCall}`);
        if (rawCall === 2) return [{ managerId: "professor-1", title: "주제" }];
        return [];
      }),
      topicApplication: {
        findUnique: vi.fn(async () => ({ id: "application-1", topicId: "topic-1", studentId: "student-1", groupId: null })),
        findMany: vi.fn(async () => [{ id: "application-1", studentId: "student-1", status: "PENDING" }]),
        updateMany: vi.fn(async () => { order.push("application-updated"); return { count: 1 }; }),
      },
      recruitmentApplication: {
        findUnique: vi.fn(async () => null),
        updateMany: vi.fn(async () => ({ count: 0 })),
      },
      projectAssistant: { findUnique: vi.fn(async () => null) },
      notification: { createMany: vi.fn(async () => ({ count: 1 })) },
    };
    const client = { $transaction: vi.fn(async (operation) => operation(transaction)) } as unknown as PrismaClient;

    await expect(new PrismaTopicApplicationDecisionRepository(client).reject(
      "application-1",
      { id: "professor-1", isAdmin: false },
      new Date("2026-07-19T00:00:00Z"),
    )).resolves.toBe("REJECTED");

    expect(order).toEqual(["lock-1", "lock-2", "lock-3", "lock-4", "application-updated"]);
  });

  it("수락과 거절의 PostgreSQL 쓰기 충돌을 제한 횟수만큼 재시도한다", async () => {
    const acceptTransaction = vi.fn()
      .mockRejectedValueOnce(knownError("P2034"))
      .mockResolvedValueOnce("ACCEPTED");
    const rejectTransaction = vi.fn()
      .mockRejectedValueOnce(knownError("P2034"))
      .mockResolvedValueOnce("REJECTED");

    await expect(new PrismaTopicApplicationDecisionRepository({ $transaction: acceptTransaction } as unknown as PrismaClient).accept(
      "application-1",
      { id: "professor-1", isAdmin: false },
      new Date(),
    )).resolves.toBe("ACCEPTED");
    await expect(new PrismaTopicApplicationDecisionRepository({ $transaction: rejectTransaction } as unknown as PrismaClient).reject(
      "application-1",
      { id: "professor-1", isAdmin: false },
      new Date(),
    )).resolves.toBe("REJECTED");

    expect(acceptTransaction).toHaveBeenCalledTimes(2);
    expect(rejectTransaction).toHaveBeenCalledTimes(2);
  });
});
