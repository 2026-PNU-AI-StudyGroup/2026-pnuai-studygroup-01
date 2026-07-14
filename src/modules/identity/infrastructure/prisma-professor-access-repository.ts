import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  ProfessorAccessRecord,
  ProfessorAccessRepository,
} from "@/modules/identity/application/manage-professor-access";

export class PrismaProfessorAccessRepository implements ProfessorAccessRepository {
  constructor(private readonly client: PrismaClient) {}

  async list(): Promise<ProfessorAccessRecord[]> {
    const entries = await this.client.professorAllowlist.findMany({
      orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
      select: { id: true, email: true, createdAt: true, revokedAt: true },
    });
    const users = await this.client.user.findMany({
      where: { email: { in: entries.map(({ email }) => email) } },
      select: { email: true, name: true, role: true },
    });
    const accountByEmail = new Map(users.map(({ email, ...account }) => [email, account]));
    return entries.map((entry) => ({ ...entry, account: accountByEmail.get(entry.email) ?? null }));
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
        data: { role: "PROFESSOR" },
      });
    });
  }

  async revoke(email: string, revokedAt: Date): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtextextended(${email}, 0))::text AS "lock"
      `);
      const result = await transaction.professorAllowlist.updateMany({
        where: { email, revokedAt: null },
        data: { revokedAt },
      });
      if (result.count !== 1) return false;
      await transaction.user.updateMany({
        where: { email, role: "PROFESSOR" },
        data: { role: "STUDENT" },
      });
      return true;
    });
  }
}
