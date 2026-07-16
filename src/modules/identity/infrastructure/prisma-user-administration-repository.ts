import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { ManagedUserPage, UserAdministrationRepository } from "@/modules/identity/application/manage-users";

export class PrismaUserAdministrationRepository implements UserAdministrationRepository {
  constructor(private readonly client: PrismaClient) {}

  async list(query: string, requestedPage: number, pageSize: number): Promise<ManagedUserPage> {
    const where: Prisma.UserWhereInput = query ? { OR: [
      { name: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
    ] } : {};
    const total = await this.client.user.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const items = await this.client.user.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    return { items, page, totalPages, total };
  }

  setActive(input: { actorId: string; targetId: string; isActive: boolean; changedAt: Date }): Promise<"UPDATED" | "NOT_FOUND" | "UNCHANGED" | "SELF_DEACTIVATION" | "LAST_ADMIN"> {
    return this.client.$transaction(async (transaction) => {
      // 사용자 상태 변경은 드물고, 마지막 활성 관리자 규칙은 관리자 집합 전체의 불변식이다.
      // 서로 다른 관리자 행을 동시에 잠가도 같은 집합 잠금을 먼저 얻도록 트랜잭션을 직렬화한다.
      await transaction.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(1947337051, 1)::text AS "lock"`);
      const targets = await transaction.$queryRaw<Array<{ id: string; role: "STUDENT" | "PROFESSOR" | "ADMIN"; isActive: boolean }>>(Prisma.sql`
        SELECT "id", "role", "isActive" FROM "user" WHERE "id" = ${input.targetId} FOR UPDATE
      `);
      const target = targets[0];
      if (!target) return "NOT_FOUND";
      if (!input.isActive && input.actorId === target.id) return "SELF_DEACTIVATION";
      if (target.isActive === input.isActive) return "UNCHANGED";
      if (!input.isActive && target.role === "ADMIN") {
        const activeAdmins = await transaction.user.count({ where: { role: "ADMIN", isActive: true } });
        if (activeAdmins <= 1) return "LAST_ADMIN";
      }
      const updated = await transaction.user.updateMany({
        where: { id: target.id, isActive: { not: input.isActive } },
        data: { isActive: input.isActive },
      });
      if (updated.count !== 1) return "UNCHANGED";
      if (!input.isActive) await transaction.session.deleteMany({ where: { userId: target.id } });
      await transaction.auditLog.create({ data: {
        actorId: input.actorId,
        action: input.isActive ? "USER_REACTIVATED" : "USER_DEACTIVATED",
        targetType: "USER",
        targetId: target.id,
        metadata: { previousIsActive: target.isActive, nextIsActive: input.isActive },
        createdAt: input.changedAt,
      } });
      return "UPDATED";
    });
  }
}
