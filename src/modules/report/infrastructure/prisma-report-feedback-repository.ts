import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { teamSupervisorWhere } from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";
import type { ReportFeedbackWriter } from "@/modules/report/application/report-ports";

// 지도교수·조교·관리자만 피드백을 남길 수 있다.
function teamActorWhere(actor: CurrentActor): Prisma.ProjectTeamWhereInput {
  return {
    AND: [
      {
        project: {
          status: "ACTIVE",
        },
      },
      teamSupervisorWhere(actor),
    ],
  };
}

export class PrismaReportFeedbackRepository implements ReportFeedbackWriter {
  constructor(private readonly client: PrismaClient) {}

  async add(input: {
    reportId: string;
    actor: CurrentActor;
    body: string;
    createdAt: Date;
  }): Promise<boolean> {
    const report = await this.client.report.findFirst({
      where: { id: input.reportId, team: teamActorWhere(input.actor) },
      select: { id: true },
    });
    if (!report) return false;
    await this.client.reportFeedback.create({
      data: {
        id: randomUUID(),
        reportId: input.reportId,
        authorId: input.actor.id,
        body: input.body,
        createdAt: input.createdAt,
      },
    });
    return true;
  }
}
