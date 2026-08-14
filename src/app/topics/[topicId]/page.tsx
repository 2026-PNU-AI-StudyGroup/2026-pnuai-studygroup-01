import Link from "next/link";
import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { EditorialProjectCover } from "@/app/topics/[topicId]/_components/editorial-project-cover";
import { TopicApplicationEditor } from "@/app/topics/_components/topic-application-editor";
import { ProjectDetailShell } from "@/app/topics/_components/project-detail-shell";
import { ExplorerLayout } from "@/shared/ui/explorer-layout";
import { ProgramSidebar } from "@/app/topics/_components/program-sidebar";
import { loadProgramSidebarItems } from "@/app/topics/_lib/load-program-sidebar-items";
import { buildAdminProgramSidebarItems } from "@/app/topics/_lib/program-sidebar-items";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListOwnTopicApplicationsService } from "@/modules/topic-application/application/list-own-topic-applications";
import { PrismaTopicApplicationQueryRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-query-repository";
import { topicApplicationStatusPresentation } from "@/modules/topic-application/ui/topic-application-status-presentation";
import { ListPublishedTopicsService } from "@/modules/topic/application/list-published-topics";
import { ListAdminTopicPreviewService } from "@/modules/topic/application/list-admin-topic-preview";
import { PrismaTopicQueryRepository } from "@/modules/topic/infrastructure/prisma-topic-query-repository";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { PrismaStudentTeamRecruitmentQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository";
import { AppShell } from "@/app/_components/app-shell";
import { StatusBadge } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/app/_components/translated-text";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 상세");
}
const applicationDashboardHref = {
  PENDING: "/dashboard?view=pending",
  ACCEPTED: "/dashboard?view=active",
  REJECTED: "/dashboard?view=rejected",
  WITHDRAWN: "/dashboard?view=rejected",
} as const;

function Period({ label, startsAt, endsAt }: { label: string; startsAt: Date; endsAt: Date }) {
  return <div className="grid gap-1 border-t border-[var(--line)] py-4 first:border-t-0"><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{label}</UiText></dt><dd className="leading-6"><time dateTime={startsAt.toISOString()}><UiDate value={startsAt} mode="dateTime" /></time><span aria-hidden="true"> – </span><span className="sr-only"><UiText>{"부터"}</UiText>{" "}</span><time dateTime={endsAt.toISOString()}><UiDate value={endsAt} mode="dateTime" /></time></dd></div>;
}

export default async function TopicDetailPage({ params }: { params: Promise<{ topicId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { topicId } = await params;
  const topicAudience = actor.role === "ADMIN" ? "ADMIN" : actor.role === "PROFESSOR" ? "FACULTY" : "STUDENT";
  const topicRepository = new PrismaTopicQueryRepository(prisma, topicAudience);
  const topic = actor.role === "ADMIN"
    ? await new ListAdminTopicPreviewService(topicRepository).find(actor, topicId)
    : await new ListPublishedTopicsService(topicRepository).find(topicId);
  if (!topic) notFound();
  const applicationService = new ListOwnTopicApplicationsService(
    new PrismaTopicApplicationQueryRepository(prisma),
  );
  const now = new Date();
  const [sidebarItems, application, leaderTeams] = await Promise.all([
    actor.role === "ADMIN"
      ? new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).listAll(actor)
        .then((programs) => buildAdminProgramSidebarItems(programs, "projects", "settings", now))
      : loadProgramSidebarItems("active", {}, topicAudience),
    actor.role === "STUDENT" ? applicationService.findForTopic(actor, topic.id) : Promise.resolve(null),
    actor.role === "STUDENT"
      ? new PrismaStudentTeamRecruitmentQueryRepository(prisma).listLeaderTeams(actor.id)
      : Promise.resolve([]),
  ]);
  const directApplicationsEnabled = !topic.studentProjectCreationEnabled;
  const recruiting = directApplicationsEnabled && topic.recruitmentEnabled && Boolean(topic.programRecruitmentStartsAt && topic.programRecruitmentEndsAt) && topic.programRecruitmentStartsAt! <= now && topic.programRecruitmentEndsAt! > now && topic.memberCount < topic.capacity;
  const memberLabel = `${topic.memberCount} / ${topic.capacity}명`;

  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={`/topics/${topic.id}`}>
    <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={topic.programId} title={actor.role === "ADMIN" ? "프로그램 관리" : "프로그램"} showSettings={actor.role === "ADMIN"} />}>
    <UiNav aria-label="이전 위치" className="mb-5">
      <Link href={`/topics?programId=${encodeURIComponent(topic.programId)}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-[1.75]"><path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <UiText>{"프로젝트 목록"}</UiText></Link>
    </UiNav>

    <ProjectDetailShell
      cover={<EditorialProjectCover label={topic.programName} />}
      marker={
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-none stroke-current stroke-[1.75]"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.4-4.2 2.7-6.2 7-6.2s6.6 2 7 6.2" /></svg>
      }
      heading={
        <div>
          <div className="flex flex-wrap items-center gap-3">
            {topic.advisorEnabled ? <p className="text-sm font-semibold text-[var(--muted)]">{topic.authorName}<UiText>{topic.authorRole === "PROFESSOR" ? " 교수" : " · 학생 제안"}</UiText></p> : null}
            <p className="text-sm font-semibold text-[var(--primary)]"><UiText>{`${topic.programName} · ${topic.divisionName ?? "미분과"}`}</UiText></p>
            <StatusBadge tone={recruiting ? "success" : "neutral"}><UiText>{memberLabel}</UiText></StatusBadge>
            {actor.role === "ADMIN" && topic.programStatus === "DRAFT" ? <StatusBadge tone="neutral"><UiText>{"비공개 미리보기"}</UiText></StatusBadge> : null}
          </div>
          <h1 className="mt-3 max-w-4xl text-[clamp(1.5rem,2.8vw,2.125rem)] font-bold leading-[1.15] tracking-[-0.035em]"><UiText>{topic.title}</UiText></h1>
        </div>
      }
      headerAside={
        <>
          <div>
            {application ? <Link href={applicationDashboardHref[application.status]} className="button-secondary w-full"><UiText>{"지원 상태 ·"}</UiText>{" "}{topicApplicationStatusPresentation[application.status].label}</Link>
              : actor.role === "STUDENT" && recruiting ? <TopicApplicationEditor topicId={topic.id} topicTitle={topic.title} applicationMode={topic.applicationMode} applicationQuestions={topic.applicationQuestions} capacity={topic.capacity} teamMaxSize={topic.projectTeamMaxSize ?? 6} leaderTeams={leaderTeams} />
                : null}
          </div>
        </>
      }
      railLabelledBy="topic-schedule"
      rail={
        <>
          <h2 id="topic-schedule" className="text-xl font-bold"><UiText>{"프로그램 일정"}</UiText></h2>
          <p className="mt-2 text-sm font-semibold text-[var(--muted)]"><UiText>{`소속 프로그램 · 분과: ${topic.programName} · ${topic.divisionName ?? "미분과"}`}</UiText></p>
          <dl className="mt-5">{topic.programRecruitmentStartsAt && topic.programRecruitmentEndsAt ? <Period label="프로그램 모집 기간" startsAt={topic.programRecruitmentStartsAt} endsAt={topic.programRecruitmentEndsAt} /> : null}<Period label="수행 기간" startsAt={topic.programExecutionStartsAt} endsAt={topic.programExecutionEndsAt} /><Period label="제출 기간" startsAt={topic.programSubmissionStartsAt} endsAt={topic.programSubmissionEndsAt} /></dl>
        </>
      }
    >
      <div className="space-y-12">
        <section aria-labelledby="topic-description">
          <h2 id="topic-description" className="text-2xl font-bold tracking-[-0.035em]"><UiText>{"프로젝트 소개"}</UiText></h2>
          <TranslatedText text={topic.description} className="mt-5 max-w-3xl whitespace-pre-wrap text-[1.05rem] leading-8 text-[var(--muted)]" />
        </section>

        {directApplicationsEnabled && topic.recruitmentEnabled ? <section aria-labelledby="topic-requirements">
          <h2 id="topic-requirements" className="text-2xl font-bold tracking-[-0.035em]"><UiText>{"지원 조건"}</UiText></h2>
          <dl className="mt-5 border-y border-[var(--line)]">
            {[
              ["필수 기술", topic.requiredSkills.join(", ") || "별도 조건 없음"],
              ["우대 기술", topic.preferredSkills.join(", ") || "별도 조건 없음"],
              ["예상 역할", topic.roleExpectations],
              ["활동 조건", topic.availabilityRequirement],
            ].map(([label, value]) => (
              <div key={label} className="grid gap-2 border-t border-[var(--line)] py-5 first:border-t-0 sm:grid-cols-[8rem_minmax(0,1fr)]">
                <dt className="text-sm font-semibold text-[var(--muted)]"><UiText>{label}</UiText></dt>
                <dd className="font-semibold leading-7">{value}</dd>
              </div>
            ))}
          </dl>
        </section> : null}
      </div>
    </ProjectDetailShell>
    </ExplorerLayout>
  </AppShell>;
}
