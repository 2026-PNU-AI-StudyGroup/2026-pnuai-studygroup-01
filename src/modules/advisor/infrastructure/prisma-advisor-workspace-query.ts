import type { PrismaClient } from "@/generated/prisma/client";
import { findTeamRubric } from "@/modules/advisor/infrastructure/prisma-advisor-review-repository";

// 자문위원 담당 목록.
export async function listAssignedProjects(client: PrismaClient, advisorId: string) {
  const rows = await client.projectAdvisor.findMany({
    where: { userId: advisorId },
    orderBy: { createdAt: "asc" },
    select: {
      topic: {
        select: {
          id: true,
          title: true,
          program: { select: { id: true, name: true } },
          team: { select: { id: true, name: true, status: true } },
        },
      },
    },
  });
  return rows.map(({ topic }) => topic);
}

// 상세: 할당 검증 포함(비할당이면 null → notFound).
export async function findAssignedProject(client: PrismaClient, advisorId: string, topicId: string) {
  const assignment = await client.projectAdvisor.findUnique({
    where: { topicId_userId: { topicId, userId: advisorId } },
    select: {
      topic: {
        select: {
          id: true,
          title: true,
          description: true,
          program: { select: { id: true, name: true, endsAt: true } },
          team: {
            select: {
              id: true,
              name: true,
              showcaseIntro: true,
              artifacts: {
                orderBy: [{ position: "asc" }, { createdAt: "asc" }],
                select: { id: true, type: true, title: true, fileId: true, externalUrl: true, createdAt: true },
              },
              reports: {
                orderBy: { dueAt: "asc" },
                select: {
                  id: true,
                  titleSnapshot: true,
                  versions: {
                    orderBy: { version: "desc" },
                    take: 1,
                    select: { version: true, fileId: true, submittedAt: true, file: { select: { originalName: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  return assignment?.topic ?? null;
}

// 상세 화면 폼용: 팀 채점표 항목 + 이 위원이 이미 남긴 점수·피드백.
export async function findAdvisorReview(client: PrismaClient, advisorId: string, teamId: string) {
  const rubric = await findTeamRubric(client, teamId);
  const [evaluation, feedback] = await Promise.all([
    rubric
      ? client.advisorEvaluation.findUnique({
          where: { teamId_advisorId_rubricId: { teamId, advisorId, rubricId: rubric.id } },
          select: { scores: { select: { criterionId: true, points: true } } },
        })
      : null,
    client.advisorFeedback.findMany({
      where: { teamId, advisorId },
      orderBy: { createdAt: "desc" },
      select: { id: true, body: true, createdAt: true },
    }),
  ]);
  const points = new Map(evaluation?.scores.map((score) => [score.criterionId, score.points]) ?? []);
  return {
    criteria: rubric?.criteria.map((criterion) => ({ ...criterion, points: points.get(criterion.id) ?? null })) ?? null,
    feedback,
  };
}
