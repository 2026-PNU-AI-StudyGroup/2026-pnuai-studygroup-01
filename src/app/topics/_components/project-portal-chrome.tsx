import Link from "next/link";

import type { PublicTopicPage, PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";

const phaseLabel: Record<PublicTopicPhase, string> = {
  ACTIVE: "진행 중",
  RECRUITING: "모집 중",
  CLOSING_SOON: "마감 임박",
};

export function ProjectPortalHero({ view }: { view: "active" | "past" }) {
  return (
    <section aria-labelledby="project-portal-title" className="border-b border-[var(--line)] pb-5">
      <h1 id="project-portal-title" className="text-[clamp(2.15rem,4vw,3rem)] font-black leading-none tracking-[-0.055em] text-[var(--ink)]">
        프로젝트
      </h1>
      <p className="sr-only">{view === "past" ? "지난 프로젝트" : "진행 중 프로젝트"}</p>
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
    <nav aria-label="프로젝트 상태" className="grid min-w-0 flex-1 grid-cols-3 gap-1.5 sm:flex sm:flex-none">
      {(Object.keys(phaseLabel) as PublicTopicPhase[]).map((item) => {
        const selected = phase === item;
        return <Link key={item} href={activeUrl(item)} aria-current={selected ? "page" : undefined} className={`flex min-h-10 min-w-0 items-center justify-center rounded-[var(--radius-control)] px-2 text-xs font-bold transition-colors sm:shrink-0 sm:px-3.5 sm:text-sm ${selected ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:bg-white hover:text-[var(--ink)]"}`}>{phaseLabel[item]} <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[0.68rem] font-bold sm:ml-2 ${selected ? "bg-white/16 text-white" : "bg-white text-[var(--muted)]"}`}>{counts[item]}</span></Link>;
      })}
    </nav>
  );
}
