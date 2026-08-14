"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import { TopicApplicationEditor } from "@/app/topics/_components/topic-application-editor";
import { AdminProjectCardActions } from "@/app/topics/_components/admin-project-card-actions";
import { ProjectGalleryCardShell } from "@/app/topics/_components/project-gallery-card-shell";
import { ProjectGalleryStatusBadge } from "@/app/topics/_components/project-gallery-status-badge";
import { ProjectResultsLayout } from "@/app/topics/_components/project-results-layout";
import { ProjectVoteButton, ProjectVoteCountBadge, type ProjectVoteSelection } from "@/app/topics/_components/project-vote-control";
import { hasTopicsFilters, topicsHref } from "@/app/topics/_lib/topics-query";
import type { PublicTopicPage } from "@/modules/topic/application/topic-ports";
import type { ProgramVoteBallot, VotingResultsView } from "@/modules/project-voting/application/manage-project-voting";
import type { AdminProjectCardData } from "@/modules/team/application/list-admin-project-card-data";
import type { AdminProjectOperationFilter } from "@/modules/team/application/list-admin-program-project-operations";
import { calculateReportSubmissionRate } from "@/modules/team/domain/project-progress";
import { teamStatusPresentation } from "@/modules/team/ui/team-status-presentation";
import { ProgressBar, StatusBadge } from "@/shared/ui/page-primitives";

const applicationAction = {
  PENDING: { label: "지원서 검토 중", href: "/dashboard?view=pending" },
  REJECTED: { label: "지원 결과 확인", href: "/dashboard?view=rejected" },
  WITHDRAWN: { label: "철회한 지원 확인", href: "/dashboard?view=rejected" },
} as const;

type TopicItem = PublicTopicPage["items"][number];

const projectStatusPresentation = {
  PENDING_APPROVAL: { label: "승인 대기", tone: "warning" },
  REJECTED: { label: "반려됨", tone: "danger" },
  ...teamStatusPresentation,
} as const;

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

function ProjectStatusBadge({ topic, recruiting }: { topic: TopicItem; recruiting: boolean }) {
  const status = recruiting
    ? { label: "모집 중", tone: "success" as const }
    : projectStatusPresentation[topic.effectiveStatus];

  return <ProjectGalleryStatusBadge label={status.label} tone={status.tone} />;
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
  const hasRecruitmentPeriod = Boolean(topic.programRecruitmentStartsAt && topic.programRecruitmentEndsAt);
  const recruiting = !topic.studentProjectCreationEnabled && hasRecruitmentPeriod && topic.recruitmentEnabled && topic.programRecruitmentStartsAt! <= now && topic.programRecruitmentEndsAt! > now && topic.memberCount < topic.capacity;
  const application = topic.ownApplicationStatus;
  const voteCandidate = voteSelection.ballot?.candidates.find(({ id }) => id === topic.id);
  const hasProjectAction = Boolean(application || (canApply && recruiting));
  const showActionLayer = adminDataEnabled || hasProjectAction || Boolean(voteCandidate);
  const memberLabel = `${topic.memberCount} / ${topic.capacity}명`;
  const availabilityTone = !topic.recruitmentEnabled || topic.studentProjectCreationEnabled
    ? "neutral" as const
    : topic.memberCount >= topic.capacity
    ? "neutral" as const
    : !hasRecruitmentPeriod || topic.programRecruitmentStartsAt! > now
      ? "neutral" as const
      : topic.programRecruitmentEndsAt! <= now
        ? "neutral" as const
        : topic.programRecruitmentEndsAt!.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1_000
          ? "warning" as const
          : "success" as const;

  return (
    <ProjectGalleryCardShell
      id={`topic-${topic.id}`}
      title={topic.title}
      href={href}
      programName={topic.programName}
      divisionName={topic.divisionName}
      description={topic.description}
      coverStatus={<ProjectStatusBadge topic={topic} recruiting={recruiting} />}
      coverOverlay={typeof voteCandidate?.voteCount === "number" ? <ProjectVoteCountBadge voteCount={voteCandidate.voteCount} /> : undefined}
      titleAside={<StatusBadge tone={availabilityTone}><span className="whitespace-nowrap"><UiText>{memberLabel}</UiText></span></StatusBadge>}
      details={topic.professorName ? <p className="mt-2 truncate text-xs font-semibold text-[var(--muted)]">{topic.professorName}</p> : undefined}
      actions={showActionLayer ? (
        <>
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
        </>
      ) : undefined}
    />
  );
}

export function ActiveProjectResults({ topics, canApply, leaderTeams, programId, query, divisionId, now, ballot, votingResults, adminProjectData, operation, registrationAction }: {
  topics: PublicTopicPage;
  canApply: boolean;
  leaderTeams: Array<{ id: string; name: string; memberCount: number }>;
  programId?: string;
  query: string;
  divisionId?: string | "UNASSIGNED";
  now: Date;
  ballot?: ProgramVoteBallot;
  votingResults?: VotingResultsView;
  adminProjectData?: AdminProjectCardData[];
  operation?: AdminProjectOperationFilter;
  registrationAction?: ReactNode;
}) {
  const hasFilters = hasTopicsFilters({ q: query, divisionId, operation });
  const adminDataByTopicId = new Map(adminProjectData?.map((data) => [data.topicId, data]));
  return (
    <ProjectResultsLayout
      items={topics.items}
      itemKey={(topic) => topic.id}
      total={topics.total}
      page={topics.page}
      totalPages={topics.totalPages}
      hasFilters={hasFilters}
      resetHref={topicsHref({ programId })}
      emptyState={{
        unfilteredTitle: "아직 공개된 프로젝트가 없습니다",
        unfilteredDescription: "공개된 프로젝트가 생기면 이 목록에서 확인할 수 있습니다.",
        filteredDescription: operation && operation !== "all"
          ? "분과, 검색어 또는 운영 조건을 바꿔 다시 확인해 주세요."
          : "분과 또는 검색어를 바꿔 다시 확인해 주세요.",
      }}
      listLabel="프로젝트 목록"
      paginationLabel="프로젝트 페이지"
      hrefForPage={(page) => topicsHref({ programId, q: query, divisionId, operation, page })}
      headerAction={registrationAction}
      ballot={ballot}
      votingResults={votingResults}
      renderItem={(topic, voteSelection) => (
        <ProjectCard
          topic={topic}
          canApply={canApply}
          leaderTeams={leaderTeams}
          now={now}
          voteSelection={voteSelection}
          adminDataEnabled={adminProjectData !== undefined}
          adminData={adminDataByTopicId.get(topic.id)}
        />
      )}
    />
  );
}
