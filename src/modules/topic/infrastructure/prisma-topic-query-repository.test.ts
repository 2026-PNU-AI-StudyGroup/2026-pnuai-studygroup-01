import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaTopicQueryRepository } from "@/modules/topic/infrastructure/prisma-topic-query-repository";

describe("PrismaTopicQueryRepository 관리자 종료 프로젝트 조회", () => {
  it("종료 프로그램의 대기·반려 프로젝트도 관리자 직접 조회에서 허용한다", async () => {
    const findFirst = vi.fn(async () => null);
    const repository = new PrismaTopicQueryRepository({
      topic: { findFirst },
    } as unknown as PrismaClient, "ADMIN");

    await repository.findPublishedForAdmin("project-1");

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: "project-1",
        OR: [
          { status: "ACTIVE" },
          { program: { endsAt: { lte: expect.any(Date) } } },
        ],
      },
    }));
  });

  it("관리자 목록은 진행 중 프로젝트와 종료 프로그램의 모든 프로젝트를 함께 조회한다", async () => {
    const count = vi.fn(async () => 0);
    const findMany = vi.fn(async () => []);
    const now = new Date("2026-08-13T00:00:00.000Z");
    const repository = new PrismaTopicQueryRepository({
      topic: { count, findMany },
    } as unknown as PrismaClient, "ADMIN");

    await repository.listPublishedForAdmin({
      programId: "program-1",
      query: "",
      divisionId: "",
      page: 1,
      pageSize: 20,
      now,
    });

    expect(count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        AND: expect.arrayContaining([{
          programId: "program-1",
          OR: [
            { status: "ACTIVE" },
            { program: { endsAt: { lte: now } } },
          ],
        }]),
      }),
    });
  });

  it("운영 상태 프로젝트 ID를 페이지네이션 이전 조회 조건에 적용한다", async () => {
    const count = vi.fn(async () => 0);
    const findMany = vi.fn(async () => []);
    const repository = new PrismaTopicQueryRepository({
      topic: { count, findMany },
    } as unknown as PrismaClient, "ADMIN");

    await repository.listPublishedForAdmin({
      programId: "program-1",
      topicIds: ["topic-overdue"],
      query: "",
      page: 1,
      pageSize: 10,
      now: new Date("2026-08-13T00:00:00Z"),
    });

    expect(count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        AND: expect.arrayContaining([{ id: { in: ["topic-overdue"] } }]),
      }),
    });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: expect.arrayContaining([{ id: { in: ["topic-overdue"] } }]),
      }),
      skip: 0,
      take: 10,
    }));
  });

  it("프로그램 하나를 보면 분과 순서를 최신순 앞에 둔다", async () => {
    const findMany = vi.fn(async () => []);
    const repository = new PrismaTopicQueryRepository({
      topic: { count: vi.fn(async () => 0), findMany },
    } as unknown as PrismaClient, "STUDENT");

    await repository.listPublished({
      programId: "program-1",
      query: "",
      page: 1,
      pageSize: 10,
      now: new Date("2026-09-09T00:00:00Z"),
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [{ division: { position: "asc" } }, { publishedAt: "desc" }, { id: "desc" }],
    }));
  });

  it("프로그램을 고르지 않은 전체 목록은 분과 순서를 쓰지 않는다", async () => {
    // 분과 번호는 프로그램 안에서만 뜻이 있다. 섞으면 1번끼리 뭉쳐 순서가 무너진다.
    const findMany = vi.fn(async () => []);
    const repository = new PrismaTopicQueryRepository({
      topic: { count: vi.fn(async () => 0), findMany },
    } as unknown as PrismaClient, "STUDENT");

    await repository.listPublished({
      query: "",
      page: 1,
      pageSize: 10,
      now: new Date("2026-09-09T00:00:00Z"),
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    }));
  });
});
