"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { UiUl } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import { TopicApplicationEditor } from "@/app/topics/_components/topic-application-editor";
import { AdminProjectCardActions } from "@/app/topics/_components/admin-project-card-actions";
import { ProjectVoteButton, ProjectVoteCountBadge, ProjectVoteStatusPill, useProjectVoteSelection, type ProjectVoteSelection } from "@/app/topics/_components/project-vote-control";
import { ProjectVoteResultsDialog } from "@/app/topics/_components/project-vote-results-dialog";
import { ProjectGalleryCover } from "@/app/topics/_components/project-gallery-cover";
import { ProjectPagination } from "@/app/topics/_components/project-pagination";
import styles from "@/app/topics/_components/project-gallery.module.css";
import { activeProjectsHref } from "@/app/topics/_lib/active-project-query";
import type { PublicTopicPage } from "@/modules/topic/application/topic-ports";
import type { ProgramVoteBallot, ProgramVotingResults } from "@/modules/project-voting/application/manage-project-voting";
import type { AdminProjectCardData } from "@/modules/team/application/list-admin-project-card-data";
import type { AdminProjectOperationFilter } from "@/modules/team/application/list-admin-program-project-operations";
import { calculateReportSubmissionRate } from "@/modules/team/domain/project-progress";
import { EmptyState, ProgressBar, StatusBadge } from "@/shared/ui/page-primitives";
import { UndoIcon } from "@/shared/ui/workspace-icons";

const applicationAction = {
  PENDING: { label: "지원서 검토 중", href: "/dashboard?view=pending" },
  REJECTED: { label: "지원 결과 확인", href: "/dashboard?view=rejected" },
  WITHDRAWN: { label: "철회한 지원 확인", href: "/dashboard?view=rejected" },
} as const;

type TopicItem = PublicTopicPage["items"][number];

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" className="ml-2 size-4 fill-none stroke-current stroke-[1.75]"><path d="M4 10h11M11 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function AdminProjectCardProgress({ data }: { data: AdminProjectCardData }) {
  const { requiredCount, submittedCount, overdueCount } = data.reportProgress;
  if (requiredCount === 0) return null;

  return (
    <div className="mb-4">
      <ProgressBar
        value={calculateReportSubmissionRate(submittedCount, requiredCount)}
        label="보고서 제출률"
      />
      <p className={`mt-1 text-right text-xs ${overdueCount > 0 ? "font-bold text-[var(--danger)]" : "text-[var(--muted)]"}`}>
        {submittedCount} / {requiredCount} <UiText>{"보고서 제출"}</UiText>
        {overdueCount > 0 ? <>{" · "}<UiText>{"기한 초과"}</UiText> {overdueCount}<UiText>{"건"}</UiText></> : null}
      </p>
    </div>
  );
}

function ProjectCard({ topic, canApply, leaderTeams, now, voteSelection, adminDataEnabled, adminData }: {
  topic: TopicItem;
  canApply: boolean;
  leaderTeams: Array<{ id: string; name: string; memberCount: number }>;
  now: Date;
  voteSelection: ProjectVoteSelection;
  adminDataEnabled: boolean;
  adminData?: AdminProjectCardData;
}) {
  const href = `/topics/${topic.id}`;
  const recruiting = !topic.studentProjectCreationEnabled && topic.recruitmentEnabled && topic.programRecruitmentStartsAt <= now && topic.programRecruitmentEndsAt > now && topic.memberCount < topic.capacity;
  const application = topic.ownApplicationStatus;
  const voteCandidate = voteSelection.ballot?.candidates.find(({ id }) => id === topic.id);
  const hasProjectAction = Boolean(application || (canApply && recruiting));
  const memberLabel = `${topic.memberCount} / ${topic.capacity}명`;
  const availabilityTone = !topic.recruitmentEnabled || topic.studentProjectCreationEnabled
    ? "neutral" as const
    : topic.memberCount >= topic.capacity
    ? "neutral" as const
    : topic.programRecruitmentStartsAt > now
      ? "neutral" as const
      : topic.programRecruitmentEndsAt <= now
        ? "neutral" as const
        : topic.programRecruitmentEndsAt.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1_000
          ? "warning" as const
          : "success" as const;

  return (
    <li className="min-w-0">
      <article aria-labelledby={`topic-${topic.id}`} className={styles.card}>
        <div className="relative">
          <ProjectGalleryCover
            programName={topic.programName}
            title={topic.title}
          />
          {voteCandidate ? <ProjectVoteCountBadge voteCount={voteCandidate.voteCount} /> : null}
        </div>
        <div className={styles.body}>
          <div className="flex items-start justify-between gap-3">
            <h3 id={`topic-${topic.id}`} className="min-w-0 text-xl font-bold leading-7 tracking-[-0.03em]">
              <Link href={href} className={styles.titleLink}><UiText>{topic.title}</UiText></Link>
            </h3>
            <StatusBadge tone={availabilityTone}><UiText>{memberLabel}</UiText></StatusBadge>
          </div>
          <p className="mt-2 text-xs font-semibold text-[var(--primary)]"><UiText>{`${topic.programName} · ${topic.divisionName ?? "미분과"}`}</UiText></p>
          {topic.professorName ? <p className="mt-2 truncate text-xs font-semibold text-[var(--muted)]">{topic.professorName}</p> : null}
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--muted)]"><UiText>{topic.description}</UiText></p>

          <div className={`mt-auto pt-5 ${styles.actionLayer}`}>
            {adminData ? <AdminProjectCardProgress data={adminData} /> : null}
            {adminDataEnabled ? <AdminProjectCardActions projectTitle={topic.title} data={adminData} /> : null}
            {application === "ACCEPTED" ? (
              <Link href="/dashboard?view=active" className="inline-flex min-h-11 items-center text-sm font-bold text-[var(--primary)]">
                <UiText>{"내 프로젝트"}</UiText> <ArrowIcon />
              </Link>
            ) : application ? (
              <Link href={applicationAction[application].href} className="inline-flex min-h-11 items-center text-sm font-bold text-[var(--primary)]">
                <UiText>{applicationAction[application].label}</UiText> <ArrowIcon />
              </Link>
            ) : canApply && recruiting ? (
              <TopicApplicationEditor
                topicId={topic.id}
                topicTitle={topic.title}
                applicationMode={topic.applicationMode}
                applicationQuestions={topic.applicationQuestions}
                capacity={topic.capacity}
                memberCount={topic.memberCount}
                teamMaxSize={topic.projectTeamMaxSize ?? 6}
                leaderTeams={leaderTeams}
              />
            ) : null}
            {voteCandidate ? (
              <div className={hasProjectAction || adminDataEnabled ? "mt-2" : ""}>
                <ProjectVoteButton candidate={voteCandidate} selection={voteSelection} />
              </div>
            ) : null}
          </div>
        </div>
      </article>
    </li>
  );
}

const cardGridClassName = "grid gap-5 md:grid-cols-2 2xl:grid-cols-3";

export function ActiveProjectResults({ topics, canApply, leaderTeams, programId, query, divisionId, now, ballot, votingResults, adminProjectData, operation, registrationAction }: {
  topics: PublicTopicPage;
  canApply: boolean;
  leaderTeams: Array<{ id: string; name: string; memberCount: number }>;
  programId?: string;
  query: string;
  divisionId?: string | "UNASSIGNED";
  now: Date;
  ballot?: ProgramVoteBallot;
  votingResults?: ProgramVotingResults;
  adminProjectData?: AdminProjectCardData[];
  operation?: AdminProjectOperationFilter;
  registrationAction?: ReactNode;
}) {
  const hasFilters = Boolean(programId || query || divisionId || operation && operation !== "all");
  const voteSelection = useProjectVoteSelection(ballot);
  const adminDataByTopicId = new Map(adminProjectData?.map((data) => [data.topicId, data]));
  return (
    <section id="project-results" aria-labelledby="project-results-title" className="scroll-mt-32 pt-5">
      <div className="mb-4 flex min-h-9 flex-wrap items-center gap-3">
        {registrationAction}
        <ProjectVoteStatusPill selection={voteSelection} />
        {votingResults ? <ProjectVoteResultsDialog results={votingResults} /> : null}
        <h2 id="project-results-title" className="sr-only"><UiText>{"프로젝트 목록"}</UiText></h2>
        <p className="ml-auto shrink-0 text-xs font-semibold text-[var(--muted)]"><UiText>{"총"}</UiText>{" "}<strong className="text-[var(--ink)]">{topics.total}</strong><UiText>{"개"}</UiText></p>
      </div>
      {!topics.items.length ? (
        <EmptyState
          title={hasFilters ? "조건에 맞는 프로젝트가 없습니다" : "아직 공개된 프로젝트가 없습니다"}
          description={hasFilters
            ? operation && operation !== "all"
              ? "프로그램, 분과, 검색어 또는 운영 조건을 바꿔 다시 확인해 주세요."
              : "프로그램, 분과 또는 검색어를 바꿔 다시 확인해 주세요."
            : "공개된 프로젝트가 생기면 이 목록에서 확인할 수 있습니다."}
          action={hasFilters ? <Link href={activeProjectsHref({})} className="button-secondary gap-2"><UndoIcon className="size-4 shrink-0" /><UiText>{"필터 초기화"}</UiText></Link> : undefined}
        />
      ) : (
        <UiUl aria-label="프로젝트 목록" className={cardGridClassName}>
          {topics.items.map((topic) => (
            <ProjectCard
              key={topic.id}
              topic={topic}
              canApply={canApply}
              leaderTeams={leaderTeams}
              now={now}
              voteSelection={voteSelection}
              adminDataEnabled={adminProjectData !== undefined}
              adminData={adminDataByTopicId.get(topic.id)}
            />
          ))}
        </UiUl>
      )}

      <ProjectPagination
        page={topics.page}
        totalPages={topics.totalPages}
        ariaLabel="프로젝트 페이지"
        href={(page) => activeProjectsHref({ programId, query, divisionId, operation, page })}
      />
    </section>
  );
}
