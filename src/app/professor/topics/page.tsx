import Link from "next/link";
import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";

import { requireProfessorWorkspaceActor } from "@/app/professor/_lib/professor-workspace-access";
import { TopicStatusButton } from "@/app/professor/topics/_components/topic-status-button";
import { ProfessorWorkspace } from "@/app/professor/_components/professor-workspace";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { ListOwnTopicsService } from "@/modules/topic/application/list-own-topics";
import { PrismaTopicQueryRepository } from "@/modules/topic/infrastructure/prisma-topic-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { ProjectPagination } from "@/shared/ui/project-pagination";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("주제 관리");
}

const statusPresentation = { DRAFT: ["초안", "neutral"], PUBLISHED: ["공개", "info"], CLOSED: ["마감", "neutral"] } as const;

export default async function ProfessorTopicsPage({ searchParams }: { searchParams: Promise<{ page?: SearchParamValue }> }) {
  const actor = await requireProfessorWorkspaceActor();
  const requestedPage = Number(firstSearchParam((await searchParams).page) ?? "1");
  const canCreateTopics = actor.role === "PROFESSOR" || actor.role === "ADMIN";
  const programRepository = new PrismaProjectProgramRepository(prisma);
  const topicRepository = new PrismaTopicQueryRepository(prisma);
  const [programs, topics] = await Promise.all([
    canCreateTopics
      ? new ProjectProgramService(programRepository).listOpen()
      : Promise.resolve([]),
    new ListOwnTopicsService(topicRepository).execute(actor, requestedPage),
  ]);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/professor/topics">
      <ProfessorWorkspace currentPath="/professor/topics" title="주제 설계" description={canCreateTopics ? "학생이 도전할 프로젝트의 목표와 지원 조건, 일정을 설계합니다." : "조교로 배정된 프로젝트의 공개 내용과 운영 상태를 확인합니다."} actions={canCreateTopics ? <>{topics.total && programs.length ? <Link href="/professor/topics/new" className="button-primary"><UiText>{"새 주제 만들기"}</UiText></Link> : null}<Link href="/project-approvals" className="button-secondary"><UiText>{"학생 제안 검토"}</UiText></Link></> : undefined}>
        {canCreateTopics && programs.length === 0 ? <p role="status" className="border-l-2 border-[var(--warning)] bg-[var(--warning-subtle)] p-4 text-sm text-[var(--warning-ink)]"><UiText>{"공개된 프로그램이 생기면 새 주제를 만들 수 있습니다."}</UiText></p> : null}
        <section aria-labelledby="topic-list-title">
          <div className="flex items-end justify-between pb-4"><h2 id="topic-list-title" className="text-lg font-bold"><UiText>{actor.role === "ADMIN" ? "전체 주제" : actor.role === "STUDENT" ? "담당 주제" : "내 주제"}</UiText></h2><span className="muted text-sm">{topics.total}<UiText>{"개"}</UiText></span></div>
          {topics.items.length === 0 ? <div className="mt-6"><EmptyState title={actor.role === "ADMIN" ? "아직 만들어진 주제가 없습니다" : actor.role === "STUDENT" ? "배정된 조교 프로젝트가 없습니다" : "아직 만든 주제가 없습니다"} description={actor.role === "STUDENT" ? "프로젝트 관리자의 조교 초대를 수락하면 담당 주제가 여기에 표시됩니다." : programs.length ? "첫 프로젝트 주제를 설계해 학생에게 공개해 보세요." : "공개된 프로그램이 생기면 새 주제를 만들 수 있습니다."} action={canCreateTopics && programs.length ? <Link className="button-primary" href="/professor/topics/new"><UiText>{"새 주제 만들기"}</UiText></Link> : undefined} /></div> : (
            <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)] bg-white">
              {topics.items.map((topic) => <li key={topic.id} className="record-row grid gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_11rem_13rem_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-3"><h3 className="text-lg font-semibold tracking-[-0.02em]"><UiText>{topic.title}</UiText></h3><StatusBadge tone={statusPresentation[topic.status][1]}>{statusPresentation[topic.status][0]}</StatusBadge></div><p className="muted mt-1 text-sm">{topic.programName} · {topic.programCategory}<UiText>{actor.role === "ADMIN" && topic.advisorEnabled ? ` · ${topic.authorName} 교수` : ""}</UiText></p></div><dl className="grid grid-cols-[5rem_1fr] gap-1 text-sm lg:block"><dt className="muted lg:text-xs"><UiText>{"모집 정원"}</UiText></dt><dd className="lg:mt-1">{topic.capacity}<UiText>{"명"}</UiText></dd></dl><dl className="grid grid-cols-[5rem_1fr] gap-1 text-sm lg:block"><dt className="muted lg:text-xs"><UiText>{"모집 마감"}</UiText></dt><dd className="lg:mt-1"><UiDate value={topic.recruitmentEndsAt} mode="dateTime" /></dd></dl><div className="flex flex-wrap gap-2 lg:justify-end"><Link href={`/professor/topics/${topic.id}`} className="button-secondary"><UiText>{"상세"}</UiText></Link><TopicStatusButton topicId={topic.id} status={topic.status} programStatus={topic.programStatus} pendingApplicationCount={topic.pendingApplicationCount} openRecruitmentPostCount={topic.openRecruitmentPostCount} /></div></li>)}
            </ul>
          )}
          <ProjectPagination page={topics.page} totalPages={topics.totalPages} ariaLabel="주제 관리 페이지" href={(page) => page > 1 ? `/professor/topics?page=${page}` : "/professor/topics"} />
        </section>
      </ProfessorWorkspace>
    </AppShell>
  );
}
