import { topicsHref } from "@/app/topics/_lib/topics-query";
import { KpiStrip, type Kpi } from "@/modules/project-program/ui/work-screen";
import type {
  AdminProjectReportFilter,
  AdminProjectTeamFilter,
  AdminProgramProjectOperations,
} from "@/modules/team/application/list-admin-program-project-operations";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiNav } from "@/modules/translation/ui/localized-elements";

/**
 * 관리자 숫자 판. 칸 하나가 곧 목록 조건이다. 누르면 그 조건으로 목록을 좁히고,
 * 고른 칸을 다시 누르면 풀린다. 팀 조건과 보고서 조건은 서로 겹쳐 걸 수 있다.
 */
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
  const { summary } = operations;
  const href = (teamStatus: AdminProjectTeamFilter, reportStatus: AdminProjectReportFilter) =>
    topicsHref({ programId, divisionId, q: query, teamStatus, reportStatus });
  const team = (filter: Exclude<AdminProjectTeamFilter, "all">) => ({
    current: selectedTeamFilter === filter,
    href: href(selectedTeamFilter === filter ? "all" : filter, selectedReportFilter),
  });
  const report = (filter: Exclude<AdminProjectReportFilter, "all">) => ({
    current: selectedReportFilter === filter,
    href: href(selectedTeamFilter, selectedReportFilter === filter ? "all" : filter),
  });
  const share = (count: number) => summary.total ? <UiText>{`전체의 ${Math.round((count / summary.total) * 100)}%`}</UiText> : "-";
  const items: Kpi[] = [
    { label: "전체 프로젝트", value: summary.total, unit: "개", note: <UiText>{"조건 없이 보기"}</UiText>, href: href("all", "all"), current: selectedTeamFilter === "all" && selectedReportFilter === "all" },
    ...(showTeamFilter ? [
      { label: "팀 구성됨", value: summary.formed, unit: "개", note: share(summary.formed), ...team("formed") },
      { label: "팀 미구성", value: summary.unassigned, unit: "개", note: share(summary.unassigned), ...team("unassigned") },
    ] : []),
    { label: "보고서 기한 초과", value: summary.overdue, unit: "개", alert: true, note: <UiText>{"필수 보고서 기준"}</UiText>, ...report("overdue") },
    { label: "보고서 모두 제출", value: summary.submitted, unit: "개", note: share(summary.submitted), ...report("submitted") },
  ];
  return (
    <UiNav aria-label="프로젝트 조건">
      <KpiStrip items={items} />
    </UiNav>
  );
}
