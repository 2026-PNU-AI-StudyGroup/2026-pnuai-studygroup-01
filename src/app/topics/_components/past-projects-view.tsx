"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";

import { AdminProjectCardActions } from "@/app/topics/_components/admin-project-card-actions";
import { ActiveProjectFilters } from "@/app/topics/_components/active-project-filters";
import { ProjectGalleryCardShell } from "@/app/topics/_components/project-gallery-card-shell";
import { ProjectAwardBadge } from "@/app/topics/_components/project-award-badge";
import { ProjectGalleryStatusBadge } from "@/app/topics/_components/project-gallery-status-badge";
import { ProjectResultsLayout } from "@/app/topics/_components/project-results-layout";
import { ProjectVoteButton, ProjectVoteCountBadge } from "@/app/topics/_components/project-vote-control";
import { hasTopicsFilters, topicsHref } from "@/app/topics/_lib/topics-query";
import type { ArchivedProject } from "@/modules/team/application/archive-projects";
import type { ProgramVoteBallot, VotingResultsView } from "@/modules/project-voting/application/manage-project-voting";
import type { AdminProjectCardData } from "@/modules/team/application/list-admin-project-card-data";

export function PastProjectsView({ projects, total, page, totalPages, query, programId, divisionId, divisions = [], ballot, votingResults, adminProjectData }: {
  projects: ArchivedProject[];
  total: number;
  page: number;
  totalPages: number;
  query: string;
  programId?: string;
  divisionId?: string | "UNASSIGNED";
  divisions?: Array<{ id: string; name: string }>;
  ballot?: ProgramVoteBallot;
  votingResults?: VotingResultsView;
  adminProjectData?: AdminProjectCardData[];
}) {
  const hasFilters = hasTopicsFilters({ q: query, divisionId });
  const adminDataByTopicId = new Map(adminProjectData?.map((data) => [data.topicId, data]));
  return (
    <div className="min-w-0">
      {divisions.length ? <ActiveProjectFilters view="past" programId={programId} query={query} divisionId={divisionId} divisions={divisions} /> : null}
      <ProjectResultsLayout
      items={projects}
      itemKey={(project) => project.id}
      total={total}
      page={page}
      totalPages={totalPages}
      hasFilters={hasFilters}
      resetHref={topicsHref({ view: "past", programId })}
      emptyState={{
        unfilteredTitle: "아직 지난 프로젝트가 없습니다",
        unfilteredDescription: "완료된 프로젝트가 생기면 이 목록에서 확인할 수 있습니다.",
        filteredDescription: "검색어를 바꿔 다시 확인해 주세요.",
      }}
      listLabel="지난 프로젝트 목록"
      paginationLabel="지난 프로젝트 페이지"
      hrefForPage={(targetPage) => topicsHref({ view: "past", programId, divisionId, q: query, page: targetPage })}
      ballot={ballot}
      votingResults={votingResults}
      showSubmissionManagement={adminProjectData !== undefined}
      renderItem={(project, voteSelection) => {
        const voteCandidate = voteSelection.ballot?.candidates.find(({ id }) => id === project.topicId);
        const cardData = adminDataByTopicId.get(project.topicId);
        const hasActions = adminProjectData !== undefined || Boolean(voteCandidate);
        return (
          <ProjectGalleryCardShell
            id={`past-project-${project.id}`}
            title={project.topicTitle}
            href={`/topics/${project.topicId}`}
            programName={project.programName}
            divisionName={project.divisionName}
            description={project.topicDescription}
            imagePath={project.thumbnailPath}
            coverStatus={(
              <>
                <ProjectGalleryStatusBadge label="완료" tone="neutral" />
                {project.award ? <ProjectAwardBadge award={project.award} /> : null}
              </>
            )}
            coverOverlay={(() => {
              // 진행 중 투표의 득표수가 있으면 그 값을, 없으면 이관된 득표수를 쓴다.
              const voteCount = voteCandidate?.voteCount ?? project.archivedVoteCount;
              return typeof voteCount === "number" ? <ProjectVoteCountBadge voteCount={voteCount} /> : undefined;
            })()}
            details={(
              <p className="mt-2 truncate text-xs font-semibold text-[var(--muted)]">
                <span className="text-[var(--ink)]">{project.teamName} <UiText>{"팀"}</UiText></span>
                {project.advisorEnabled ? <>{" · "}{project.professorName} <UiText>{project.advisorRole}</UiText></> : null}
              </p>
            )}
            actions={hasActions ? (
              <>
                {adminProjectData !== undefined ? <AdminProjectCardActions projectTitle={project.topicTitle} data={cardData} /> : null}
                {voteCandidate ? (
                  <div className={adminProjectData !== undefined ? "mt-2" : ""}>
                    <ProjectVoteButton candidate={voteCandidate} selection={voteSelection} />
                  </div>
                ) : null}
              </>
            ) : undefined}
          />
        );
      }}
      />
    </div>
  );
}
