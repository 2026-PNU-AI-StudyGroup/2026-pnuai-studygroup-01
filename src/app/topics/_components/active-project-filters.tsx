import { ProjectStatusNavigation } from "@/app/topics/_components/project-portal-chrome";
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
    <section aria-label="프로젝트 검색과 필터" className="border-b border-[var(--line)] pb-5">
      <form className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 md:grid-cols-[minmax(0,1fr)_11.5rem_auto] md:items-center" action="/topics" role="search">
        <input type="hidden" name="phase" value={phase} />
        {programId ? <input type="hidden" name="programId" value={programId} /> : null}
        <label className="relative col-span-2 block md:col-span-1">
          <span className="sr-only">프로젝트 검색</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 fill-none stroke-[var(--muted)] stroke-[1.75]">
            <circle cx="11" cy="11" r="7" />
            <path d="m16.5 16.5 4 4" />
          </svg>
          <input
            type="search"
            name="q"
            defaultValue={query}
            maxLength={100}
            placeholder="주제명이나 기술로 검색"
            className="field min-h-13 w-full bg-white pl-12 text-[0.95rem]"
          />
        </label>
        <label>
          <span className="sr-only">프로젝트 정렬</span>
          <CustomSelect name="sort" defaultValue={sort} options={[
            { value: "LATEST", label: "최근 등록순" },
            { value: "DEADLINE", label: "마감 임박순" },
          ]} />
        </label>
        <button type="submit" className="button-primary min-h-13 px-5">검색</button>
      </form>
      <div className="mt-4 flex items-center gap-3 overflow-hidden">
        <span className="shrink-0 text-xs font-black text-[var(--muted)]">상태</span>
        <ProjectStatusNavigation phase={phase} counts={counts} programId={programId} query={query} sort={sort} />
      </div>
    </section>
  );
}
