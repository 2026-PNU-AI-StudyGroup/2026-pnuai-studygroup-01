"use client";

import type { ReactNode } from "react";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import { AdminProjectCardActions } from "@/app/topics/_components/admin-project-card-actions";
import { ActiveProjectFilters } from "@/app/topics/_components/active-project-filters";
import { ProjectAwardBadge } from "@/modules/project-program/ui/project-award-badge";
import { ProjectIdentity, ProjectResultsLayout, ProjectRowCells } from "@/app/topics/_components/project-results-layout";
import { ProjectVoteButton, ProjectVoteCountBadge } from "@/app/topics/_components/project-vote-control";
import { Missing, Thumb } from "@/modules/project-program/ui/work-screen";
import { hasTopicsFilters, topicsHref } from "@/app/topics/_lib/topics-query";
import type { ArchivedProject } from "@/modules/team/application/archive-projects";
import type { ProgramVoteBallot, VotingResultsView } from "@/modules/project-voting/application/manage-project-voting";
import type { AdminProjectCardData } from "@/modules/team/application/list-admin-project-card-data";
import { resolveShowcaseRepository } from "@/modules/team/domain/showcase-repository";
import { ProgramIcon } from "@/shared/ui/program-icon";

export function PastProjectsView({ projects, total, page, totalPages, query, programId, divisionId, divisions = [], ballot, votingResults, adminProjectData, search }: {
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
  search?: ReactNode;
}) {
  const hasFilters = hasTopicsFilters({ q: query, divisionId });
  const adminDataByTopicId = new Map(adminProjectData?.map((data) => [data.topicId, data]));
  const admin = adminProjectData !== undefined;
  const showAction = admin || Boolean(ballot);
  return (
    <ProjectResultsLayout
      title="지난 프로젝트"
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
      columns={[{ label: "팀" }, { label: "수상" }, { label: "득표", align: "right" }, { label: "저장소" }, ...(showAction ? [{ label: "" }] : [])]}
      columnTemplate={`7rem 6.5rem 3rem 3.5rem${showAction ? " 5.5rem" : ""}`}
      search={search}
      filters={divisions.length ? <ActiveProjectFilters view="past" programId={programId} query={query} divisionId={divisionId} divisions={divisions} /> : undefined}
      ballot={ballot}
      votingResults={votingResults}
      renderItem={(project, voteSelection) => {
        const voteCandidate = voteSelection.ballot?.candidates.find(({ id }) => id === project.topicId);
        // 진행 중 투표의 득표수가 있으면 그 값을, 없으면 이관된 득표수를 쓴다.
        const voteCount = voteCandidate?.voteCount ?? project.archivedVoteCount;
        const teamName = project.teamNumber === null ? project.teamName : `${project.teamNumber}. ${project.teamName}`;
        const repository = resolveShowcaseRepository({ artifacts: project.artifacts, sourceUrl: project.sourceUrl });
        return (
          <>
            <Thumb src={project.thumbnailPath} fallback={<ProgramIcon icon={project.programIcon} />} />
            <ProjectIdentity id={`past-project-${project.id}`} title={project.topicTitle} href={`/topics/${project.topicId}`} description={<UiText>{project.topicDescription}</UiText>} />
            <ProjectRowCells>
              <div className="min-w-0 leading-4">
                <p className="truncate text-[0.8125rem] text-[var(--ink)]"><UiText>{teamName}</UiText></p>
                {project.advisorEnabled ? <p className="mt-1 truncate text-xs text-[var(--muted)]">{project.professorName} <UiText>{project.advisorRole}</UiText></p> : null}
              </div>
              <div className="flex min-w-0 flex-wrap gap-1">
                {project.award ? <ProjectAwardBadge award={project.award} /> : null}
                {project.popularAward ? <ProjectAwardBadge award="인기상" /> : null}
                {!project.award && !project.popularAward ? <Missing /> : null}
              </div>
              <span className="@min-[40rem]:text-right">{typeof voteCount === "number" ? <ProjectVoteCountBadge voteCount={voteCount} /> : <Missing />}</span>
              <span>
                {repository
                  ? <a href={repository.url} target="_blank" rel="noreferrer" className="font-medium text-[var(--primary)] hover:underline hover:underline-offset-[3px]">GitHub<span className="sr-only"> <UiText>{"새 창"}</UiText></span></a>
                  : <Missing />}
              </span>
              {showAction ? (
                <div className="flex min-w-0 flex-col items-stretch gap-1.5 @max-[40rem]:w-full">
                  {admin ? <AdminProjectCardActions projectTitle={project.topicTitle} data={adminDataByTopicId.get(project.topicId)} /> : null}
                  {voteCandidate ? <ProjectVoteButton candidate={voteCandidate} selection={voteSelection} quiet /> : null}
                </div>
              ) : null}
            </ProjectRowCells>
          </>
        );
      }}
    />
  );
}
