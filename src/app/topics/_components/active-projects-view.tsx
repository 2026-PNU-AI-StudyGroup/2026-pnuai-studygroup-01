import type { ReactNode } from "react";

import { ActiveProjectFilters } from "@/app/topics/_components/active-project-filters";
import { ActiveProjectResults } from "@/app/topics/_components/active-project-results";
import type { PublicTopicPage } from "@/modules/topic/application/topic-ports";
import type { ProgramVoteBallot, VotingResultsView } from "@/modules/project-voting/application/manage-project-voting";
import type { AdminProjectCardData } from "@/modules/team/application/list-admin-project-card-data";
import type { AdminProjectOperationFilter } from "@/modules/team/application/list-admin-program-project-operations";

export function ActiveProjectsView({ programId, topics, canApply, leaderTeams, query, divisionId, divisions = [], hasUnassigned = false, now, ballot, votingResults, adminProjectData, operation, registrationAction }: {
  programId?: string;
  topics: PublicTopicPage;
  canApply: boolean;
  leaderTeams: Array<{ id: string; name: string; memberCount: number }>;
  query: string;
  divisionId?: string | "UNASSIGNED";
  divisions?: Array<{ id: string; name: string }>;
  hasUnassigned?: boolean;
  now: Date;
  ballot?: ProgramVoteBallot;
  votingResults?: VotingResultsView;
  adminProjectData?: AdminProjectCardData[];
  operation?: AdminProjectOperationFilter;
  registrationAction?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <ActiveProjectFilters programId={programId} query={query} divisionId={divisionId} divisions={divisions} hasUnassigned={hasUnassigned} operation={operation} />
      <ActiveProjectResults topics={topics} canApply={canApply} leaderTeams={leaderTeams} programId={programId} query={query} divisionId={divisionId} now={now} ballot={ballot} votingResults={votingResults} adminProjectData={adminProjectData} operation={operation} registrationAction={registrationAction} />
    </div>
  );
}
