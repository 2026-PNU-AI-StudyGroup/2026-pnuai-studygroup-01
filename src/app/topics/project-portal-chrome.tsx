import Image from "next/image";
import Link from "next/link";

import type { PublicTopicPage, PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";

const phaseLabel: Record<PublicTopicPhase, string> = {
  ACTIVE: "진행 중",
  RECRUITING: "모집 중",
  CLOSING_SOON: "마감 임박",
};

export function ProjectPortalHero({ view }: { view: "active" | "past" }) {
  return (
    <section aria-labelledby="project-portal-title" className="portal-hero -mx-6 -mt-10 overflow-hidden border-b border-[var(--line)] px-6 py-12 lg:-mx-10 lg:-mt-14 lg:grid lg:min-h-80 lg:grid-cols-[minmax(0,.72fr)_minmax(32rem,1.28fr)] lg:items-center lg:gap-6 lg:px-10 lg:py-8">
      <div className="portal-hero-copy max-w-xl">
        <p className="eyebrow text-[var(--primary)]">학과 프로젝트 포털</p>
        <h1 id="project-portal-title" className="mt-4 flex items-start gap-3 text-[clamp(2.75rem,5vw,4.25rem)] font-black leading-[1.04] tracking-[-0.05em]">
          <span>{view === "past" ? "지난 프로젝트" : "진행 중 프로젝트"}</span>
          <svg aria-hidden="true" viewBox="0 0 32 32" className="mt-1 size-8 shrink-0 fill-[var(--accent)] lg:size-10"><path d="M16 1.5c.9 7.3 4.2 10.6 11.5 11.5C20.2 13.9 16.9 17.2 16 24.5 15.1 17.2 11.8 13.9 4.5 13 11.8 12.1 15.1 8.8 16 1.5Z"/><path d="M26.5 21c.4 3.1 1.9 4.6 5 5-3.1.4-4.6 1.9-5 5-.4-3.1-1.9-4.6-5-5 3.1-.4 4.6-1.9 5-5Z"/></svg>
        </h1>
        <p className="muted mt-5 max-w-md text-lg leading-8">{view === "past" ? "선배들이 수행한 프로젝트를 연도별로 찾아보고 결과물을 참고해 보세요." : "다양한 프로그램의 주제를 비교하고 관심 있는 프로젝트에 지원해 보세요."}</p>
      </div>
      <div className="portal-hero-visual relative -mb-12 mt-8 min-h-64 lg:-mb-8 lg:mt-0 lg:min-h-80" aria-hidden="true"><Image src="/illustrations/project-collaboration.png" alt="" fill priority sizes="(min-width: 1024px) 58vw, 100vw" className="object-contain object-bottom" /></div>
    </section>
  );
}

export function ProjectStatusNavigation({ view, phase, counts, programId, query, sort }: { view: "active" | "past"; phase: PublicTopicPhase; counts: PublicTopicPage["counts"]; programId?: string; query?: string; sort?: PublicTopicSort }) {
  const activeUrl = (item: PublicTopicPhase) => {
    const params = new URLSearchParams({ phase: item });
    if (programId) params.set("programId", programId);
    if (query) params.set("q", query);
    if (sort === "DEADLINE") params.set("sort", sort);
    return `/topics?${params.toString()}`;
  };
  return (
    <nav aria-label="프로젝트 상태" className="flex gap-2 overflow-x-auto pb-1">
      {(Object.keys(phaseLabel) as PublicTopicPhase[]).map((item) => {
        const selected = view === "active" && phase === item;
        return <Link key={item} href={activeUrl(item)} aria-current={selected ? "page" : undefined} className={`flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-extrabold transition-colors ${selected ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"}`}>{phaseLabel[item]} <span className="ml-1.5 text-xs font-semibold">{counts[item]}</span></Link>;
      })}
      <Link href={query ? `/topics?view=past&q=${encodeURIComponent(query)}` : "/topics?view=past"} aria-current={view === "past" ? "page" : undefined} className={`flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-extrabold transition-colors ${view === "past" ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"}`}>지난 프로젝트</Link>
    </nav>
  );
}
