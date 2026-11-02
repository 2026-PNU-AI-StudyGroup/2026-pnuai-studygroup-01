import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { TopicStatusButton } from "@/app/professor/topics/_components/topic-status-button";
import { pendingApplicationsHref, TopicSchedule, TopicStatusPill } from "@/app/professor/topics/_components/topic-blocks";
import { ProfessorSidebar } from "@/app/_components/professor-sidebar";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { cardClass, CardHead, daysLabel, daysUntil, ObjectHeader } from "@/modules/project-program/ui/work-screen";
import { GetManagedTopicService, ManagedTopicNotFoundError } from "@/modules/topic/application/get-managed-topic";
import { PrismaTopicQueryRepository } from "@/modules/topic/infrastructure/prisma-topic-query-repository";
import { ManagedProjectSummary } from "@/modules/topic/ui/managed-project-summary";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { TranslatedText } from "@/app/_components/translated-text";
import { ExplorerLayout } from "@/shared/ui/explorer-layout";
import { ProgramIcon } from "@/shared/ui/program-icon";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 상세 관리");
}

export default async function ManagedTopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { topicId } = await params;
  let topic;
  try {
    topic = await new GetManagedTopicService(
      new PrismaTopicQueryRepository(prisma),
    ).execute(actor, topicId);
  } catch (error) { if (error instanceof ManagedTopicNotFoundError) notFound(); throw error; }
  const now = new Date();
  const editable = (topic.effectiveStatus !== "COMPLETED" && topic.effectiveStatus !== "CANCELED") || actor.role === "ADMIN";
  const pending = topic.pendingApplicationCount;
  // 모집이 열려 있는 공개 프로젝트만 남은 날을 센다. 승인 전이거나 모집을 닫았으면 적지 않는다.
  const recruitmentEndsAt = topic.status === "ACTIVE" && topic.recruitmentEnabled ? topic.programRecruitmentEndsAt : null;
  const recruitmentDays = recruitmentEndsAt ? daysUntil(recruitmentEndsAt, now) : -1;
  const showApplicationSetup = !topic.studentProjectCreationEnabled;
  const teamSize = topic.projectTeamMinSize && topic.projectTeamMaxSize ? `${topic.projectTeamMinSize}~${topic.projectTeamMaxSize}명` : null;
  const finding = pending || recruitmentDays >= 0 ? (
    <>
      {pending ? <b className="font-semibold"><UiText>{`검토를 기다리는 지원이 ${pending}건 있습니다.`}</UiText></b> : null}
      {pending && recruitmentDays >= 0 ? " " : null}
      {recruitmentDays >= 0 ? <UiText>{recruitmentDays === 0 ? "모집이 오늘 마감됩니다." : `모집 마감까지 ${recruitmentDays}일 남았습니다.`}</UiText> : null}
    </>
  ) : undefined;

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/professor/topics" crumbs={[{ label: topic.title }]} panel={<ProfessorSidebar currentPath="/professor/topics" role={actor.role} />}>
      <ExplorerLayout>
        <div className="@container grid gap-3.5">
          <ObjectHeader
            id="managed-topic-title"
            media={(
              <div aria-hidden="true" className="grid size-12 flex-none place-items-center rounded-[var(--radius-panel)] bg-[var(--accent-subtle)] text-[var(--accent)]">
                <ProgramIcon icon={topic.programIcon} className="size-6" />
              </div>
            )}
            title={<UiText>{topic.title}</UiText>}
            titleAside={<TopicStatusPill status={topic.effectiveStatus} />}
            meta={<><UiText>{topic.programName}</UiText>{topic.divisionName ? <>, <UiText>{topic.divisionName}</UiText></> : null}, <UiText>{"등록자"}</UiText> {topic.authorName}</>}
            finding={finding}
            actions={(
              <>
                <Link href={`/professor/topics/${topic.id}/assistants`} className="button-secondary button-compact"><UiText>{"조교 관리"}</UiText></Link>
                {editable ? <Link href={`/professor/topics/${topic.id}/edit`} className="button-secondary button-compact"><UiText>{"내용 편집"}</UiText></Link> : null}
                <TopicStatusButton topicId={topic.id} status={topic.status} pendingApplicationCount={pending} openRecruitmentPostCount={topic.openRecruitmentPostCount} recruitmentEnabled={topic.recruitmentEnabled} canCloseRecruitment={actor.role === "ADMIN" || topic.managerId === actor.id} isAdmin={actor.role === "ADMIN"} />
                {pending ? <Link href={pendingApplicationsHref(topic.title)} className="button-primary button-compact"><UiText>{"지원 검토"}</UiText></Link> : null}
              </>
            )}
          />

          <div className="grid items-start gap-3.5 @min-[64rem]:grid-cols-[minmax(0,1fr)_20rem]">
            <ManagedProjectSummary
              topic={topic}
              description={<TranslatedText text={topic.description} className="whitespace-pre-wrap text-[0.9375rem] leading-7 text-[var(--ink)]" />}
            />
            <div className="grid min-w-0 gap-3.5">
              <section aria-labelledby="managed-topic-recruitment" className={cardClass}>
                <CardHead id="managed-topic-recruitment" title={<UiText>{"모집"}</UiText>} />
                <dl className="px-5 pb-3 text-[0.8125rem]">
                  {showApplicationSetup ? (
                    <>
                      <div className="flex items-baseline justify-between gap-3 py-2">
                        <dt className="text-[var(--muted)]"><UiText>{"검토 대기 지원"}</UiText></dt>
                        <dd className="tabular-nums">
                          {pending
                            ? <Link href={pendingApplicationsHref(topic.title)} className="font-medium text-[var(--primary)] hover:underline hover:underline-offset-[3px]">{pending}<UiText>{"건"}</UiText></Link>
                            : <span className="text-[var(--ink)]">0<UiText>{"건"}</UiText></span>}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3 border-t border-[var(--line)] py-2">
                        <dt className="text-[var(--muted)]"><UiText>{"모집 정원"}</UiText></dt>
                        <dd className="tabular-nums text-[var(--ink)]">{topic.capacity}<UiText>{"명"}</UiText></dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3 border-t border-[var(--line)] py-2">
                        <dt className="text-[var(--muted)]"><UiText>{"열린 팀원 모집 글"}</UiText></dt>
                        <dd className="tabular-nums text-[var(--ink)]">{topic.openRecruitmentPostCount}<UiText>{"건"}</UiText></dd>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-baseline justify-between gap-3 py-2">
                      <dt className="text-[var(--muted)]"><UiText>{"팀 인원"}</UiText></dt>
                      <dd className="tabular-nums text-[var(--ink)]">{teamSize ? <UiText>{teamSize}</UiText> : <span className="text-[var(--muted)]">-</span>}</dd>
                    </div>
                  )}
                  {recruitmentEndsAt && recruitmentDays >= 0 ? (
                    <div className="flex items-baseline justify-between gap-3 border-t border-[var(--line)] py-2">
                      <dt className="text-[var(--muted)]"><UiText>{"모집 마감"}</UiText></dt>
                      <dd className="text-right tabular-nums text-[var(--ink)]">
                        <UiDate value={recruitmentEndsAt} /><span className="ml-1.5 text-xs text-[var(--muted)]"><UiText>{daysLabel(recruitmentDays)}</UiText></span>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </section>
              <TopicSchedule topic={topic} now={now} />
            </div>
          </div>
        </div>
      </ExplorerLayout>
    </AppShell>
  );
}
