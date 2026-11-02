"use client";

import type { ReactNode } from "react";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiDiv } from "@/modules/translation/ui/localized-elements";

import { isTopicRecruiting, ProjectApplicationAction } from "@/app/topics/_components/project-application-action";
import { AdminProjectCardActions } from "@/app/topics/_components/admin-project-card-actions";
import { ProjectCard, ProjectResultsLayout } from "@/app/topics/_components/project-results-layout";
import { ProjectVoteButton, ProjectVoteCountBadge, type ProjectVoteSelection } from "@/app/topics/_components/project-vote-control";
import { Pill, type PillTone } from "@/modules/project-program/ui/work-screen";
import { hasTopicsFilters, topicsHref } from "@/app/topics/_lib/topics-query";
import type { PublicTopicPage } from "@/modules/topic/application/topic-ports";
import type { ProgramVoteBallot, VotingResultsView } from "@/modules/project-voting/application/manage-project-voting";
import type { AdminProjectCardData } from "@/modules/team/application/list-admin-project-card-data";
import type {
  AdminProjectReportFilter,
  AdminProjectTeamFilter,
} from "@/modules/team/application/list-admin-program-project-operations";
import { calculateReportSubmissionRate } from "@/modules/team/domain/project-progress";
import { teamStatusPresentation } from "@/modules/team/ui/team-status-presentation";
import { ProgramIcon } from "@/shared/ui/program-icon";

type TopicItem = PublicTopicPage["items"][number];

const projectStatusLabel = {
  PENDING_APPROVAL: "승인 대기",
  REJECTED: "반려됨",
  FORMING: teamStatusPresentation.FORMING.label,
  IN_PROGRESS: teamStatusPresentation.IN_PROGRESS.label,
  COMPLETED: teamStatusPresentation.COMPLETED.label,
  CANCELED: teamStatusPresentation.CANCELED.label,
} as const;

// 진행 중과 모집 중만 파랑, 손볼 일(승인 대기, 반려)만 제 색. 나머지는 회색이다.
const projectStatusTone: Record<TopicItem["effectiveStatus"], PillTone> = {
  PENDING_APPROVAL: "warning",
  REJECTED: "danger",
  FORMING: "plain",
  IN_PROGRESS: "accent",
  COMPLETED: "plain",
  CANCELED: "plain",
};

/** 관리자 카드의 보고서 줄. 제출 막대와 몇 건 중 몇 건, 기한을 넘긴 것이 있으면 그 수만 빨갛게. */
function ReportProgress({ data }: { data?: AdminProjectCardData }) {
  const progress = data?.reportProgress;
  if (!progress || progress.requiredCount === 0) return null;
  const rate = calculateReportSubmissionRate(progress.submittedCount, progress.requiredCount);
  return (
    <div className="mt-2 flex items-center gap-2 text-xs">
      <span className="flex-none text-[var(--muted)]"><UiText>{"보고서"}</UiText></span>
      <UiDiv role="progressbar" aria-label="보고서 제출률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={rate} className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--accent-subtle)]">
        <span className="block h-full rounded-full bg-[var(--primary)]" style={{ width: `${rate}%` }} />
      </UiDiv>
      <span className="flex-none tabular-nums text-[var(--ink)]">{progress.submittedCount} / {progress.requiredCount}</span>
      {progress.overdueCount > 0 ? <span className="flex-none text-[var(--danger)]"><UiText>{`기한 초과 ${progress.overdueCount}건`}</UiText></span> : null}
    </div>
  );
}

function ProjectRow({ topic, canApply, leaderTeams, now, voteSelection, adminDataEnabled, adminData }: {
  topic: TopicItem;
  canApply: boolean;
  leaderTeams: Array<{ id: string; name: string; memberCount: number }>;
  now: Date;
  voteSelection: ProjectVoteSelection;
  adminDataEnabled: boolean;
  adminData?: AdminProjectCardData;
}) {
  const recruiting = isTopicRecruiting(topic, now);
  const voteCandidate = voteSelection.ballot?.candidates.find(({ id }) => id === topic.id);
  const full = topic.memberCount >= topic.capacity;
  const members = `${topic.memberCount} / ${topic.capacity}명`;
  const status = recruiting
    ? { label: "모집 중", tone: "accent" as const }
    : { label: projectStatusLabel[topic.effectiveStatus], tone: projectStatusTone[topic.effectiveStatus] };
  const action = adminDataEnabled
    ? <AdminProjectCardActions projectTitle={topic.title} data={adminData} />
    : (
      <>
        <ProjectApplicationAction topic={topic} canApply={canApply} recruiting={recruiting} leaderTeams={leaderTeams} quiet />
        {voteCandidate ? <ProjectVoteButton candidate={voteCandidate} selection={voteSelection} quiet /> : null}
      </>
    );

  return (
    <ProjectCard
      id={`topic-${topic.id}`}
      title={topic.title}
      href={`/topics/${topic.id}`}
      description={<UiText>{topic.description}</UiText>}
      image={topic.thumbnailPath}
      fallback={<ProgramIcon icon={topic.programIcon} />}
      meta={(
        <>
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate text-[var(--ink)]">
              {topic.teamName
                ? <UiText>{topic.teamName}</UiText>
                : <span className="text-[var(--muted)]">{topic.professorName ?? <UiText>{topic.divisionName ?? "팀 미구성"}</UiText>}</span>}
            </p>
            <span className={`flex-none whitespace-nowrap tabular-nums ${full ? "text-[var(--muted)]" : "text-[var(--ink)]"}`}><UiText>{members}</UiText></span>
          </div>
          {adminDataEnabled ? <ReportProgress data={adminData} /> : null}
        </>
      )}
      badges={(
        <>
          <Pill tone={status.tone}>{status.label}</Pill>
          {typeof voteCandidate?.voteCount === "number" ? <ProjectVoteCountBadge voteCount={voteCandidate.voteCount} /> : null}
        </>
      )}
      actions={action}
    />
  );
}

export function ActiveProjectResults({ topics, canApply, leaderTeams, programId, query, divisionId, now, ballot, votingResults, adminProjectData, teamStatus, reportStatus, search, filters }: {
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
  teamStatus?: AdminProjectTeamFilter;
  reportStatus?: AdminProjectReportFilter;
  search?: ReactNode;
  filters?: ReactNode;
}) {
  const hasFilters = hasTopicsFilters({ q: query, divisionId, teamStatus, reportStatus });
  const adminDataByTopicId = new Map(adminProjectData?.map((data) => [data.topicId, data]));
  const admin = adminProjectData !== undefined;
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
        filteredDescription: teamStatus && teamStatus !== "all" || reportStatus && reportStatus !== "all"
          ? "분과, 검색어 또는 프로젝트 조건을 바꿔 다시 확인해 주세요."
          : "분과 또는 검색어를 바꿔 다시 확인해 주세요.",
      }}
      listLabel="프로젝트 목록"
      paginationLabel="프로젝트 페이지"
      hrefForPage={(page) => topicsHref({ programId, q: query, divisionId, teamStatus, reportStatus, page })}
      search={search}
      filters={filters}
      ballot={ballot}
      votingResults={votingResults}
      renderItem={(topic, voteSelection) => (
        <ProjectRow
          topic={topic}
          canApply={canApply}
          leaderTeams={leaderTeams}
          now={now}
          voteSelection={voteSelection}
          adminDataEnabled={admin}
          adminData={adminDataByTopicId.get(topic.id)}
        />
      )}
    />
  );
}
