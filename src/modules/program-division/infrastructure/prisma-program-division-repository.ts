import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { ProgramDivision, ProgramDivisionImpact, ProgramDivisionRepository } from "@/modules/program-division/application/manage-program-divisions";

export class PrismaProgramDivisionRepository implements ProgramDivisionRepository {
  constructor(private readonly client: PrismaClient) {}
  async list(programId: string): Promise<ProgramDivision[]> {
    const divisions = await this.client.programDivision.findMany({ where: { programId }, orderBy: { position: "asc" }, select: { id: true, name: true, position: true, _count: { select: { topics: true } } } });
    return divisions.map(({ _count, ...division }) => ({ ...division, projectCount: _count.topics }));
  }
  async create(programId: string, name: string, actorId: string) {
    try {
      return await this.client.$transaction(async (tx) => {
        const program = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT "id" FROM "project_program" WHERE "id" = ${programId} FOR UPDATE`);
        if (!program[0]) return "NOT_FOUND" as const;
        const lastDivision = await tx.programDivision.findFirst({ where: { programId }, orderBy: { position: "desc" }, select: { position: true } });
        const position = (lastDivision?.position ?? -1) + 1;
        const division = await tx.programDivision.create({ data: { programId, name, position } });
        await tx.auditLog.create({ data: { actorId, action: "PROGRAM_DIVISION_CREATED", targetType: "PROJECT_PROGRAM", targetId: programId, metadata: { divisionId: division.id, name } } });
        return "CREATED" as const;
      });
    } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "DUPLICATE" as const; throw error; }
  }
  async rename(id: string, name: string, actorId: string) {
    try { return await this.client.$transaction(async (tx) => {
      const reference = await tx.programDivision.findUnique({ where: { id }, select: { programId: true } });
      if (!reference) return "NOT_FOUND" as const;
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "project_program" WHERE "id" = ${reference.programId} FOR UPDATE`);
      const division = await tx.programDivision.findUnique({ where: { id }, select: { id: true } });
      if (!division) return "NOT_FOUND" as const;
      await tx.programDivision.update({ where: { id }, data: { name } });
      await tx.auditLog.create({ data: { actorId, action: "PROGRAM_DIVISION_UPDATED", targetType: "PROGRAM_DIVISION", targetId: id, metadata: { name } } });
      return "UPDATED" as const;
    }); } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "DUPLICATE" as const; throw error; }
  }
  async move(id: string, direction: "up" | "down", actorId: string) {
    return this.client.$transaction(async (tx) => {
      const reference = await tx.programDivision.findUnique({ where: { id }, select: { programId: true } });
      if (!reference) return false;
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "project_program" WHERE "id" = ${reference.programId} FOR UPDATE`);
      const division = await tx.programDivision.findUnique({ where: { id }, select: { id: true, programId: true, position: true } });
      if (!division) return false;
      const neighbor = await tx.programDivision.findFirst({ where: { programId: division.programId, position: direction === "up" ? { lt: division.position } : { gt: division.position } }, orderBy: { position: direction === "up" ? "desc" : "asc" } });
      if (!neighbor) return true;
      const last = await tx.programDivision.findFirst({ where: { programId: division.programId }, orderBy: { position: "desc" }, select: { position: true } });
      await tx.programDivision.update({ where: { id }, data: { position: (last?.position ?? 0) + 1 } });
      await tx.programDivision.update({ where: { id: neighbor.id }, data: { position: division.position } });
      await tx.programDivision.update({ where: { id }, data: { position: neighbor.position } });
      await tx.auditLog.create({ data: { actorId, action: "PROGRAM_DIVISION_UPDATED", targetType: "PROGRAM_DIVISION", targetId: id, metadata: { direction } } });
      return true;
    });
  }
  async impact(id: string): Promise<ProgramDivisionImpact | null> {
    const division = await this.client.programDivision.findUnique({ where: { id }, select: { programId: true, _count: { select: { topics: true } } } });
    if (!division) return null;
    const [voteCount, divisionCount, policy] = await Promise.all([this.client.projectVote.count({ where: { programId: division.programId } }), this.client.programDivision.count({ where: { programId: division.programId } }), this.client.programVotingPolicy.findUnique({ where: { programId: division.programId }, select: { voteLimitScope: true } })]);
    return { projectCount: division._count.topics, voteCount, switchesVotingScope: divisionCount === 1 && policy?.voteLimitScope === "DIVISION" };
  }
  async delete(id: string, actorId: string, confirmed: boolean, confirmedImpact?: ProgramDivisionImpact) {
    return this.client.$transaction(async (tx) => {
      const reference = await tx.programDivision.findUnique({ where: { id }, select: { programId: true } });
      if (!reference) return "NOT_FOUND" as const;
      const programs = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "project_program"
        WHERE "id" = ${reference.programId} FOR UPDATE
      `);
      if (!programs[0]) return "NOT_FOUND" as const;
      const division = await tx.programDivision.findUnique({ where: { id }, select: { id: true, programId: true, name: true, position: true, _count: { select: { topics: true } } } });
      if (!division) return "NOT_FOUND" as const;
      const teamIds = (await tx.projectTeam.findMany({ where: { project: { programId: division.programId, divisionId: id } }, select: { id: true } })).map((team) => team.id);
      if (teamIds.length && await tx.rubricScore.findFirst({ where: { evaluation: { projectTeamId: { in: teamIds } } }, select: { id: true } })) {
        return "SCORED_RUBRIC" as const;
      }
      const [voteCount, divisionCount, policy] = await Promise.all([tx.projectVote.count({ where: { programId: division.programId } }), tx.programDivision.count({ where: { programId: division.programId } }), tx.programVotingPolicy.findUnique({ where: { programId: division.programId } })]);
      const switchesVotingScope = divisionCount === 1 && policy?.voteLimitScope === "DIVISION";
      const impact = { projectCount: division._count.topics, voteCount, switchesVotingScope };
      const requiresConfirmation = Boolean(impact.projectCount || impact.voteCount || impact.switchesVotingScope);
      if (requiresConfirmation && (!confirmed || !isConfirmedImpact(confirmedImpact, impact))) return "CONFIRMATION_REQUIRED" as const;
      const customRubricIds = (await tx.rubricDefinition.findMany({ where: { programId: division.programId, divisionId: id }, select: { id: true } })).map((rubric) => rubric.id);
      if (customRubricIds.length) {
        await tx.projectTeamRubricEvaluation.deleteMany({ where: { rubricId: { in: customRubricIds } } });
        await tx.rubricDefinition.deleteMany({ where: { id: { in: customRubricIds } } });
      }
      await tx.topic.updateMany({ where: { programId: division.programId, divisionId: id }, data: { divisionId: null } });
      const commonRubricIds = (await tx.rubricDefinition.findMany({ where: { programId: division.programId, divisionId: null, archivedAt: null, legacy: false }, select: { id: true } })).map((rubric) => rubric.id);
      if (teamIds.length && commonRubricIds.length) {
        await tx.projectTeamRubricEvaluation.createMany({ data: teamIds.flatMap((projectTeamId) => commonRubricIds.map((rubricId) => ({ projectTeamId, rubricId }))), skipDuplicates: true });
      }
      if (voteCount) { await tx.projectVote.deleteMany({ where: { programId: division.programId } }); await tx.auditLog.create({ data: { actorId, action: "PROGRAM_VOTING_RESET", targetType: "PROJECT_PROGRAM", targetId: division.programId, metadata: { reason: "DIVISION_DELETED", voteCount } } }); }
      if (switchesVotingScope) await tx.programVotingPolicy.update({ where: { programId: division.programId }, data: { voteLimitScope: "PROGRAM" } });
      await tx.programDivision.delete({ where: { id } });
      const last = await tx.programDivision.findFirst({ where: { programId: division.programId }, orderBy: { position: "desc" }, select: { position: true } });
      const offset = (last?.position ?? division.position) + 1;
      await tx.programDivision.updateMany({ where: { programId: division.programId, position: { gt: division.position } }, data: { position: { increment: offset } } });
      await tx.programDivision.updateMany({ where: { programId: division.programId, position: { gt: division.position + offset } }, data: { position: { decrement: offset + 1 } } });
      await tx.auditLog.create({ data: { actorId, action: "PROGRAM_DIVISION_DELETED", targetType: "PROGRAM_DIVISION", targetId: id, metadata: { name: division.name, projectCount: division._count.topics, voteCount } } });
      return "DELETED" as const;
    });
  }
}

function isConfirmedImpact(expected: ProgramDivisionImpact | undefined, actual: ProgramDivisionImpact) {
  return expected?.projectCount === actual.projectCount &&
    expected.voteCount === actual.voteCount &&
    expected.switchesVotingScope === actual.switchesVotingScope;
}
