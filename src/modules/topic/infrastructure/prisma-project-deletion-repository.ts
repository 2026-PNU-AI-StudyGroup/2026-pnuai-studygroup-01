import type { PrismaClient } from "@/generated/prisma/client";
import type {
  DeleteProjectOutcome,
  ProjectDeletionWriter,
} from "@/modules/topic/application/delete-project";

export class PrismaProjectDeletionRepository implements ProjectDeletionWriter {
  constructor(private readonly client: PrismaClient) {}

  async findTitle(projectId: string): Promise<string | null> {
    const topic = await this.client.topic.findUnique({
      where: { id: projectId },
      select: { title: true },
    });
    return topic?.title ?? null;
  }

  delete(input: {
    projectId: string;
    actorId: string;
    reason: string;
    deletedAt: Date;
  }): Promise<DeleteProjectOutcome> {
    return this.client.$transaction(async (transaction) => {
      const topic = await transaction.topic.findUnique({
        where: { id: input.projectId },
        select: {
          title: true,
          status: true,
          program: { select: { id: true, name: true } },
          projectTeam: {
            select: {
              name: true,
              confirmedAt: true,
              _count: { select: { memberships: true, storedFiles: true } },
            },
          },
        },
      });
      if (!topic) return "NOT_FOUND";

      // 지운 흔적을 먼저 남긴다. 삭제가 실패하면 같은 트랜잭션에서 함께 되돌아간다.
      await transaction.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "TOPIC_DELETED",
          targetType: "TOPIC",
          targetId: input.projectId,
          metadata: {
            title: topic.title,
            status: topic.status,
            programId: topic.program.id,
            programName: topic.program.name,
            teamName: topic.projectTeam?.name ?? null,
            teamConfirmed: Boolean(topic.projectTeam?.confirmedAt),
            memberCount: topic.projectTeam?._count.memberships ?? 0,
            fileCount: topic.projectTeam?._count.storedFiles ?? 0,
            reviewComment: input.reason,
          },
          createdAt: input.deletedAt,
        },
      });

      // 삭제 제한(Restrict)이 걸린 순서를 지켜야 한다.
      // 팀원이 지원서를 참조하므로 팀을 먼저 지우고(팀원·파일·보고서는 함께 사라진다),
      // 그다음 지원서를 지우고, 마지막에 프로젝트를 지운다.
      await transaction.projectTeam.deleteMany({ where: { projectId: input.projectId } });
      await transaction.topicApplication.deleteMany({ where: { topicId: input.projectId } });
      await transaction.topic.delete({ where: { id: input.projectId } });
      return "DELETED";
    });
  }
}
