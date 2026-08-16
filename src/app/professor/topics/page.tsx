import Link from "next/link";
import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";

import { requireProfessorWorkspaceActor } from "@/app/professor/_lib/professor-workspace-access";
import { TopicStatusButton } from "@/app/professor/topics/_components/topic-status-button";
import { ProfessorWorkspace } from "@/app/_components/professor-workspace";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { ListOwnTopicsService } from "@/modules/topic/application/list-own-topics";
import { PrismaTopicQueryRepository } from "@/modules/topic/infrastructure/prisma-topic-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { ProjectPagination } from "@/shared/ui/project-pagination";
import { IconLink } from "@/shared/ui/icon-button";
import { AddIcon, ChevronIcon, DocumentIcon } from "@/shared/ui/workspace-icons";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 관리");
}

const statusPresentation = { PENDING_APPROVAL: ["승인 대기", "warning"], REJECTED: ["반려됨", "danger"], ACTIVE: ["진행", "info"], COMPLETED: ["완료", "neutral"], CANCELED: ["취소", "danger"] } as const;

export default async function ProfessorTopicsPage({ searchParams }: { searchParams: Promise<{ page?: SearchParamValue }> }) {
  const actor = await requireProfessorWorkspaceActor();
  const requestedPage = Number(firstSearchParam((await searchParams).page) ?? "1");
  const canCreateTopics = actor.role === "PROFESSOR" || actor.role === "ADMIN";
  const programRepository = new PrismaProjectProgramRepository(prisma);
  const topicRepository = new PrismaTopicQueryRepository(prisma);
  const [programs, topics] = await Promise.all([
    canCreateTopics
      ? new ProjectProgramService(programRepository).listRegistrableOpen(new Date())
      : Promise.resolve([]),
    new ListOwnTopicsService(topicRepository).execute(actor, requestedPage),
  ]);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/professor/topics">
      <ProfessorWorkspace currentPath="/professor/topics" role={actor.role} title="프로젝트 관리" description={canCreateTopics ? "학생이 수행할 프로젝트의 목표, 지원 조건, 일정을 관리합니다." : "조교로 배정된 프로젝트의 공개 내용과 운영 상태를 확인합니다."} actions={canCreateTopics ? <>{topics.total && programs.length ? <Link href="/professor/topics/new" className="button-primary gap-2"><AddIcon className="size-4 shrink-0" /><UiText>{"새 프로젝트 등록"}</UiText></Link> : null}<Link href="/dashboard" className="button-secondary gap-2"><DocumentIcon className="size-4 shrink-0" /><UiText>{"학생 등록 검토"}</UiText></Link></> : undefined}>
        {canCreateTopics && programs.length === 0 ? <p role="status" className="border-l-2 border-[var(--warning)] bg-[var(--warning-subtle)] p-4 text-sm text-[var(--warning-ink)]"><UiText>{"프로젝트 등록 기간인 공개 프로그램이 생기면 새 프로젝트를 만들 수 있습니다."}</UiText></p> : null}
        <section aria-labelledby="topic-list-title">
          <div className="overflow-hidden lg:rounded-[var(--radius-panel)] lg:border lg:border-[var(--line)] lg:bg-white lg:shadow-[var(--shadow-admin-panel)]">
            <header className="flex items-end justify-between gap-4 border-b border-[var(--line)] pb-4 lg:bg-[var(--surface-subtle)] lg:px-6 lg:py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--primary)]"><UiText>{"프로젝트 관리"}</UiText></p>
                <h2 id="topic-list-title" className="mt-1 text-lg font-bold">
                  <UiText>{actor.role === "ADMIN" ? "전체 프로젝트" : actor.role === "STUDENT" ? "담당 프로젝트" : "내 프로젝트"}</UiText>
                </h2>
              </div>
              <span className="text-sm font-bold text-[var(--muted)]"><strong className="text-[var(--ink)]">{topics.total}</strong><UiText>{"개"}</UiText></span>
            </header>
            {topics.items.length === 0 ? (
              <div className="pt-6 lg:p-6">
                <EmptyState
                  variant="section"
                  title={actor.role === "ADMIN" ? "등록된 프로젝트가 없습니다" : actor.role === "STUDENT" ? "배정된 조교 프로젝트가 없습니다" : "등록한 프로젝트가 없습니다"}
                  description={actor.role === "STUDENT" ? "프로젝트 관리자의 조교 초대를 수락하면 담당 프로젝트가 표시됩니다." : programs.length ? "프로젝트를 등록해 학생에게 공개하세요." : "프로젝트 등록 기간인 공개 프로그램이 생기면 새 프로젝트를 등록할 수 있습니다."}
                  action={canCreateTopics && programs.length ? <Link className="button-primary gap-2" href="/professor/topics/new"><AddIcon className="size-4 shrink-0" /><UiText>{"새 프로젝트 등록"}</UiText></Link> : undefined}
                />
              </div>
            ) : (
              <ul className="divide-y divide-[var(--line)] bg-white">
                {topics.items.map((topic) => (
                  <li
                    key={topic.id}
                    className="record-row grid gap-5 py-6 transition-colors focus-within:bg-[var(--primary-subtle)] lg:grid-cols-[minmax(0,1fr)_9rem_12rem_auto] lg:items-center lg:px-6"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold tracking-[-0.02em]"><UiText>{topic.title}</UiText></h3>
                        <StatusBadge tone={statusPresentation[topic.effectiveStatus === "FORMING" || topic.effectiveStatus === "IN_PROGRESS" ? "ACTIVE" : topic.effectiveStatus][1]}>{statusPresentation[topic.effectiveStatus === "FORMING" || topic.effectiveStatus === "IN_PROGRESS" ? "ACTIVE" : topic.effectiveStatus][0]}</StatusBadge>
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {topic.programName} · {topic.programCategory}
                        <UiText>{actor.role === "ADMIN" && topic.advisorEnabled ? ` · ${topic.authorName} 교수` : ""}</UiText>
                      </p>
                    </div>
                    <dl className="grid grid-cols-[5rem_1fr] gap-1 text-sm lg:block">
                      <dt className="text-[var(--muted)] lg:text-xs"><UiText>{"모집 정원"}</UiText></dt>
                      <dd className="font-semibold lg:mt-1">{topic.capacity}<UiText>{"명"}</UiText></dd>
                    </dl>
                    {topic.programRecruitmentEndsAt ? <dl className="grid grid-cols-[5rem_1fr] gap-1 text-sm lg:block">
                      <dt className="text-[var(--muted)] lg:text-xs"><UiText>{"프로그램 모집 마감"}</UiText></dt>
                      <dd className="font-semibold lg:mt-1"><UiDate value={topic.programRecruitmentEndsAt} mode="dateTime" /></dd>
                    </dl> : null}
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <IconLink href={`/professor/topics/${topic.id}`} aria-label={`${topic.title} 상세`} title="프로젝트 상세"><ChevronIcon className="size-5" /></IconLink>
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
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ProjectPagination page={topics.page} totalPages={topics.totalPages} ariaLabel="프로젝트 관리 페이지" href={(page) => page > 1 ? `/professor/topics?page=${page}` : "/professor/topics"} />
        </section>
      </ProfessorWorkspace>
    </AppShell>
  );
}
