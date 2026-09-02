import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaUserAdministrationRepository } from "@/modules/identity/infrastructure/prisma-user-administration-repository";

function clientWith(users: Array<{ id: string; name: string; createdAt: Date }>, sessions: Array<{ userId: string; createdAt: Date | null }> = []) {
  const findMany = vi.fn(async (_args: { orderBy?: unknown }) => users.map((user) => ({
    ...user,
    email: `${user.id}@pusan.ac.kr`,
    role: "STUDENT" as const,
    accountStatus: "ACTIVE" as const,
  })));
  const client = {
    user: { count: vi.fn(async () => users.length), findMany },
    session: { groupBy: vi.fn(async () => sessions.map(({ userId, createdAt }) => ({ userId, _max: { createdAt } }))) },
    topic: { findMany: vi.fn(async () => []) },
  } as unknown as PrismaClient;
  return { client, findMany };
}

describe("사용자 목록", () => {
  it("최근에 가입한 사람을 맨 위에 둔다", async () => {
    // 권한을 주려고 보는 목록이다. 가나다순이면 방금 들어온 사람을 이름으로 짚어야 한다.
    const { client, findMany } = clientWith([
      { id: "new", name: "하길동", createdAt: new Date("2026-09-02T00:00:00Z") },
    ]);

    await new PrismaUserAdministrationRepository(client).list("", 1, 20, { role: "ALL", status: "ALL" });

    expect(findMany.mock.calls[0][0].orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
  });

  it("마지막 로그인을 세션에서 뽑아 붙인다", async () => {
    const { client } = clientWith(
      [
        { id: "a", name: "김철수", createdAt: new Date("2026-01-01T00:00:00Z") },
        { id: "b", name: "이영희", createdAt: new Date("2026-01-02T00:00:00Z") },
      ],
      [{ userId: "a", createdAt: new Date("2026-09-01T05:00:00Z") }],
    );

    const page = await new PrismaUserAdministrationRepository(client).list("", 1, 20, { role: "ALL", status: "ALL" });

    expect(page.items[0]!.lastSignedInAt).toEqual(new Date("2026-09-01T05:00:00Z"));
    // 세션이 만료돼 지워졌으면 값이 없다. 0 이나 가입일로 메우지 않는다.
    expect(page.items[1]!.lastSignedInAt).toBeUndefined();
  });

  it("사용자가 없으면 세션을 조회하지 않는다", async () => {
    const { client } = clientWith([]);

    await new PrismaUserAdministrationRepository(client).list("", 1, 20, { role: "ALL", status: "ALL" });

    expect(vi.mocked(client.session.groupBy)).not.toHaveBeenCalled();
  });
});
