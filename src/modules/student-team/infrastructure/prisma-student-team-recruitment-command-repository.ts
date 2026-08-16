import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { RecruitmentContactKind, SharedRecruitmentContacts, StudentTeamRecruitmentWriter } from "@/modules/student-team/application/manage-student-team-recruitment";
import { enqueueTranslations } from "@/modules/translation/application/translation-queue";
import { enqueueEmailEvents } from "@/modules/email/infrastructure/email-events";

export class PrismaStudentTeamRecruitmentCommandRepository
  implements StudentTeamRecruitmentWriter
{
  constructor(private readonly client: PrismaClient) {}

  createPost(input: {
    teamId: string;
    leaderId: string;
    title: string;
    content: string;
    requiredSkills: string[];
    roleNeeded: string;
    availability: string;
    capacity: number;
    deadlineAt: Date;
    createdAt: Date;
  }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const teams = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "student_team" WHERE "id" = ${input.teamId}
          AND "leaderId" = ${input.leaderId} AND "deletedAt" IS NULL FOR UPDATE
      `);
      if (
        !teams[0] ||
        await transaction.studentTeamMember.count({
          where: { teamId: input.teamId },
        }) >= input.capacity
      ) {
        return false;
      }
      const { leaderId, ...postData } = input;
      await transaction.studentTeamRecruitmentPost.create({
        data: { id: randomUUID(), authorId: leaderId, ...postData },
      });
      await enqueueTranslations(transaction, [
        input.title,
        input.content,
        ...input.requiredSkills,
        input.roleNeeded,
        input.availability,
      ]);
      return true;
    });
  }

  apply(input: {
    postId: string;
    studentId: string;
    message: string;
    desiredRole: string;
    sharedContactKinds: RecruitmentContactKind[];
    appliedAt: Date;
  }): Promise<"CREATED" | "UNAVAILABLE" | "ALREADY_APPLIED" | "ALREADY_MEMBER"> {
    return this.client.$transaction(async (transaction) => {
      const posts = await transaction.$queryRaw<Array<{
        id: string;
        teamId: string;
        capacity: number;
        leaderId: string;
        title: string;
      }>>(Prisma.sql`
        SELECT "student_team_recruitment_post"."id", "teamId", "capacity", "student_team"."leaderId", "student_team_recruitment_post"."title"
        FROM "student_team_recruitment_post"
        JOIN "student_team" ON "student_team"."id" = "student_team_recruitment_post"."teamId"
        WHERE "student_team_recruitment_post"."id" = ${input.postId}
          AND "student_team_recruitment_post"."status" = 'OPEN'
          AND "student_team_recruitment_post"."deadlineAt" > ${input.appliedAt}
          AND "student_team"."deletedAt" IS NULL
        FOR UPDATE OF "student_team_recruitment_post", "student_team"
      `);
      const post = posts[0];
      if (
        !post ||
        await transaction.studentTeamMember.count({
          where: { teamId: post.teamId },
        }) >= post.capacity
      ) {
        return "UNAVAILABLE";
      }
      if (
        await transaction.studentTeamMember.findUnique({
          where: {
            teamId_studentId: {
              teamId: post.teamId,
              studentId: input.studentId,
            },
          },
          select: { id: true },
        })
      ) {
        return "ALREADY_MEMBER";
      }
      if (
        await transaction.studentTeamRecruitmentApplication.findUnique({
          where: {
            postId_studentId: {
              postId: input.postId,
              studentId: input.studentId,
            },
          },
          select: { id: true },
        })
      ) {
        return "ALREADY_APPLIED";
      }
      const { appliedAt, sharedContactKinds, ...applicationData } = input;
      const profile = await transaction.studentProfile.findUnique({
        where: { userId: input.studentId },
        select: { phone: true, kakao: true, github: true, instagram: true },
      });
      const sharedContacts = Object.fromEntries(
        sharedContactKinds
          .map((kind) => [kind, profile?.[kind].trim() ?? ""] as const)
          .filter(([, value]) => Boolean(value)),
      ) as SharedRecruitmentContacts;
      const applicationId = randomUUID();
      await transaction.studentTeamRecruitmentApplication.create({
        data: {
          id: applicationId,
          ...applicationData,
          sharedContacts,
          createdAt: appliedAt,
          updatedAt: appliedAt,
        },
      });
      await enqueueTranslations(transaction, [
        input.message,
        input.desiredRole,
      ]);
      const notifications = [
        {
          recipientId: post.leaderId,
          title: "팀원 모집 지원이 도착했습니다",
          body: `${post.title} 모집 지원서를 확인해 주세요.`,
          titleEn: "New team recruitment application",
          bodyEn: `Review the application for ${post.title} in PMS.`,
          href: `/recruitments/received#application-${applicationId}`,
          key: `student-team-recruitment-application:${applicationId}:${post.leaderId}`,
        },
        {
          recipientId: input.studentId,
          title: "팀원 모집 지원이 접수되었습니다",
          body: `${post.title} 모집 지원이 접수되었습니다. 결과는 PMS에서 안내합니다.`,
          titleEn: "Team recruitment application received",
          bodyEn: `Your application for ${post.title} was received. PMS will provide the result.`,
          href: "/recruitments/applications",
          key: `student-team-recruitment-receipt:${applicationId}:${input.studentId}`,
        },
      ];
      await transaction.notification.createMany({
        data: notifications.map(({ recipientId, title, body, href, key }) => ({ recipientId, type: "SYSTEM" as const, title, body, href, dedupeKey: key, createdAt: input.appliedAt })),
        skipDuplicates: true,
      });
      await enqueueEmailEvents(transaction, notifications.map(({ recipientId, title, body, titleEn, bodyEn, href, key }) => ({
        kind: "RECRUITMENT_APPLICATION" as const,
        recipientId,
        title,
        body,
        titleEn,
        bodyEn,
        href,
        idempotencyKey: `email:${key}`,
        createdAt: input.appliedAt,
      })));
      return "CREATED";
    });
  }

  decide(input: {
    applicationId: string;
    actorId: string;
    isAdmin: boolean;
    decision: "ACCEPT" | "REJECT";
    decidedAt: Date;
  }): Promise<"ACCEPTED" | "REJECTED" | "UNAVAILABLE" | "FORBIDDEN"> {
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{
        id: string;
        studentId: string;
        postId: string;
        teamId: string;
        leaderId: string;
        capacity: number;
        status: string;
        title: string;
      }>>(Prisma.sql`
        SELECT a."id", a."studentId", a."postId", p."teamId", t."leaderId", p."capacity", a."status", p."title"
        FROM "student_team_recruitment_application" a
        JOIN "student_team_recruitment_post" p ON p."id" = a."postId"
        JOIN "student_team" t ON t."id" = p."teamId"
        JOIN "user" applicant ON applicant."id" = a."studentId"
        WHERE a."id" = ${input.applicationId} AND t."deletedAt" IS NULL
          AND p."status" = 'OPEN'
          AND p."deadlineAt" > ${input.decidedAt}
          AND applicant."role" = 'STUDENT'
          AND applicant."accountStatus" = 'ACTIVE'
        FOR UPDATE OF a, p, t
      `);
      const target = rows[0];
      if (!target || target.status !== "PENDING") return "UNAVAILABLE";
      if (!input.isAdmin && target.leaderId !== input.actorId) {
        return "FORBIDDEN";
      }
      if (input.decision === "REJECT") {
        await transaction.studentTeamRecruitmentApplication.update({
          where: { id: target.id },
          data: { status: "REJECTED", decidedAt: input.decidedAt },
        });
        await notifyRecruitmentResult(transaction, target.studentId, target.id, target.title, "REJECTED", input.decidedAt);
        return "REJECTED";
      }
      if (
        await transaction.studentTeamMember.count({
          where: { teamId: target.teamId },
        }) >= target.capacity
      ) {
        return "UNAVAILABLE";
      }
      await transaction.studentTeamMember.upsert({
        where: {
          teamId_studentId: {
            teamId: target.teamId,
            studentId: target.studentId,
          },
        },
        create: {
          id: randomUUID(),
          teamId: target.teamId,
          studentId: target.studentId,
          role: "MEMBER",
          joinedAt: input.decidedAt,
        },
        update: {},
      });
      await transaction.studentTeamRecruitmentApplication.update({
        where: { id: target.id },
        data: { status: "ACCEPTED", decidedAt: input.decidedAt },
      });
      await transaction.studentTeam.update({
        where: { id: target.teamId },
        data: { compositionVersion: { increment: 1 }, updatedAt: input.decidedAt },
      });
      // 정원이 찬 이 팀의 모든 OPEN 모집 공고를 닫는다. 대기 지원은 모집 종료로
      // 조회해 실제 거절과 자동 종료를 구분한다.
      const memberCount = await transaction.studentTeamMember.count({
        where: { teamId: target.teamId },
      });
      const filledPosts = await transaction.studentTeamRecruitmentPost.findMany({
        where: { teamId: target.teamId, status: "OPEN", capacity: { lte: memberCount } },
        select: { id: true },
      });
      if (filledPosts.length) {
        const filledPostIds = filledPosts.map(({ id }) => id);
        await transaction.studentTeamRecruitmentPost.updateMany({
          where: { id: { in: filledPostIds } },
          data: { status: "CLOSED" },
        });
        const pending = await transaction.studentTeamRecruitmentApplication.findMany({
          where: { postId: { in: filledPostIds }, status: "PENDING" },
          select: { id: true, studentId: true, post: { select: { title: true } } },
        });
        if (pending.length) {
          await transaction.notification.createMany({
            data: pending.map((application) => ({
              recipientId: application.studentId,
              type: "SYSTEM" as const,
              title: "팀원 모집이 종료되었습니다",
              body: `${application.post.title} 모집이 종료되었습니다.`,
              href: "/recruitments/applications",
              dedupeKey: `student-team-recruitment-closed:${application.id}`,
              createdAt: input.decidedAt,
            })),
            skipDuplicates: true,
          });
          await enqueueEmailEvents(transaction, pending.map((application) => ({
            kind: "RECRUITMENT_RESULT" as const,
            recipientId: application.studentId,
            title: "팀원 모집이 종료되었습니다",
            body: `${application.post.title} 모집이 종료되었습니다.`,
            titleEn: "Team recruitment closed",
            bodyEn: `Recruitment for ${application.post.title} has closed.`,
            href: "/recruitments/applications",
            idempotencyKey: `email:student-team-recruitment-closed:${application.id}`,
            createdAt: input.decidedAt,
          })));
        }
      }
      await notifyRecruitmentResult(transaction, target.studentId, target.id, target.title, "ACCEPTED", input.decidedAt);
      return "ACCEPTED";
    });
  }

  closePost(input: { postId: string; leaderId: string; closedAt: Date }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const post = await transaction.studentTeamRecruitmentPost.findFirst({
        where: { id: input.postId, status: "OPEN", team: { leaderId: input.leaderId, deletedAt: null } },
        select: { title: true },
      });
      if (!post) return false;
      const updated = await transaction.studentTeamRecruitmentPost.updateMany({
        where: {
          id: input.postId,
          status: "OPEN",
          team: { leaderId: input.leaderId, deletedAt: null },
        },
        data: { status: "CLOSED", updatedAt: input.closedAt },
      });
      if (updated.count !== 1) return false;
      const pending = await transaction.studentTeamRecruitmentApplication.findMany({
        where: { postId: input.postId, status: "PENDING" },
        select: { id: true, studentId: true },
      });
      if (pending.length) {
        await transaction.notification.createMany({
          data: pending.map((application) => ({
            recipientId: application.studentId,
            type: "SYSTEM" as const,
            title: "팀원 모집이 종료되었습니다",
            body: `${post.title} 모집이 종료되었습니다.`,
            href: "/recruitments/applications",
            dedupeKey: `student-team-recruitment-closed:${application.id}`,
            createdAt: input.closedAt,
          })),
          skipDuplicates: true,
        });
        await enqueueEmailEvents(transaction, pending.map((application) => ({
          kind: "RECRUITMENT_RESULT" as const,
          recipientId: application.studentId,
          title: "팀원 모집이 종료되었습니다",
          body: `${post.title} 모집이 종료되었습니다.`,
          titleEn: "Team recruitment closed",
          bodyEn: `Recruitment for ${post.title} has closed.`,
          href: "/recruitments/applications",
          idempotencyKey: `email:student-team-recruitment-closed:${application.id}`,
          createdAt: input.closedAt,
        })));
      }
      return true;
    });
  }
}

async function notifyRecruitmentResult(
  transaction: Prisma.TransactionClient,
  recipientId: string,
  applicationId: string,
  postTitle: string,
  decision: "ACCEPTED" | "REJECTED",
  createdAt: Date,
) {
  const accepted = decision === "ACCEPTED";
  const title = accepted ? "팀원 모집에 선정되었습니다" : "팀원 모집 결과 안내";
  const body = accepted
    ? `${postTitle} 모집에 선정되었습니다. 팀 구성을 확인해 주세요.`
    : `${postTitle} 모집에 선정되지 않았습니다.`;
  const titleEn = accepted ? "Selected for team recruitment" : "Team recruitment result";
  const bodyEn = accepted
    ? `You were selected for ${postTitle}. Review the team composition in PMS.`
    : `You were not selected for ${postTitle}.`;
  await transaction.notification.create({
    data: {
      recipientId,
      type: "SYSTEM",
      title,
      body,
      href: "/recruitments/applications",
      dedupeKey: `student-team-recruitment-result:${applicationId}:${decision}`,
      createdAt,
    },
  });
  await enqueueEmailEvents(transaction, [{
    kind: "RECRUITMENT_RESULT",
    recipientId,
    title,
    body,
    titleEn,
    bodyEn,
    href: "/recruitments/applications",
    idempotencyKey: `email:student-team-recruitment-result:${applicationId}:${decision}`,
    createdAt,
  }]);
}
