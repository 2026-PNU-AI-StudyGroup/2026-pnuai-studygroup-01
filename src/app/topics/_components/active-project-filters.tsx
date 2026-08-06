import { UiSection } from "@/modules/translation/ui/localized-elements";
import { ProjectStatusNavigation } from "@/app/topics/_components/project-portal-chrome";
import { ProjectSearchForm } from "@/app/topics/_components/project-search-form";
import { ProjectSortSelect } from "@/app/topics/_components/project-sort-select";
import type { PublicTopicPage, PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";

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
        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          <ProjectSortSelect phase={phase} programId={programId} query={query} sort={sort} />
        </div>
      </div>
    </UiSection>
  );
}
