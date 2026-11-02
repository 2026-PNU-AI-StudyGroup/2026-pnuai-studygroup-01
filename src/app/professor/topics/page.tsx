import Link from "next/link";
import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";

import { requireProfessorWorkspaceActor } from "@/app/professor/_lib/professor-workspace-access";
import { TopicStatusButton } from "@/app/professor/topics/_components/topic-status-button";
import { pendingApplicationsHref, RegistrablePrograms, TopicStatusPill } from "@/app/professor/topics/_components/topic-blocks";
import { ProfessorSidebar } from "@/app/_components/professor-sidebar";
import { ProfessorWorkspace } from "@/app/_components/professor-workspace";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { cardClass, CardHead, Missing } from "@/modules/project-program/ui/work-screen";
import { ListOwnTopicsService } from "@/modules/topic/application/list-own-topics";
import { PrismaTopicQueryRepository } from "@/modules/topic/infrastructure/prisma-topic-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { ProjectPagination } from "@/shared/ui/project-pagination";
import { AddIcon } from "@/shared/ui/workspace-icons";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 관리");
}

// 프로젝트, 검토 대기, 정원, 모집 마감, 상태, 할 일. 목록 폭이 48rem 아래면 프로젝트 이름 밑으로 흐른다.
// 할 일 칸(모집 마감 버튼, 관리자의 재검토 요청 양식)은 내용 폭이라, 머리글과 줄이 subgrid 로 한 격자를 나눠 써야 칸이 맞는다.
const tableGrid = "@min-[48rem]:grid @min-[48rem]:grid-cols-[minmax(0,1fr)_5rem_4rem_6.5rem_4.5rem_auto] @min-[48rem]:gap-x-4";
const subgridRow = "@min-[48rem]:col-span-full @min-[48rem]:grid @min-[48rem]:grid-cols-subgrid";

export default async function ProfessorTopicsPage({ searchParams }: { searchParams: Promise<{ page?: SearchParamValue }> }) {
  const actor = await requireProfessorWorkspaceActor();
  const requestedPage = Number(firstSearchParam((await searchParams).page) ?? "1");
  const canCreateTopics = actor.role === "PROFESSOR" || actor.role === "ADMIN";
  const programRepository = new PrismaProjectProgramRepository(prisma);
  const topicRepository = new PrismaTopicQueryRepository(prisma);
  const now = new Date();
  const [programs, topics] = await Promise.all([
    canCreateTopics
      ? new ProjectProgramService(programRepository).listRegistrableOpen(now)
      : Promise.resolve([]),
    new ListOwnTopicsService(topicRepository).execute(actor, requestedPage),
  ]);
  // 검토 대기 합계는 한 페이지에 다 들어올 때만 적는다. 여러 페이지면 이 페이지 몫만 세어져 틀린 수가 된다.
  const pendingTotal = topics.totalPages <= 1
    ? topics.items.reduce((sum, topic) => sum + topic.pendingApplicationCount, 0)
    : null;
  const finding = pendingTotal ? (
    <>
      <b className="font-semibold"><UiText>{`검토를 기다리는 지원이 ${pendingTotal}건 있습니다.`}</UiText></b>
      {" "}<Link href="/professor/applications?status=PENDING" className="font-medium text-[var(--primary)] hover:underline hover:underline-offset-[3px]"><UiText>{"지원 검토"}</UiText></Link>
    </>
  ) : pendingTotal === 0 && topics.items.length ? <UiText>{"검토할 지원이 없습니다."}</UiText> : undefined;
  const listTitle = actor.role === "ADMIN" ? "전체 프로젝트" : actor.role === "STUDENT" ? "담당 프로젝트" : "내 프로젝트";

  const list = (
    <section aria-labelledby="topic-list-title" className={`${cardClass} @container`}>
      <CardHead id="topic-list-title" title={<UiText>{listTitle}</UiText>} count={<>{topics.total}<UiText>{"개"}</UiText></>} />
      {topics.items.length === 0 ? (
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--line)] px-5 py-4 text-[0.8125rem]">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-[var(--ink)]"><UiText>{actor.role === "ADMIN" ? "등록된 프로젝트가 없습니다" : actor.role === "STUDENT" ? "배정된 조교 프로젝트가 없습니다" : "등록한 프로젝트가 없습니다"}</UiText></h3>
            <p className="mt-0.5 text-[var(--muted)]"><UiText>{actor.role === "STUDENT" ? "프로젝트 관리자의 조교 초대를 수락하면 담당 프로젝트가 표시됩니다." : programs.length ? "프로젝트를 등록해 학생에게 공개하세요." : "프로젝트 등록 기간인 공개 프로그램이 생기면 새 프로젝트를 등록할 수 있습니다."}</UiText></p>
          </div>
          {canCreateTopics && programs.length ? <Link className="button-primary button-compact gap-1.5" href="/professor/topics/new"><AddIcon className="size-4 shrink-0" /><UiText>{"새 프로젝트 등록"}</UiText></Link> : null}
        </div>
      ) : (
        <div className={tableGrid}>
          <div aria-hidden="true" className={`hidden h-9 items-center px-5 text-xs text-[var(--muted)] ${subgridRow}`}>
            <span><UiText>{"프로젝트"}</UiText></span>
            <span className="text-right"><UiText>{"검토 대기"}</UiText></span>
            <span className="text-right"><UiText>{"정원"}</UiText></span>
            <span className="text-right"><UiText>{"모집 마감"}</UiText></span>
            <span><UiText>{"상태"}</UiText></span>
            <span />
          </div>
          <ul className={subgridRow}>
            {topics.items.map((topic) => (
              <li key={topic.id} className={`grid grid-cols-1 gap-x-4 gap-y-1.5 border-t border-[var(--line)] px-5 py-3 transition-colors hover:bg-[#fafbfc] @min-[48rem]:items-center ${subgridRow}`}>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-medium leading-5">
                    <Link href={`/professor/topics/${topic.id}`} className="text-[var(--ink)] hover:text-[var(--primary)]"><UiText>{topic.title}</UiText></Link>
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                    <UiText>{topic.programName}</UiText>, <UiText>{topic.programCategory}</UiText>
                    {actor.role === "ADMIN" && topic.advisorEnabled ? <>, <UiText>{`${topic.authorName} 교수`}</UiText></> : null}
                  </p>
                </div>
                {/* 좁은 목록에서는 나머지 칸이 이름 밑 한 줄로 흐른다. 넓으면 칸마다 격자에 앉는다. */}
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.8125rem] @min-[48rem]:contents">
                  <span className="whitespace-nowrap tabular-nums @min-[48rem]:text-right">
                    <span className="text-[var(--muted)] @min-[48rem]:hidden"><UiText>{"검토 대기"}</UiText> </span>
                    {topic.pendingApplicationCount > 0
                      ? <Link href={pendingApplicationsHref(topic.title)} className="font-medium text-[var(--ink)] underline-offset-[3px] hover:text-[var(--primary)] hover:underline">{topic.pendingApplicationCount}<UiText>{"건"}</UiText></Link>
                      : <span className="text-[var(--muted)]">0<UiText>{"건"}</UiText></span>}
                  </span>
                  <span className="whitespace-nowrap tabular-nums text-[var(--ink)] @min-[48rem]:text-right">{topic.capacity}<UiText>{"명"}</UiText></span>
                  <span className="whitespace-nowrap tabular-nums text-[var(--muted)] @min-[48rem]:text-right">
                    {topic.programRecruitmentEndsAt ? <UiDate value={topic.programRecruitmentEndsAt} /> : <Missing />}
                  </span>
                  <span><TopicStatusPill status={topic.effectiveStatus} /></span>
                  <div className="flex justify-end empty:hidden @max-[48rem]:ml-auto">
                    <TopicStatusButton
                      topicId={topic.id}
                      status={topic.status}
                      pendingApplicationCount={topic.pendingApplicationCount}
                      openRecruitmentPostCount={topic.openRecruitmentPostCount}
                      recruitmentEnabled={topic.recruitmentEnabled}
                      canCloseRecruitment={actor.role === "ADMIN" || topic.managerId === actor.id}
                      isAdmin={actor.role === "ADMIN"}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="px-5 empty:hidden [&>nav]:mt-0 [&>nav]:pb-4 [&>nav]:pt-4">
        <ProjectPagination page={topics.page} totalPages={topics.totalPages} ariaLabel="프로젝트 관리 페이지" href={(page) => page > 1 ? `/professor/topics?page=${page}` : "/professor/topics"} />
      </div>
    </section>
  );

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/professor/topics" panel={<ProfessorSidebar currentPath="/professor/topics" role={actor.role} />}>
      <ProfessorWorkspace
        title="프로젝트 관리"
        description={finding}
        actions={canCreateTopics ? (
          <>
            <Link href="/dashboard" className="button-secondary button-compact"><UiText>{"학생 등록 검토"}</UiText></Link>
            {topics.total && programs.length ? <Link href="/professor/topics/new" className="button-primary button-compact gap-1.5"><AddIcon className="size-4 shrink-0" /><UiText>{"새 프로젝트 등록"}</UiText></Link> : null}
          </>
        ) : undefined}
      >
        {canCreateTopics ? (
          <div className="grid items-start gap-3.5 @min-[68rem]:grid-cols-[minmax(0,1fr)_20rem]">
            {list}
            <RegistrablePrograms programs={programs} now={now} />
          </div>
        ) : list}
      </ProfessorWorkspace>
    </AppShell>
  );
}
