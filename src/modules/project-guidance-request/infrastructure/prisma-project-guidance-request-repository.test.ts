import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaProjectGuidanceRequestRepository } from "@/modules/project-guidance-request/infrastructure/prisma-project-guidance-request-repository";

const student = { id: "student-1", role: "STUDENT" as const };
const professor = { id: "professor-1", role: "PROFESSOR" as const };

describe("PrismaProjectGuidanceRequestRepository", () => {
  it("팀 접근 권한을 확인한 뒤 요청과 응답자를 페이지 단위로 반환한다", async () => {
    const findFirst = vi.fn(async () => ({ id: "team-1" }));
    const findMany = vi.fn(async () => [{
      id: "request-1",
      teamId: "team-1",
      requesterId: student.id,
      kind: "REVIEW",
      title: "설계 검토",
      content: "도메인 경계를 검토해 주세요.",
      referenceUrl: null,
      preferredAt: null,
      status: "PENDING",
      response: null,
      scheduledAt: null,
      respondedAt: null,
      canceledAt: null,
      createdAt: new Date("2026-08-03T00:00:00Z"),
      requester: { name: "정하늘" },
      responder: null,
    }]);
    const client = {
      team: { findFirst },
      projectGuidanceRequest: {
        count: vi.fn()
          .mockResolvedValueOnce(1)
          .mockResolvedValueOnce(1),
        findMany,
      },
    } as unknown as PrismaClient;

    const page = await new PrismaProjectGuidanceRequestRepository(client)
      .findPage("team-1", student, 1, 20);

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "team-1", OR: expect.any(Array) }),
    }));
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 20, skip: 0 }));
    expect(page?.items[0]).toEqual(expect.objectContaining({
      requesterName: "정하늘",
      responderName: null,
    }));
    expect(page?.pendingTotal).toBe(1);
  });

  it("요청 저장과 지도 인력 알림을 같은 트랜잭션에서 처리한다", async () => {
    const notificationCreateMany = vi.fn(async () => ({ count: 2 }));
    const requestCreate = vi.fn(async () => ({ id: "request-1" }));
    const transaction = {
      $executeRaw: vi.fn(async () => 1),
      $queryRaw: vi.fn(async () => [{
        id: "team-1",
        name: "모두의 길",
        professorId: professor.id,
        topicId: "topic-1",
        requesterName: "정하늘",
      }]),
      projectGuidanceRequest: {
        findFirst: vi.fn(async () => null),
        create: requestCreate,
      },
      projectAssistant: {
        findMany: vi.fn(async () => [{ userId: "assistant-1" }]),
      },
      translationSource: { createMany: vi.fn(async () => ({ count: 2 })) },
      translationJob: { createMany: vi.fn(async () => ({ count: 2 })) },
      notification: { createMany: notificationCreateMany },
    };
    const client = {
      $transaction: vi.fn(async (operation) => operation(transaction)),
    } as unknown as PrismaClient;
    const requestedAt = new Date("2026-08-03T00:00:00Z");

    await expect(new PrismaProjectGuidanceRequestRepository(client).create({
      teamId: "team-1",
      actor: student,
      kind: "REVIEW",
      title: "설계 검토",
      content: "도메인 경계를 검토해 주세요.",
      referenceUrl: null,
      preferredAt: null,
      requestedAt,
    })).resolves.toBe("CREATED");

    expect(requestCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ requesterId: student.id, kind: "REVIEW" }),
    }));
    expect(notificationCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ recipientId: professor.id, type: "PROJECT_REQUEST" }),
        expect.objectContaining({ recipientId: "assistant-1", type: "PROJECT_REQUEST" }),
      ]),
      skipDuplicates: true,
    });
  });

  it("감독 권한으로 잠그지 못한 대기 요청에는 응답을 기록하지 않는다", async () => {
    const update = vi.fn();
    const transaction = {
      $queryRaw: vi.fn(async () => []),
      projectGuidanceRequest: { update },
    };
    const client = {
      $transaction: vi.fn(async (operation) => operation(transaction)),
    } as unknown as PrismaClient;

    await expect(new PrismaProjectGuidanceRequestRepository(client).respond({
      requestId: "request-1",
      actor: professor,
      response: "확인했습니다.",
      scheduledAt: null,
      respondedAt: new Date("2026-08-03T00:00:00Z"),
    })).resolves.toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("요청자 본인의 대기 요청만 취소한다", async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const client = {
      projectGuidanceRequest: { updateMany },
    } as unknown as PrismaClient;
    const canceledAt = new Date("2026-08-03T00:00:00Z");

    await expect(new PrismaProjectGuidanceRequestRepository(client).cancel({
      requestId: "request-1",
      actor: student,
      canceledAt,
    })).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "request-1",
        requesterId: student.id,
        status: "PENDING",
        team: { status: "CONFIRMED" },
      },
      data: { status: "CANCELED", canceledAt, updatedAt: canceledAt },
    });
  });
});
