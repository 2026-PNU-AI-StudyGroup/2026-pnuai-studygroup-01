import Link from "next/link";

import type { PublicTopicPage, PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";

const phaseLabel: Record<PublicTopicPhase, string> = {
  ACTIVE: "진행 중",
  RECRUITING: "모집 중",
  CLOSING_SOON: "마감 임박",
};

export function ProjectPortalHero({ view }: { view: "active" | "past" }) {
  return (
    <section aria-labelledby="project-portal-title" className="flex flex-col gap-5 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between lg:pb-7">
      <div className="min-w-0">
        <div className="mb-4 flex items-center gap-3">
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--primary)] text-white shadow-[0_10px_24px_rgb(45_94_218_/_0.2)]">
            <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.8]"><path d="M4 7.5 12 3l8 4.5-8 4.5-8-4.5Z"/><path d="m6 10.5 6 3.5 6-3.5v5L12 19l-6-3.5v-5Z"/></svg>
          </span>
          <p className="text-sm font-bold text-[var(--muted)]">프로젝트 탐색</p>
        </div>
        <h1 id="project-portal-title" className="text-[clamp(2rem,4vw,3rem)] font-black leading-[1.08] tracking-[-0.045em] text-[var(--ink)]">
          {view === "past" ? "지난 프로젝트" : "진행 중 프로젝트"}
        </h1>
        <p className="mt-3 max-w-2xl text-[0.95rem] leading-7 text-[var(--muted)]">{view === "past" ? "완료된 프로젝트의 과정과 결과물을 프로그램별로 살펴보세요." : "공개된 주제를 비교하고 함께하고 싶은 프로젝트를 찾아보세요."}</p>
      </div>
      <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold text-[var(--muted)] shadow-[0_8px_24px_rgb(23_32_51_/_0.05)]">
        <span aria-hidden="true" className="size-2 rounded-full bg-[var(--primary)]" />
        {view === "past" ? "완료 기록" : "현재 모집"}
      </div>
    </section>
  );
}

export function ProjectStatusNavigation({ phase, counts, programId, query, sort }: { phase: PublicTopicPhase; counts: PublicTopicPage["counts"]; programId?: string; query?: string; sort?: PublicTopicSort }) {
  const activeUrl = (item: PublicTopicPhase) => {
    const params = new URLSearchParams({ phase: item });
    if (programId) params.set("programId", programId);
    if (query) params.set("q", query);
    if (sort === "DEADLINE") params.set("sort", sort);
    return `/topics?${params.toString()}`;
  };
  return (
    <nav aria-label="프로젝트 상태" className="flex gap-1.5 overflow-x-auto">
      {(Object.keys(phaseLabel) as PublicTopicPhase[]).map((item) => {
        const selected = phase === item;
        return <Link key={item} href={activeUrl(item)} aria-current={selected ? "page" : undefined} className={`flex min-h-10 shrink-0 items-center rounded-xl px-3.5 text-sm font-bold transition-colors ${selected ? "bg-[var(--ink)] text-white shadow-[0_7px_18px_rgb(23_32_51_/_0.14)]" : "text-[var(--muted)] hover:bg-white hover:text-[var(--ink)]"}`}>{phaseLabel[item]} <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[0.68rem] font-bold ${selected ? "bg-white/16 text-white" : "bg-white text-[var(--muted)]"}`}>{counts[item]}</span></Link>;
      })}
    </nav>
  );
}
