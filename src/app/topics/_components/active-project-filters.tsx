import { ProjectStatusNavigation } from "@/app/topics/_components/project-portal-chrome";
import type { PublicTopicPage, PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";

export function ActiveProjectFilters({ phase, counts, programId, query, sort }: {
  phase: PublicTopicPhase;
  counts: PublicTopicPage["counts"];
  programId?: string;
  query: string;
  sort: PublicTopicSort;
}) {
  return (
    <section aria-label="프로젝트 검색과 필터" className="grid gap-5 rounded-[var(--radius-panel)] bg-[var(--surface-subtle)] p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(30rem,.82fr)] lg:items-end">
      <div><p className="mb-2 text-xs font-extrabold text-[var(--muted)]">진행 상태</p><ProjectStatusNavigation phase={phase} counts={counts} programId={programId} query={query} sort={sort} /></div>
      <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end" action="/topics" role="search">
        <input type="hidden" name="phase" value={phase} />
        {programId ? <input type="hidden" name="programId" value={programId} /> : null}
        <label className="grid gap-2 text-xs font-extrabold text-[var(--muted)]">프로젝트 검색<input type="search" name="q" defaultValue={query} maxLength={100} placeholder="주제명·기술 키워드" className="field" /></label>
        <label className="grid gap-2 text-xs font-extrabold text-[var(--muted)]">정렬<select name="sort" defaultValue={sort} className="field"><option value="LATEST">최신 공개순</option><option value="DEADLINE">마감 임박순</option></select></label>
        <button type="submit" className="button-primary min-w-12 gap-2 sm:px-4"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.8]"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg><span>검색</span></button>
      </form>
    </section>
  );
}
