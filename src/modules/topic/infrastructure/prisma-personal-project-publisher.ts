import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { activeProjectTeamMembershipInProgram } from "@/modules/project-team/domain/project-team-membership-scope";
import { assignProgramDeliverablesToTeam } from "@/modules/report/infrastructure/program-deliverable-assignment";
import type { PersonalProjectPublisher, PublishPersonalProjectOutcome } from "@/modules/topic/application/publish-personal-project";
import { enqueueTranslations } from "@/modules/translation/application/translation-queue";

type LockedProgram = {
  isPublic: boolean;
  endsAt: Date;
  projectRegistrationStartsAt: Date;
  projectRegistrationEndsAt: Date;
  studentProjectCreationEnabled: boolean;
  studentProjectInstantPublish: boolean;
  createdById: string | null;
};

/**
 * 승인 요청과 학생 팀을 거치지 않고 프로젝트를 공개하고 1인 팀을 확정한다.
 * 프로그램 행을 잠가 같은 학생이 두 번 눌러도 프로젝트가 하나만 생긴다.
 * 지원서 행은 만들지 않는다. 팀원 행의 sourceApplicationId 는 선택 칸이다.
 */
export class PrismaPersonalProjectPublisher implements PersonalProjectPublisher {
  constructor(private readonly client: PrismaClient) {}

  publish(input: Parameters<PersonalProjectPublisher["publish"]>[0]): Promise<PublishPersonalProjectOutcome> {
    return this.client.$transaction(async (transaction) => {
      const program = (await transaction.$queryRaw<LockedProgram[]>(Prisma.sql`
        SELECT "isPublic", "endsAt", "projectRegistrationStartsAt", "projectRegistrationEndsAt",
               "studentProjectCreationEnabled", "studentProjectInstantPublish", "createdById"
        FROM "project_program"
        WHERE "id" = ${input.programId}
        FOR UPDATE
      `))[0];
      if (
        !program ||
        !program.isPublic ||
        program.endsAt <= input.now ||
        program.projectRegistrationStartsAt > input.now ||
        program.projectRegistrationEndsAt <= input.now ||
        !program.studentProjectCreationEnabled ||
        !program.studentProjectInstantPublish
      ) return { status: "UNAVAILABLE" };

      const student = await transaction.user.findFirst({
        where: { id: input.studentId, role: "STUDENT", accountStatus: "ACTIVE" },
        select: { id: true },
      });
      if (!student) return { status: "UNAVAILABLE" };

      const divisions = await transaction.programDivision.findMany({ where: { programId: input.programId }, select: { id: true } });
      if (
        (divisions.length > 0 && !input.divisionId) ||
        (input.divisionId && !divisions.some(({ id }) => id === input.divisionId))
      ) return { status: "INVALID_DIVISION" };

      const existing = await transaction.projectTeamMembership.findFirst({
        where: { userId: input.studentId, ...activeProjectTeamMembershipInProgram(input.programId) },
        select: { id: true },
      });
      if (existing) return { status: "ALREADY_IN_PROGRAM" };

      // 담당자: 프로그램 담당자 중 활성 계정 첫 사람, 없으면 프로그램을 만든 관리자.
      const manager = await transaction.programManager.findFirst({
        where: { programId: input.programId, user: { accountStatus: "ACTIVE" } },
        orderBy: { createdAt: "asc" },
        select: { userId: true },
      });

      const projectId = randomUUID();
      const teamId = randomUUID();
      await transaction.topic.create({
        data: {
          id: projectId,
          programId: input.programId,
          divisionId: input.divisionId,
          authorId: input.studentId,
          managerId: manager?.userId ?? program.createdById,
          title: input.title,
          description: input.description,
          requiredSkills: [],
          preferredSkills: [],
          roleExpectations: "",
          availabilityRequirement: "",
          applicationMode: "TEAM_ONLY",
          recruitmentEnabled: false,
          capacity: 1,
          status: "ACTIVE",
          publishedAt: input.now,
          createdAt: input.now,
          updatedAt: input.now,
          projectTeam: {
            create: {
              id: teamId,
              name: input.title.slice(0, 100),
              confirmedAt: input.now,
              createdAt: input.now,
              updatedAt: input.now,
              memberships: { create: { userId: input.studentId, role: "LEADER", joinedAt: input.now } },
            },
          },
        },
      });
      if (input.repoUrl) {
        await transaction.artifact.create({
          data: {
            projectTeamId: teamId,
            registeredById: input.studentId,
            type: "SOURCE_CODE",
            title: "GitHub",
            externalUrl: input.repoUrl,
            createdAt: input.now,
          },
        });
      }
      // 프로젝트가 ACTIVE 가 된 뒤에 불러야 한다. 프로그램 행 잠금은 위에서 잡았다.
      await assignProgramDeliverablesToTeam(transaction, teamId, input.now);
      await enqueueTranslations(transaction, [input.title, input.description]);
      return { status: "PUBLISHED", projectId, teamId };
    });
  }
}
