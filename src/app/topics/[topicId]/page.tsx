import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EditorialProjectCover } from "@/app/topics/[topicId]/_components/editorial-project-cover";
import { TopicApplicationEditor } from "@/app/topics/[topicId]/_components/topic-application-editor";
import { ProjectDetailShell } from "@/app/topics/_components/project-detail-shell";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListOwnTopicApplicationsService } from "@/modules/topic-application/application/list-own-topic-applications";
import { TeamApplicationInvitationService } from "@/modules/topic-application/application/manage-team-application-invitations";
import { PrismaTeamApplicationInvitationRepository } from "@/modules/topic-application/infrastructure/prisma-team-application-invitation-repository";
import { PrismaTopicApplicationQueryRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-query-repository";
import { ListPublishedTopicsService } from "@/modules/topic/application/list-published-topics";
import { PrismaTopicRepository } from "@/modules/topic/infrastructure/prisma-topic-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { PrismaStudentTeamRecruitmentRepository } from "@/modules/student-team/infrastructure/prisma-student-team-recruitment-repository";
import { AppShell } from "@/app/_components/app-shell";
import { StatusBadge } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/shared/ui/translated-text";

export const metadata: Metadata = { title: "프로젝트 상세" };

const dateTime = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });
const applicationStatus = { PENDING: ["검토 중", "info"], ACCEPTED: ["선정", "success"], REJECTED: ["미선정", "neutral"] } as const;

function Period({ label, startsAt, endsAt }: { label: string; startsAt: Date; endsAt: Date }) {
  return <div className="grid gap-1 border-t border-[var(--line)] py-4 first:border-t-0"><dt className="text-xs font-bold text-[var(--muted)]">{label}</dt><dd className="leading-6"><time dateTime={startsAt.toISOString()}>{dateTime.format(startsAt)}</time><span aria-hidden="true"> – </span><span className="sr-only">부터 </span><time dateTime={endsAt.toISOString()}>{dateTime.format(endsAt)}</time></dd></div>;
}

export default async function TopicDetailPage({ params }: { params: Promise<{ topicId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { topicId } = await params;
  const topic = await new ListPublishedTopicsService(new PrismaTopicRepository(prisma)).find(topicId);
  if (!topic) notFound();
  const applicationService = new ListOwnTopicApplicationsService(
    new PrismaTopicApplicationQueryRepository(prisma),
  );
  const [application, teamApplicationState, leaderTeams] = actor.role === "STUDENT" ? await Promise.all([
    applicationService.findForTopic(actor, topic.id),
    new TeamApplicationInvitationService(
      new PrismaTeamApplicationInvitationRepository(prisma),
    ).list(actor),
    new PrismaStudentTeamRecruitmentRepository(prisma).listLeaderTeams(actor.id),
  ]) : [null, null, []];
  const awaitingTeam = teamApplicationState?.drafts.some((draft) => draft.topicId === topic.id) ?? false;
  const now = new Date();
  const recruiting = topic.recruitmentStartsAt <= now && topic.recruitmentEndsAt > now && topic.memberCount < topic.capacity;
  const daysUntilDeadline = Math.max(0, Math.ceil((topic.recruitmentEndsAt.getTime() - now.getTime()) / 86_400_000));

  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={`/topics/${topic.id}`}><main className="content-shell">
    <nav aria-label="이전 위치" className="mb-5">
      <Link href="/topics" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)]">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-[1.75]"><path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        프로젝트 탐색
      </Link>
    </nav>

    <ProjectDetailShell
      cover={<EditorialProjectCover id={topic.id} label={`${topic.programCategory} · ${topic.programName}`} />}
      marker={
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-none stroke-current stroke-[1.75]"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.4-4.2 2.7-6.2 7-6.2s6.6 2 7 6.2" /></svg>
      }
      heading={
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold text-[var(--muted)]">{topic.authorName}{topic.authorRole === "PROFESSOR" ? " 교수" : " · 학생 제안"}</p>
            <StatusBadge tone={recruiting ? "success" : "neutral"}>{recruiting ? `모집 중 · D-${daysUntilDeadline}` : "모집 전·종료"}</StatusBadge>
          </div>
          <h1 className="mt-4 max-w-4xl text-[clamp(2.45rem,5vw,4.25rem)] font-black leading-[1.03] tracking-[-0.055em]">{topic.title}</h1>
        </div>
      }
      headerAside={
        <>
          <dl className="flex items-end justify-between gap-5">
            <div><dt className="text-xs font-bold text-[var(--muted)]">현재 참여</dt><dd className="mt-1 text-2xl font-black">{topic.memberCount} / {topic.capacity}명</dd></div>
            <div className="text-right"><dt className="text-xs font-bold text-[var(--muted)]">모집 마감</dt><dd className="mt-1 text-sm font-bold">{dateTime.format(topic.recruitmentEndsAt)}</dd></div>
          </dl>
          <div className="mt-5">
            {application ? <Link href="/topics/applications" className="button-secondary w-full">지원 상태 · {applicationStatus[application.status][0]}</Link>
              : awaitingTeam ? <Link href="/topics/applications" className="button-secondary w-full">팀원 수락 상태 확인</Link>
                : actor.role === "STUDENT" && recruiting ? <TopicApplicationEditor topicId={topic.id} topicTitle={topic.title} applicationMode={topic.applicationMode} applicationQuestions={topic.applicationQuestions} capacity={topic.capacity} leaderTeams={leaderTeams} />
                  : null}
          </div>
        </>
      }
      railLabelledBy="topic-schedule"
      rail={
        <>
          <h2 id="topic-schedule" className="text-xl font-black">프로젝트 일정</h2>
          <dl className="mt-5"><Period label="모집 기간" startsAt={topic.recruitmentStartsAt} endsAt={topic.recruitmentEndsAt} /><Period label="수행 기간" startsAt={topic.executionStartsAt} endsAt={topic.executionEndsAt} /><Period label="제출 기간" startsAt={topic.submissionStartsAt} endsAt={topic.submissionEndsAt} /></dl>
        </>
      }
    >
      <div className="space-y-12">
        <section aria-labelledby="topic-description">
          <h2 id="topic-description" className="text-2xl font-black tracking-[-0.035em]">프로젝트 소개</h2>
          <TranslatedText text={topic.description} className="mt-5 max-w-3xl whitespace-pre-wrap text-[1.05rem] leading-8 text-[var(--muted)]" />
        </section>

        <section aria-labelledby="topic-requirements">
          <h2 id="topic-requirements" className="text-2xl font-black tracking-[-0.035em]">함께할 사람</h2>
          <dl className="mt-5 border-y border-[var(--line)]">
            {[
              ["필수 기술", topic.requiredSkills.join(", ") || "별도 조건 없음"],
              ["우대 기술", topic.preferredSkills.join(", ") || "별도 조건 없음"],
              ["기대 역할", topic.roleExpectations],
              ["활동 조건", topic.availabilityRequirement],
            ].map(([label, value]) => (
              <div key={label} className="grid gap-2 border-t border-[var(--line)] py-5 first:border-t-0 sm:grid-cols-[8rem_minmax(0,1fr)]">
                <dt className="text-sm font-bold text-[var(--muted)]">{label}</dt>
                <dd className="font-semibold leading-7">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </ProjectDetailShell>
  </main></AppShell>;
}
