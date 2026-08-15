import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  ProfessorAccessRecord,
  ProfessorAccessAuditRecord,
  ProfessorAccessRevokeOutcome,
  ProfessorAccessRepository,
} from "@/modules/identity/application/manage-professor-access";
import { needsStudentOnboardingAfterRoleChange } from "@/modules/identity/domain/student-onboarding";
import type { OutboxEmailEvent } from "@/modules/email/application/email-delivery-ports";
import { enqueueEmailEvents } from "@/modules/email/infrastructure/email-events";

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
    const activeTopics = userIds.length ? await this.client.topic.findMany({
        where: { managerId: { in: userIds }, status: "ACTIVE" },
        select: { id: true, managerId: true },
      }) : [];
    const responsibilityIdsByUserId = new Map<string, Set<string>>();
    for (const { id, managerId } of activeTopics) {
      if (managerId) {
        const ids = responsibilityIdsByUserId.get(managerId) ?? new Set<string>();
        ids.add(id);
        responsibilityIdsByUserId.set(managerId, ids);
      }
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
      actorName: entry.actor?.name ?? "시스템",
      createdAt: entry.createdAt,
    }));
  }

  async grant(email: string, createdById: string): Promise<void> {
    await this.client.$transaction(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtextextended(${email}, 0))::text AS "lock"
      `);
      const existing = await transaction.professorAllowlist.findUnique({
        where: { email },
        select: { revokedAt: true },
      });
      if (existing?.revokedAt === null) return;

      const grantedAt = new Date();
      const auditId = randomUUID();
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
      const account = await transaction.user.findUnique({ where: { email }, select: { id: true } });
      const title = "교수 권한이 부여되었습니다";
      const body = "PMS에 로그인하면 교수 역할로 프로젝트 업무를 관리할 수 있습니다.";
      const titleEn = "Professor access granted";
      const bodyEn = "Sign in to PMS to manage project work with professor access.";
      if (account) {
        await transaction.notification.create({
          data: {
            recipientId: account.id,
            type: "SYSTEM",
            title,
            body,
            href: "/dashboard",
            dedupeKey: `professor-access-granted:${auditId}`,
            createdAt: grantedAt,
          },
        });
      }
      const emailEvent: OutboxEmailEvent = account
        ? {
            kind: "PROFESSOR_ACCESS",
            recipientId: account.id,
            title,
            body,
            titleEn,
            bodyEn,
            href: "/dashboard",
            idempotencyKey: `email:professor-access-granted:${auditId}`,
            createdAt: grantedAt,
          }
        : {
            kind: "PROFESSOR_ACCESS",
            recipientEmail: email,
            title,
            body,
            titleEn,
            bodyEn,
            href: "/dashboard",
            idempotencyKey: `email:professor-access-granted:${auditId}`,
            createdAt: grantedAt,
          };
      await enqueueEmailEvents(transaction, [emailEvent]);
      await transaction.auditLog.create({ data: {
        id: auditId,
        actorId: createdById,
        action: "PROFESSOR_ACCESS_GRANTED",
        targetType: "PUSAN_EMAIL",
        targetId: email,
        metadata: {},
        createdAt: grantedAt,
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
        select: {
          id: true,
          department: true,
          studentNumber: true,
          grade: true,
          phoneNumber: true,
          contactEmail: true,
          onboardingCompletedAt: true,
        },
      });
      if (account) {
        const activeTopicCount = await transaction.topic.count({ where: { managerId: account.id, status: "ACTIVE" } });
        if (activeTopicCount > 0) return "ACTIVE_PROJECTS";
      }
      const result = await transaction.professorAllowlist.updateMany({
        where: { email, revokedAt: null },
        data: { revokedAt },
      });
      if (result.count !== 1) return "NOT_FOUND";
      await transaction.user.updateMany({
        where: { email, role: "PROFESSOR" },
        data: {
          role: "STUDENT",
          onboardingRequired: account
            ? needsStudentOnboardingAfterRoleChange(account)
            : true,
        },
      });
      const title = "교수 권한이 회수되었습니다";
      const body = "PMS에서 교수 역할이 해제되었습니다. 계정 상태를 확인해 주세요.";
      const titleEn = "Professor access revoked";
      const bodyEn = "Your professor role has been removed in PMS. Review your account status.";
      if (account) {
        await transaction.notification.create({
          data: {
            recipientId: account.id,
            type: "SYSTEM",
            title,
            body,
            href: "/account",
            dedupeKey: `professor-access-revoked:${email}:${revokedAt.getTime()}`,
            createdAt: revokedAt,
          },
        });
      }
      const emailEvent: OutboxEmailEvent = account
        ? {
            kind: "PROFESSOR_ACCESS",
            recipientId: account.id,
            title,
            body,
            titleEn,
            bodyEn,
            href: "/account",
            idempotencyKey: `email:professor-access-revoked:${email}:${revokedAt.getTime()}`,
            createdAt: revokedAt,
          }
        : {
            kind: "PROFESSOR_ACCESS",
            recipientEmail: email,
            title,
            body,
            titleEn,
            bodyEn,
            href: "/account",
            idempotencyKey: `email:professor-access-revoked:${email}:${revokedAt.getTime()}`,
            createdAt: revokedAt,
          };
      await enqueueEmailEvents(transaction, [emailEvent]);
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
