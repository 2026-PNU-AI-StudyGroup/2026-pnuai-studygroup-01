import { UiSection } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ProjectStatusNavigation } from "@/app/topics/_components/project-portal-chrome";
import { ProjectSearchForm } from "@/app/topics/_components/project-search-form";
import type { PublicTopicPage, PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";
import { CustomSelect } from "@/shared/ui/custom-select";

export function ActiveProjectFilters({ phase, counts, programId, query, sort }: {
  phase: PublicTopicPhase;
  counts: PublicTopicPage["counts"];
  programId?: string;
  query: string;
  sort: PublicTopicSort;
}) {
  return (
    <UiSection aria-label="프로젝트 검색과 필터" className="pt-5">
      <ProjectSearchForm view="active" phase={phase} programId={programId} query={query} sort={sort} />

      <div className="flex flex-col gap-3 border-b border-[var(--line)] py-4 sm:flex-row sm:items-center sm:justify-between">
        <ProjectStatusNavigation phase={phase} counts={counts} programId={programId} query={query} sort={sort} />
        <form action="/topics" className="flex w-full shrink-0 gap-2 sm:w-auto">
          <input type="hidden" name="phase" value={phase} />
          {programId ? <input type="hidden" name="programId" value={programId} /> : null}
          {query ? <input type="hidden" name="q" value={query} /> : null}
          <label>
            <span className="sr-only"><UiText>{"프로젝트 정렬"}</UiText></span>
            <CustomSelect name="sort" defaultValue={sort} options={[
              { value: "LATEST", label: "최신순" },
              { value: "DEADLINE", label: "마감 임박순" },
            ]} />
          </label>
          <button type="submit" className="button-secondary min-h-[3.25rem] px-3 text-xs"><UiText>{"적용"}</UiText></button>
        </form>
      </div>
    </UiSection>
  );
}
