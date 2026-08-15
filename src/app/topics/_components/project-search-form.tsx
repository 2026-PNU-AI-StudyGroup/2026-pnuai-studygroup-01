import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { SearchIcon } from "@/shared/ui/workspace-icons";
import type {
  AdminProjectReportFilter,
  AdminProjectTeamFilter,
} from "@/modules/team/application/list-admin-program-project-operations";

export function ProjectSearchForm({
  view,
  programId,
  query,
  divisionId,
  teamStatus,
  reportStatus,
}: {
  view: "active" | "past";
  programId?: string;
  query: string;
  divisionId?: string | "UNASSIGNED";
  teamStatus?: AdminProjectTeamFilter;
  reportStatus?: AdminProjectReportFilter;
}) {
  return (
    <form
      action="/topics"
      className="w-full sm:w-72"
      role="search"
    >
      {view === "past" ? <input type="hidden" name="view" value="past" /> : null}
      {programId ? <input type="hidden" name="programId" value={programId} /> : null}
      {divisionId ? <input type="hidden" name="divisionId" value={divisionId} /> : null}
      {teamStatus && teamStatus !== "all" ? <input type="hidden" name="teamStatus" value={teamStatus} /> : null}
      {reportStatus && reportStatus !== "all" ? <input type="hidden" name="reportStatus" value={reportStatus} /> : null}
      <label className="relative block">
        <span className="sr-only"><UiText>{"프로젝트 검색"}</UiText></span>
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--muted)]" />
        <UiInput
          type="search"
          name="q"
          defaultValue={query}
          maxLength={100}
          placeholder="프로젝트 검색"
          className="form-control min-h-10 w-full bg-white pl-11 text-sm"
        />
      </label>
    </form>
  );
}
