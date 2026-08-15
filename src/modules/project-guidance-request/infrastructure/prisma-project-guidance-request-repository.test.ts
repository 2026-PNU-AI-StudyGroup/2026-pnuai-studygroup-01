import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaProjectGuidanceRequestRepository } from "@/modules/project-guidance-request/infrastructure/prisma-project-guidance-request-repository";

const student = { id: "student-1", role: "STUDENT" as const };
const professor = { id: "professor-1", role: "PROFESSOR" as const };

describe("PrismaProjectGuidanceRequestRepository", () => {
  it("팀 접근 권한을 확인한 뒤 대기·답변·취소 상태와 최신 시각, ID 순으로 안정적으로 페이지 조회한다", async () => {
    const findFirst = vi.fn(async () => ({ id: "team-1" }));
    const findMany = vi.fn(async () => [{
      id: "request-1",
      projectTeamId: "team-1",
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
      projectTeam: { findFirst },
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
      where: expect.objectContaining({ id: "team-1", AND: expect.any(Array) }),
    }));
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [
        { status: "asc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
      take: 20,
      skip: 0,
    }));
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
        managerId: professor.id,
        projectId: "topic-1",
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
      user: { findMany: vi.fn(async () => []) },
      emailDelivery: { createMany: vi.fn(async () => ({ count: 0 })) },
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
    const queryRaw = vi.fn()
      .mockResolvedValueOnce([{ id: "program-1" }])
      .mockResolvedValueOnce([]);
    const transaction = {
      $queryRaw: queryRaw,
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
    const lockSql = queryRaw.mock.calls.map(([query]) =>
      (query as { strings: readonly string[] }).strings.join("?"));
    expect(lockSql[0]).toContain('FOR UPDATE OF "project_program"');
    expect(lockSql[1]).toContain('FOR UPDATE OF "project_guidance_request"');
  });

  it("요청자 본인의 대기 요청을 잠근 뒤 지도 인력 통지와 함께 취소한다", async () => {
    const update = vi.fn(async () => ({ id: "request-1" }));
    const notificationCreateMany = vi.fn(async () => ({ count: 2 }));
    const queryRaw = vi.fn()
      .mockResolvedValueOnce([{ id: "program-1" }])
      .mockResolvedValueOnce([{
        id: "request-1",
        kind: "MEETING",
        projectId: "topic-1",
        managerId: professor.id,
        teamName: "모두의 길",
        requesterName: "정하늘",
      }]);
    const transaction = {
      $queryRaw: queryRaw,
      projectGuidanceRequest: { update },
      projectAssistant: { findMany: vi.fn(async () => [{ userId: "assistant-1" }]) },
      notification: { createMany: notificationCreateMany },
      user: { findMany: vi.fn(async () => []) },
      emailDelivery: { createMany: vi.fn(async () => ({ count: 0 })) },
    };
    const client = {
      $transaction: vi.fn(async (operation) => operation(transaction)),
    } as unknown as PrismaClient;
    const canceledAt = new Date("2026-08-03T00:00:00Z");

    await expect(new PrismaProjectGuidanceRequestRepository(client).cancel({
      requestId: "request-1",
      actor: student,
      canceledAt,
    })).resolves.toBe(true);
    expect(update).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: { status: "CANCELED", canceledAt, updatedAt: canceledAt },
    });
    expect(notificationCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ recipientId: professor.id, type: "PROJECT_REQUEST" }),
        expect.objectContaining({ recipientId: "assistant-1", type: "PROJECT_REQUEST" }),
      ]),
      skipDuplicates: true,
    });
    const lockSql = queryRaw.mock.calls.map(([query]) =>
      (query as { strings: readonly string[] }).strings.join("?"));
    expect(lockSql[0]).toContain('FOR UPDATE OF "project_program"');
    expect(lockSql[1]).toContain('FOR UPDATE OF "project_guidance_request"');
  });
});
