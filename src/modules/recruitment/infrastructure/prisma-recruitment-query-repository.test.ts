import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaRecruitmentQueryRepository } from "@/modules/recruitment/infrastructure/prisma-recruitment-query-repository";

describe("Prisma 팀원 모집 권한 조회", () => {
  it("일반 작성자의 지원자 조회에 작성자 소유 조건을 포함한다", async () => {
    const findFirst = vi.fn(async () => null);
    const client = { recruitmentPost: { findFirst } } as unknown as PrismaClient;

    await new PrismaRecruitmentQueryRepository(client).findPostApplications("post", { actorId: "author", isAdmin: false });

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "post", authorId: "author" } }));
  });

  it("관리자의 지원자 조회는 소유 조건 없이 대상 글만 제한한다", async () => {
    const findFirst = vi.fn(async () => null);
    const client = { recruitmentPost: { findFirst } } as unknown as PrismaClient;

    await new PrismaRecruitmentQueryRepository(client).findPostApplications("post", { actorId: "admin", isAdmin: true });

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "post" } }));
  });

  it("일반 작성자의 결정 대상을 본인 모집 글로 제한한다", async () => {
    const findFirst = vi.fn(async () => null);
    const client = { recruitmentApplication: { findFirst } } as unknown as PrismaClient;

    await new PrismaRecruitmentQueryRepository(client).findDecisionTarget("application", { actorId: "author", isAdmin: false });

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ post: expect.objectContaining({ authorId: "author" }) }),
    }));
  });

  it("관리자의 결정 대상은 작성자 소유 조건 없이 지원 상태로 제한한다", async () => {
    const findFirst = vi.fn<(input: unknown) => Promise<null>>().mockResolvedValue(null);
    const client = { recruitmentApplication: { findFirst } } as unknown as PrismaClient;

    await new PrismaRecruitmentQueryRepository(client).findDecisionTarget("application", { actorId: "admin", isAdmin: true });

    const call = findFirst.mock.calls[0]?.[0] as { where: { post: Record<string, unknown>; id: string; status: string } };
    expect(call.where.post).not.toHaveProperty("authorId");
    expect(call.where).toMatchObject({ id: "application", status: "PENDING" });
  });
});
