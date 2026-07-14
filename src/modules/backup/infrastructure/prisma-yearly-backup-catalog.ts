import type { PrismaClient } from "@/generated/prisma/client";
import type {
  BackupProject,
  YearlyBackupCatalog,
} from "@/modules/backup/application/create-yearly-backup";

export class PrismaYearlyBackupCatalog implements YearlyBackupCatalog {
  constructor(private readonly client: PrismaClient) {}

  async listClosedProjects(academicYear: number): Promise<BackupProject[]> {
    const teams = await this.client.team.findMany({
      where: {
        status: "CLOSED",
        topic: { academicCycle: { academicYear } },
      },
      orderBy: [
        { topic: { academicCycle: { term: "asc" } } },
        { name: "asc" },
        { id: "asc" },
      ],
      select: {
        id: true,
        name: true,
        topic: {
          select: {
            title: true,
            description: true,
            author: { select: { name: true } },
            academicCycle: { select: { term: true } },
          },
        },
        members: {
          orderBy: { joinedAt: "asc" },
          select: { student: { select: { name: true } } },
        },
        artifacts: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            type: true,
            title: true,
            externalUrl: true,
            file: {
              select: {
                objectKey: true,
                originalName: true,
                contentType: true,
                size: true,
                sha256: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return teams.map((team) => ({
      id: team.id,
      term: team.topic.academicCycle.term,
      teamName: team.name,
      topicTitle: team.topic.title,
      topicDescription: team.topic.description,
      professorName: team.topic.author.name,
      memberNames: team.members.map(({ student }) => student.name),
      artifacts: team.artifacts.map(({ file, ...artifact }) => ({
        id: artifact.id,
        type: artifact.type,
        title: artifact.title,
        externalUrl: artifact.externalUrl ?? undefined,
        file: file?.status === "ATTACHED" ? {
          objectKey: file.objectKey,
          originalName: file.originalName,
          contentType: file.contentType,
          size: file.size,
          sha256: file.sha256,
        } : undefined,
      })),
    }));
  }
}
