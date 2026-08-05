import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  ProfessorAccessRecord,
  ProfessorAccessAuditRecord,
  ProfessorAccessRevokeOutcome,
  ProfessorAccessRepository,
} from "@/modules/identity/application/manage-professor-access";

export class PrismaProfessorAccessRepository implements ProfessorAccessRepository {
  constructor(private readonly client: PrismaClient) {}

  async list(): Promise<ProfessorAccessRecord[]> {
    const entries = await this.client.professorAllowlist.findMany({
      // 활성(revokedAt IS NULL) 항목을 먼저 보여준다. 기본 ASC는 NULLS LAST라
      // 활성 항목이 회수된 항목 아래로 묻힌다.
      orderBy: [{ revokedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
      select: { id: true, email: true, createdAt: true, revokedAt: true },
    });
    const users = await this.client.user.findMany({
      where: { email: { in: entries.map(({ email }) => email) } },
      select: { id: true, email: true, name: true, role: true },
    });
    const userIds = users.map(({ id }) => id);
    const [activeTopics, activeTeams] = userIds.length ? await Promise.all([
      this.client.topic.findMany({
        where: { managerId: { in: userIds }, status: { not: "CLOSED" } },
        select: { id: true, managerId: true },
      }),
      this.client.team.findMany({
        where: { professorId: { in: userIds }, status: { in: ["FORMING", "CONFIRMED"] } },
        select: { topicId: true, professorId: true },
      }),
    ]) : [[], []];
    const responsibilityIdsByUserId = new Map<string, Set<string>>();
    for (const { id, managerId } of activeTopics) {
      if (managerId) {
        const ids = responsibilityIdsByUserId.get(managerId) ?? new Set<string>();
        ids.add(id);
        responsibilityIdsByUserId.set(managerId, ids);
      }
    }
    for (const { topicId, professorId } of activeTeams) {
      const ids = responsibilityIdsByUserId.get(professorId) ?? new Set<string>();
      ids.add(topicId);
      responsibilityIdsByUserId.set(professorId, ids);
    }
    const accountByEmail = new Map(users.map(({ id, email, ...account }) => [email, {
      account,
      activeResponsibilityCount: responsibilityIdsByUserId.get(id)?.size ?? 0,
    }]));
    return entries.map((entry) => ({
      ...entry,
      account: accountByEmail.get(entry.email)?.account ?? null,
      activeResponsibilityCount: accountByEmail.get(entry.email)?.activeResponsibilityCount ?? 0,
    }));
  }

  async listAudit(): Promise<ProfessorAccessAuditRecord[]> {
    const entries = await this.client.auditLog.findMany({
      where: { action: { in: ["PROFESSOR_ACCESS_GRANTED", "PROFESSOR_ACCESS_REVOKED"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, action: true, targetId: true, createdAt: true, actor: { select: { name: true } } },
    });
    return entries.map((entry) => ({
      id: entry.id,
      action: entry.action === "PROFESSOR_ACCESS_GRANTED" ? "PROFESSOR_ACCESS_GRANTED" : "PROFESSOR_ACCESS_REVOKED",
      targetEmail: entry.targetId,
      actorName: entry.actor.name,
      createdAt: entry.createdAt,
    }));
  }

  async grant(email: string, createdById: string): Promise<void> {
    await this.client.$transaction(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtextextended(${email}, 0))::text AS "lock"
      `);
      await transaction.professorAllowlist.upsert({
        where: { email },
        create: { email, createdById },
        update: { revokedAt: null, createdById },
      });
      await transaction.user.updateMany({
        where: { email, emailVerified: true, role: "STUDENT" },
        // 교수 승격 시 학생 온보딩 요구 해제(추후 강등 시 온보딩 트랩 방지).
        data: { role: "PROFESSOR", onboardingRequired: false },
      });
      await transaction.auditLog.create({ data: {
        actorId: createdById,
        action: "PROFESSOR_ACCESS_GRANTED",
        targetType: "PUSAN_EMAIL",
        targetId: email,
        metadata: {},
      } });
    });
  }

  async revoke(email: string, revokedById: string, revokedAt: Date): Promise<ProfessorAccessRevokeOutcome> {
    return this.client.$transaction(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtextextended(${email}, 0))::text AS "lock"
      `);
      const allowlist = await transaction.professorAllowlist.findFirst({
        where: { email, revokedAt: null },
        select: { id: true },
      });
      if (!allowlist) return "NOT_FOUND";
      const account = await transaction.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (account) {
        const [activeTopicCount, activeTeamCount] = await Promise.all([
          transaction.topic.count({ where: { managerId: account.id, status: { not: "CLOSED" } } }),
          transaction.team.count({ where: { professorId: account.id, status: { in: ["FORMING", "CONFIRMED"] } } }),
        ]);
        if (activeTopicCount > 0 || activeTeamCount > 0) return "ACTIVE_PROJECTS";
      }
      const result = await transaction.professorAllowlist.updateMany({
        where: { email, revokedAt: null },
        data: { revokedAt },
      });
      if (result.count !== 1) return "NOT_FOUND";
      await transaction.user.updateMany({
        where: { email, role: "PROFESSOR" },
        data: { role: "STUDENT" },
      });
      await transaction.auditLog.create({ data: {
        actorId: revokedById,
        action: "PROFESSOR_ACCESS_REVOKED",
        targetType: "PUSAN_EMAIL",
        targetId: email,
        metadata: {},
        createdAt: revokedAt,
      } });
      return "REVOKED";
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
