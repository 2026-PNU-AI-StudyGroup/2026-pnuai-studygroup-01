import { ActiveProjectFilters } from "@/app/topics/_components/active-project-filters";
import { ActiveProjectResults } from "@/app/topics/_components/active-project-results";
import { ApplicationSummary } from "@/app/topics/_components/application-summary";
import { ProgramSelection } from "@/app/topics/_components/program-selection";
import type { ProjectProgramRecord } from "@/modules/project-program/application/manage-project-programs";
import type { TopicApplicationPage } from "@/modules/topic-application/application/topic-application-ports";
import type { PublicTopicPage, PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";

export function ActiveProjectsView({ programs, programId, topics, applications, pendingTeamTopicIds, phase, query, sort, now }: {
  programs: ProjectProgramRecord[];
  programId?: string;
  topics: PublicTopicPage;
  applications?: TopicApplicationPage;
  pendingTeamTopicIds: string[];
  phase: PublicTopicPhase;
  query: string;
  sort: PublicTopicSort;
  now: Date;
}) {
  const selectedProgramName = programs.find((program) => program.id === programId)?.name;

  return (
    <div className="space-y-7 pt-7">
      <ProgramSelection programs={programs} programId={programId} phase={phase} query={query} sort={sort} />
      <ActiveProjectFilters phase={phase} counts={topics.counts} programId={programId} query={query} sort={sort} />
      <ActiveProjectResults selectedProgramName={selectedProgramName} topics={topics} applications={applications} pendingTeamTopicIds={pendingTeamTopicIds} programId={programId} phase={phase} query={query} sort={sort} now={now} />
      {applications ? <ApplicationSummary applications={applications} /> : null}
    </div>
  );
}
