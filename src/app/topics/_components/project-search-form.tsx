import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";
import { SearchIcon } from "@/shared/ui/workspace-icons";

export function ProjectSearchForm({
  view,
  phase,
  programId,
  query,
  sort,
}: {
  view: "active" | "past";
  phase?: PublicTopicPhase;
  programId?: string;
  query: string;
  sort?: PublicTopicSort;
}) {
  return (
    <form
      action="/topics"
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5"
      role="search"
    >
      {view === "past" ? <input type="hidden" name="view" value="past" /> : null}
      {phase ? <input type="hidden" name="phase" value={phase} /> : null}
      {programId ? <input type="hidden" name="programId" value={programId} /> : null}
      {sort ? <input type="hidden" name="sort" value={sort} /> : null}
      <label className="relative block">
        <span className="sr-only"><UiText>{"프로젝트 검색"}</UiText></span>
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--muted)]" />
        <UiInput
          type="search"
          name="q"
          defaultValue={query}
          maxLength={100}
          placeholder="프로젝트명, 주제, 기술 스택, 교수명으로 검색"
          className="form-control min-h-12 w-full bg-white pl-12 text-sm"
        />
      </label>
      <button type="submit" className="button-primary min-h-12 px-5">
        <UiText>{"검색"}</UiText>
      </button>
    </form>
  );
}
