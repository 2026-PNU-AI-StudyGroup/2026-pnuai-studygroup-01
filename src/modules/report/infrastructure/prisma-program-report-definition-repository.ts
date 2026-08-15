import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  ProgramReportDefinitionOutcome,
  ProgramReportDefinitionWriter,
} from "@/modules/report/application/manage-program-report-definitions";

export class PrismaProgramReportDefinitionRepository implements ProgramReportDefinitionWriter {
  constructor(private readonly client: PrismaClient) {}

  create(input: { programId: string; title: string; dueAt: Date; actorId: string; now: Date }) {
    return this.client.$transaction(async (tx): Promise<ProgramReportDefinitionOutcome> => {
      const program = await lockProgram(tx, input.programId);
      if (!program) return "NOT_FOUND";
      if (!validDeadline(input.dueAt, input.now, program.submissionStartsAt, program.submissionEndsAt)) return "INVALID_DEADLINE";
      if (await duplicateTitle(tx, input.programId, input.title)) return "DUPLICATE";
      const last = await tx.programReportDefinition.findFirst({ where: { programId: input.programId, archivedAt: null }, orderBy: { position: "desc" }, select: { position: true } });
      const definition = await tx.programReportDefinition.create({
        data: { programId: input.programId, title: input.title, dueAt: input.dueAt, position: (last?.position ?? -1) + 1 },
      });
      const teams = await tx.projectTeam.findMany({ where: { project: { programId: input.programId, status: "ACTIVE" } }, select: { id: true } });
      if (teams.length) {
        await tx.report.createMany({
          data: teams.map(({ id: projectTeamId }) => ({ projectTeamId, definitionId: definition.id, titleSnapshot: input.title, dueAt: input.dueAt, required: true })),
        });
      }
      await tx.auditLog.create({ data: { actorId: input.actorId, action: "PROGRAM_REPORT_DEFINITION_CREATED", targetType: "PROJECT_PROGRAM", targetId: input.programId, metadata: { definitionId: definition.id, title: input.title, dueAt: input.dueAt.toISOString() } } });
      return "CREATED";
    });
  }

  update(input: { definitionId: string; title: string; dueAt: Date; actorId: string; now: Date }) {
    return this.client.$transaction(async (tx): Promise<ProgramReportDefinitionOutcome> => {
      const reference = await tx.programReportDefinition.findUnique({ where: { id: input.definitionId }, select: { programId: true } });
      if (!reference) return "NOT_FOUND";
      const program = await lockProgram(tx, reference.programId);
      if (!program) return "NOT_FOUND";
      const current = await tx.programReportDefinition.findUnique({ where: { id: input.definitionId }, select: { id: true, title: true, dueAt: true, archivedAt: true } });
      if (!current || current.archivedAt) return "NOT_FOUND";
      if (!validDeadline(input.dueAt, input.now, program.submissionStartsAt, program.submissionEndsAt)) return "INVALID_DEADLINE";
      if (await duplicateTitle(tx, reference.programId, input.title, current.id)) return "DUPLICATE";
      const latestSubmission = await tx.reportVersion.findFirst({ where: { report: { definitionId: current.id } }, orderBy: { submittedAt: "desc" }, select: { submittedAt: true } });
      if (current.title !== input.title && latestSubmission) return "TITLE_LOCKED";
      if (latestSubmission && input.dueAt < latestSubmission.submittedAt) return "SUBMISSION_CONFLICT";
      await tx.programReportDefinition.update({ where: { id: current.id }, data: { title: input.title, dueAt: input.dueAt } });
      await tx.report.updateMany({
        where: { definitionId: current.id, required: true, projectTeam: { project: { status: "ACTIVE" } } },
        data: { titleSnapshot: input.title, dueAt: input.dueAt },
      });
      await tx.auditLog.create({ data: { actorId: input.actorId, action: "PROGRAM_REPORT_DEFINITION_UPDATED", targetType: "PROJECT_PROGRAM", targetId: reference.programId, metadata: { definitionId: current.id, from: { title: current.title, dueAt: current.dueAt.toISOString() }, to: { title: input.title, dueAt: input.dueAt.toISOString() } } } });
      return "UPDATED";
    });
  }

  move(input: { definitionId: string; direction: "up" | "down"; actorId: string }) {
    return this.client.$transaction(async (tx): Promise<ProgramReportDefinitionOutcome> => {
      const reference = await tx.programReportDefinition.findUnique({ where: { id: input.definitionId }, select: { programId: true } });
      if (!reference) return "NOT_FOUND";
      const program = await lockProgram(tx, reference.programId);
      if (!program) return "NOT_FOUND";
      const current = await tx.programReportDefinition.findUnique({ where: { id: input.definitionId }, select: { id: true, position: true, archivedAt: true } });
      if (!current || current.archivedAt) return "NOT_FOUND";
      const neighbor = await tx.programReportDefinition.findFirst({
        where: { programId: reference.programId, archivedAt: null, position: input.direction === "up" ? { lt: current.position } : { gt: current.position } },
        orderBy: { position: input.direction === "up" ? "desc" : "asc" },
        select: { id: true, position: true },
      });
      if (neighbor) {
        const temporary = Math.max(current.position, neighbor.position) + 1_000_000;
        await tx.programReportDefinition.update({ where: { id: current.id }, data: { position: temporary } });
        await tx.programReportDefinition.update({ where: { id: neighbor.id }, data: { position: current.position } });
        await tx.programReportDefinition.update({ where: { id: current.id }, data: { position: neighbor.position } });
        await tx.auditLog.create({ data: { actorId: input.actorId, action: "PROGRAM_REPORT_DEFINITION_UPDATED", targetType: "PROJECT_PROGRAM", targetId: reference.programId, metadata: { definitionId: current.id, position: { from: current.position, to: neighbor.position } } } });
      }
      return "UPDATED";
    });
  }

  archive(input: { definitionId: string; actorId: string; now: Date }) {
    return this.client.$transaction(async (tx): Promise<ProgramReportDefinitionOutcome> => {
      const reference = await tx.programReportDefinition.findUnique({ where: { id: input.definitionId }, select: { programId: true } });
      if (!reference) return "NOT_FOUND";
      const program = await lockProgram(tx, reference.programId);
      if (!program) return "NOT_FOUND";
      const current = await tx.programReportDefinition.findUnique({ where: { id: input.definitionId }, select: { id: true, title: true, archivedAt: true } });
      if (!current || current.archivedAt) return "NOT_FOUND";
      const versionCount = await tx.reportVersion.count({ where: { report: { definitionId: current.id } } });
      if (!versionCount) {
        await tx.report.deleteMany({ where: { definitionId: current.id } });
        await tx.programReportDefinition.delete({ where: { id: current.id } });
      } else {
        await tx.programReportDefinition.update({ where: { id: current.id }, data: { archivedAt: input.now } });
        await tx.report.updateMany({ where: { definitionId: current.id, projectTeam: { project: { status: "ACTIVE" } } }, data: { required: false } });
      }
      await tx.auditLog.create({ data: { actorId: input.actorId, action: "PROGRAM_REPORT_DEFINITION_ARCHIVED", targetType: "PROJECT_PROGRAM", targetId: reference.programId, metadata: { definitionId: current.id, title: current.title, retainedHistory: versionCount > 0 } } });
      return "ARCHIVED";
    });
  }
}

async function lockProgram(tx: Prisma.TransactionClient, programId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string; submissionStartsAt: Date; submissionEndsAt: Date }>>(Prisma.sql`
    SELECT "id", "submissionStartsAt", "submissionEndsAt"
    FROM "project_program" WHERE "id" = ${programId} FOR UPDATE
  `);
  return rows[0] ?? null;
}

function validDeadline(dueAt: Date, _now: Date, startsAt: Date, endsAt: Date) {
  return dueAt >= startsAt && dueAt <= endsAt;
}

function duplicateTitle(tx: Prisma.TransactionClient, programId: string, title: string, excludingId?: string) {
  return tx.programReportDefinition.findFirst({
    where: { programId, archivedAt: null, title: { equals: title, mode: "insensitive" }, ...(excludingId ? { id: { not: excludingId } } : {}) },
    select: { id: true },
  });
}
