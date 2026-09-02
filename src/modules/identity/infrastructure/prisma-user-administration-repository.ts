import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { enqueueEmailEvents } from "@/modules/email/infrastructure/email-events";
import type { ManagedUserPage, SetAdminRoleOutcome, UserAdministrationRepository, UserListFilters } from "@/modules/identity/application/manage-users";

export class PrismaUserAdministrationRepository implements UserAdministrationRepository {
  constructor(private readonly client: PrismaClient) {}

  async list(query: string, requestedPage: number, pageSize: number, filters: UserListFilters): Promise<ManagedUserPage> {
    const conditions: Prisma.UserWhereInput[] = [];
    if (query) {
      conditions.push({ OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ] });
    }
    if (filters.role !== "ALL") conditions.push({ role: filters.role });
    // 비활성은 정지(DISABLED)와 탈퇴(WITHDRAWN)를 함께 묶는다. 목록에서는 둘 다 로그인할 수 없는 계정이다.
    if (filters.status !== "ALL") {
      conditions.push(filters.status === "ACTIVE" ? { accountStatus: "ACTIVE" } : { accountStatus: { not: "ACTIVE" } });
    }
    const where: Prisma.UserWhereInput = conditions.length ? { AND: conditions } : {};
    const total = await this.client.user.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const users = await this.client.user.findMany({
      where,
      // 권한을 주려고 이 목록을 본다. 방금 들어온 사람이 맨 위에 있어야 찾는다.
      // 가나다순이면 새로 가입한 교수를 이름으로 짚어 내야 해서 쓸모가 없다.
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, name: true, email: true, role: true, accountStatus: true, createdAt: true },
    });
    // 마지막 로그인은 세션에서 뽑는다. 사용자 표에 따로 적어 두는 칸이 없다.
    // 만료된 세션이 지워지면 값이 사라지므로 없으면 비워 둔다.
    const lastSignIns = users.length
      ? await this.client.session.groupBy({
        by: ["userId"],
        where: { userId: { in: users.map(({ id }) => id) } },
        _max: { createdAt: true },
      })
      : [];
    const lastSignInByUserId = new Map(lastSignIns.map((row) => [row.userId, row._max.createdAt]));
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
      lastSignedInAt: lastSignInByUserId.get(user.id) ?? undefined,
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
      const title = input.isActive ? "PMS 계정이 활성화되었습니다" : "PMS 계정이 비활성화되었습니다";
      const body = input.isActive
        ? "이제 PMS에 다시 로그인할 수 있습니다."
        : "관리자에 의해 계정 사용이 중지되었습니다. 문의가 있으면 운영진에게 연락해 주세요.";
      const titleEn = input.isActive ? "PMS account activated" : "PMS account disabled";
      const bodyEn = input.isActive
        ? "You can sign in to PMS again."
        : "An administrator disabled your account. Contact the PMS administrators if you need assistance.";
      await transaction.notification.create({
        data: {
          recipientId: target.id,
          type: "SYSTEM",
          title,
          body,
          href: "/account",
          dedupeKey: `user-account-status:${target.id}:${input.isActive ? "ACTIVE" : "DISABLED"}:${input.changedAt.getTime()}`,
          createdAt: input.changedAt,
        },
      });
      await enqueueEmailEvents(transaction, [{
        kind: "ACCOUNT_STATUS",
        recipientId: target.id,
        title,
        body,
        titleEn,
        bodyEn,
        href: "/account",
        idempotencyKey: `email:user-account-status:${target.id}:${input.isActive ? "ACTIVE" : "DISABLED"}:${input.changedAt.getTime()}`,
        createdAt: input.changedAt,
        allowInactiveRecipient: !input.isActive,
      }]);
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

  setAdminRole(input: { actorId: string; targetId: string; isAdmin: boolean; changedAt: Date }): Promise<SetAdminRoleOutcome> {
    return this.client.$transaction(async (transaction) => {
      // "마지막 관리자" 규칙은 관리자 집합 전체의 불변식이라 setActive 와 같은 잠금을 쓴다.
      // 두 작업이 서로 다른 행을 잠그더라도 같은 순서로 직렬화된다.
      await transaction.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(1947337051, 1)::text AS "lock"`);
      const targets = await transaction.$queryRaw<Array<{ id: string; role: "STUDENT" | "PROFESSOR" | "ADMIN" | "ADVISOR"; accountStatus: "ACTIVE" | "DISABLED" | "WITHDRAWN" }>>(Prisma.sql`
        SELECT "id", "role", "accountStatus" FROM "user" WHERE "id" = ${input.targetId} FOR UPDATE
      `);
      const target = targets[0];
      if (!target) return "NOT_FOUND";
      if (target.accountStatus === "WITHDRAWN") return "WITHDRAWN";
      // 외부 자문위원은 토큰으로만 접근하는 교외 인원이라 운영 권한 대상이 아니다.
      if (input.isAdmin && target.role === "ADVISOR") return "EXTERNAL_ADVISOR";
      if ((target.role === "ADMIN") === input.isAdmin) return "UNCHANGED";
      if (!input.isAdmin) {
        if (input.actorId === target.id) return "SELF_DEMOTION";
        const admins = await transaction.user.count({ where: { role: "ADMIN", accountStatus: "ACTIVE" } });
        if (admins <= 1) return "LAST_ADMIN";
      }
      // 관리자 해제는 학생으로 되돌린다. 교수 허용목록에 있으면 다음 로그인에 교수로 복구된다.
      const nextRole = input.isAdmin ? "ADMIN" : "STUDENT";
      const updated = await transaction.user.updateMany({
        where: { id: target.id, role: target.role },
        data: { role: nextRole },
      });
      if (updated.count !== 1) return "UNCHANGED";
      // 권한이 바뀌면 기존 세션의 역할 표시가 어긋나므로 다시 로그인하게 한다.
      await transaction.session.deleteMany({ where: { userId: target.id } });
      const title = input.isAdmin ? "PMS 관리자 권한이 부여되었습니다" : "PMS 관리자 권한이 해제되었습니다";
      const body = input.isAdmin
        ? "다시 로그인하면 운영 관리 메뉴를 사용할 수 있습니다."
        : "운영 관리 메뉴 사용 권한이 해제되었습니다. 문의가 있으면 운영진에게 연락해 주세요.";
      const titleEn = input.isAdmin ? "PMS administrator access granted" : "PMS administrator access revoked";
      const bodyEn = input.isAdmin
        ? "Sign in again to use the operations menu."
        : "Your access to the operations menu was revoked. Contact the PMS administrators if you need assistance.";
      await transaction.notification.create({
        data: {
          recipientId: target.id,
          type: "SYSTEM",
          title,
          body,
          href: "/account",
          dedupeKey: `user-admin-role:${target.id}:${nextRole}:${input.changedAt.getTime()}`,
          createdAt: input.changedAt,
        },
      });
      await enqueueEmailEvents(transaction, [{
        kind: "ACCOUNT_STATUS",
        recipientId: target.id,
        title,
        body,
        titleEn,
        bodyEn,
        href: "/account",
        idempotencyKey: `email:user-admin-role:${target.id}:${nextRole}:${input.changedAt.getTime()}`,
        createdAt: input.changedAt,
      }]);
      await transaction.auditLog.create({ data: {
        actorId: input.actorId,
        action: input.isAdmin ? "ADMIN_ROLE_GRANTED" : "ADMIN_ROLE_REVOKED",
        targetType: "USER",
        targetId: target.id,
        metadata: { previousRole: target.role, nextRole },
        createdAt: input.changedAt,
      } });
      return "UPDATED";
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
