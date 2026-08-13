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
    const users = await this.client.user.findMany({
      where,
      orderBy: [{ accountStatus: "asc" }, { role: "asc" }, { name: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, name: true, email: true, role: true, accountStatus: true, createdAt: true },
    });
    const professorIds = users.filter(({ role }) => role === "PROFESSOR").map(({ id }) => id);
    const activeTopics = professorIds.length
      ? await this.client.topic.findMany({
        where: { managerId: { in: professorIds }, status: "ACTIVE" },
        select: { id: true, managerId: true },
      })
      : [];
    const responsibilityIdsByUserId = new Map<string, Set<string>>();
    for (const { id, managerId } of activeTopics) {
      if (managerId) {
        const ids = responsibilityIdsByUserId.get(managerId) ?? new Set<string>();
        ids.add(id);
        responsibilityIdsByUserId.set(managerId, ids);
      }
    }
    const items = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.accountStatus === "ACTIVE",
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
      activeResponsibilityCount: responsibilityIdsByUserId.get(user.id)?.size ?? 0,
    }));
    return { items, page, totalPages, total };
  }

  setActive(input: { actorId: string; targetId: string; isActive: boolean; changedAt: Date }): Promise<"UPDATED" | "NOT_FOUND" | "UNCHANGED" | "SELF_DEACTIVATION" | "LAST_ADMIN" | "ACTIVE_PROJECTS"> {
    return this.client.$transaction(async (transaction) => {
      // 사용자 상태 변경은 드물고, 마지막 활성 관리자 규칙은 관리자 집합 전체의 불변식이다.
      // 서로 다른 관리자 행을 동시에 잠가도 같은 집합 잠금을 먼저 얻도록 트랜잭션을 직렬화한다.
      await transaction.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(1947337051, 1)::text AS "lock"`);
      const targets = await transaction.$queryRaw<Array<{ id: string; role: "STUDENT" | "PROFESSOR" | "ADMIN"; accountStatus: "ACTIVE" | "DISABLED" | "WITHDRAWN" }>>(Prisma.sql`
        SELECT "id", "role", "accountStatus" FROM "user" WHERE "id" = ${input.targetId} FOR UPDATE
      `);
      const target = targets[0];
      if (!target) return "NOT_FOUND";
      if (!input.isActive && input.actorId === target.id) return "SELF_DEACTIVATION";
      if (target.accountStatus === "WITHDRAWN") return "UNCHANGED";
      if ((target.accountStatus === "ACTIVE") === input.isActive) return "UNCHANGED";
      if (!input.isActive && target.role === "ADMIN") {
        const activeAdmins = await transaction.user.count({ where: { role: "ADMIN", accountStatus: "ACTIVE" } });
        if (activeAdmins <= 1) return "LAST_ADMIN";
      }
      if (!input.isActive && target.role === "PROFESSOR") {
        const [activeTopicCount, activeTeamCount] = await Promise.all([
          transaction.topic.count({ where: { managerId: target.id, status: "ACTIVE" } }),
          Promise.resolve(0),
        ]);
        if (activeTopicCount > 0 || activeTeamCount > 0) return "ACTIVE_PROJECTS";
      }
      const updated = await transaction.user.updateMany({
        where: { id: target.id, accountStatus: { not: input.isActive ? "ACTIVE" : "DISABLED" } },
        data: { accountStatus: input.isActive ? "ACTIVE" : "DISABLED" },
      });
      if (updated.count !== 1) return "UNCHANGED";
      if (!input.isActive) await transaction.session.deleteMany({ where: { userId: target.id } });
      await transaction.auditLog.create({ data: {
        actorId: input.actorId,
        action: input.isActive ? "USER_REACTIVATED" : "USER_DEACTIVATED",
        targetType: "USER",
        targetId: target.id,
        metadata: { previousAccountStatus: target.accountStatus, nextAccountStatus: input.isActive ? "ACTIVE" : "DISABLED" },
        createdAt: input.changedAt,
      } });
      return "UPDATED";
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
