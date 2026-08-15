import Link from "next/link";

import { topicsHref } from "@/app/topics/_lib/topics-query";
import type {
  AdminProjectReportFilter,
  AdminProjectTeamFilter,
  AdminProgramProjectOperations,
} from "@/modules/team/application/list-admin-program-project-operations";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiNav, UiSection } from "@/modules/translation/ui/localized-elements";

const teamCards: Array<{
  filter: AdminProjectTeamFilter;
  label: string;
  count: keyof AdminProgramProjectOperations["summary"];
}> = [
  { filter: "all", label: "전체", count: "total" },
  { filter: "formed", label: "팀 구성됨", count: "formed" },
  { filter: "unassigned", label: "팀 미구성", count: "unassigned" },
];

const reportCards: Array<{
  filter: AdminProjectReportFilter;
  label: string;
  count: keyof AdminProgramProjectOperations["summary"];
}> = [
  { filter: "all", label: "전체", count: "total" },
  { filter: "overdue", label: "기한 초과", count: "overdue" },
  { filter: "submitted", label: "제출 완료", count: "submitted" },
];

export function AdminProjectOperationsSummary({
  programId,
  operations,
  selectedTeamFilter,
  selectedReportFilter,
  showTeamFilter,
  divisionId,
  query,
}: {
  programId: string;
  operations: AdminProgramProjectOperations;
  selectedTeamFilter: AdminProjectTeamFilter;
  selectedReportFilter: AdminProjectReportFilter;
  showTeamFilter: boolean;
  divisionId?: string | "UNASSIGNED";
  query: string;
}) {
  return (
    <UiSection aria-labelledby="admin-project-operations-title" className="grid gap-3 border-b border-[var(--line)] py-5">
      <h2 id="admin-project-operations-title" className="sr-only"><UiText>{"프로젝트 필터"}</UiText></h2>
      {showTeamFilter ? <FilterGroup axis="team" label="팀 구성" cards={teamCards} selectedFilter={selectedTeamFilter} operations={operations} programId={programId} divisionId={divisionId} query={query} teamStatus={selectedTeamFilter} reportStatus={selectedReportFilter} /> : null}
      <FilterGroup axis="report" label="필수 보고서" cards={reportCards} selectedFilter={selectedReportFilter} operations={operations} programId={programId} divisionId={divisionId} query={query} teamStatus={selectedTeamFilter} reportStatus={selectedReportFilter} />
    </UiSection>
  );
}

function FilterGroup<TFilter extends AdminProjectTeamFilter | AdminProjectReportFilter>({
  axis,
  label,
  cards,
  selectedFilter,
  operations,
  programId,
  divisionId,
  query,
  teamStatus,
  reportStatus,
}: {
  axis: "team" | "report";
  label: string;
  cards: Array<{ filter: TFilter; label: string; count: keyof AdminProgramProjectOperations["summary"] }>;
  selectedFilter: TFilter;
  operations: AdminProgramProjectOperations;
  programId: string;
  divisionId?: string | "UNASSIGNED";
  query: string;
  teamStatus: AdminProjectTeamFilter;
  reportStatus: AdminProjectReportFilter;
}) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <span aria-hidden="true" className="w-16 shrink-0 text-xs font-bold text-[var(--muted)]"><UiText>{label}</UiText></span>
      <UiNav aria-label={label} className="flex shrink-0 gap-2">
        {cards.map((card) => {
          const selected = selectedFilter === card.filter;
          const nextFilters = axis === "team"
            ? { teamStatus: card.filter as AdminProjectTeamFilter, reportStatus }
            : { teamStatus, reportStatus: card.filter as AdminProjectReportFilter };
          return (
            <Link
              key={card.filter}
              href={topicsHref({ programId, divisionId, q: query, ...nextFilters })}
              aria-current={selected ? "page" : undefined}
              aria-label={`${card.label} ${operations.summary[card.count]}개`}
              className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors ${selected
                ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]"
                : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"}`}
            >
              <UiText>{card.label}</UiText>
              <strong className={`grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[0.6875rem] leading-4 ${selected ? "bg-white text-[var(--primary)]" : "bg-[var(--surface-subtle)] text-[var(--ink)]"}`}>{operations.summary[card.count]}</strong>
            </Link>
          );
        })}
      </UiNav>
    </div>
  );
}
