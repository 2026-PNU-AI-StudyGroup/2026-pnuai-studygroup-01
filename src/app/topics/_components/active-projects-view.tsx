import { ActiveProjectFilters } from "@/app/topics/_components/active-project-filters";
import { ActiveProjectResults } from "@/app/topics/_components/active-project-results";
import type { PublicTopicPage, PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";
import type { ProgramVoteBallot } from "@/modules/project-voting/application/manage-project-voting";

export function ActiveProjectsView({ programId, topics, canApply, leaderTeams, phase, query, sort, now, ballot }: {
  programId?: string;
  topics: PublicTopicPage;
  canApply: boolean;
  leaderTeams: Array<{ id: string; name: string; memberCount: number }>;
  phase: PublicTopicPhase;
  query: string;
  sort: PublicTopicSort;
  now: Date;
  ballot?: ProgramVoteBallot;
}) {
  return (
    <div className="min-w-0">
      <ActiveProjectFilters phase={phase} counts={topics.counts} programId={programId} query={query} sort={sort} />
      <ActiveProjectResults topics={topics} canApply={canApply} leaderTeams={leaderTeams} programId={programId} phase={phase} query={query} sort={sort} now={now} ballot={ballot} />
    </div>
  );
}
