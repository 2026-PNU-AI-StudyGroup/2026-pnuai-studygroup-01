import type { PrismaClient } from "@/generated/prisma/client";
import { enqueueEmailEvents } from "@/modules/email/infrastructure/email-events";

/**
 * 마감일이 지난 모집 공고를 닫는다.
 *
 * 팀장이 직접 닫는 경로와 정원이 차서 닫히는 경로는 대기 지원자에게 "모집이 종료되었습니다"
 * 를 알린다. 마감일로 끝나는 경로만 아무 일도 하지 않아, `status` 는 영원히 `OPEN` 으로
 * 남고 지원자는 알림을 못 받았다. 세 경로가 같은 끝 상태에 도달하게 맞춘다.
 *
 * 대기 지원을 REJECTED 로 바꾸지 않는 것은 기존 두 경로와 같다. 팀장이 실제로 거절한 것과
 * 공고가 끝나 끊긴 것을 구분해야 하고, 읽는 쪽이 `recruitmentApplicationState` 로 "모집 종료"
 * 를 계산한다.
 *
 * 알림 dedupeKey 는 직접 종료 경로와 같은 값을 쓴다. 같은 지원에 두 경로가 겹쳐도 알림이
 * 두 번 가지 않는다.
 */
export async function closeLapsedRecruitmentPosts(client: PrismaClient, now: Date): Promise<number> {
  const lapsed = await client.studentTeamRecruitmentPost.findMany({
    where: { status: "OPEN", deadlineAt: { lte: now } },
    orderBy: [{ deadlineAt: "asc" }, { id: "asc" }],
    select: { id: true, title: true },
  });
  let closed = 0;
  for (const post of lapsed) {
    const done = await client.$transaction(async (transaction) => {
      const updated = await transaction.studentTeamRecruitmentPost.updateMany({
        where: { id: post.id, status: "OPEN", deadlineAt: { lte: now } },
        data: { status: "CLOSED", updatedAt: now },
      });
      if (updated.count !== 1) return false;
      const pending = await transaction.studentTeamRecruitmentApplication.findMany({
        where: { postId: post.id, status: "PENDING" },
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
            createdAt: now,
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
          createdAt: now,
        })));
      }
      return true;
    });
    if (done) closed += 1;
  }
  return closed;
}
