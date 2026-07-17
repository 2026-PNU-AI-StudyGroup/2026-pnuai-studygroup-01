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
    <section aria-labelledby="project-portal-title" className="portal-hero -mx-6 -mt-10 border-b border-[var(--line)] px-6 py-12 lg:-mx-10 lg:-mt-14 lg:grid lg:min-h-80 lg:grid-cols-[minmax(0,.75fr)_minmax(28rem,1.25fr)] lg:items-center lg:gap-10 lg:px-10 lg:py-9">
      <div className="portal-hero-copy max-w-xl">
        <p className="eyebrow text-[var(--accent)]">학과 프로젝트 포털</p>
        <h1 id="project-portal-title" className="mt-4 text-[clamp(2.75rem,5vw,4.25rem)] font-black leading-[1.04] tracking-[-0.05em]">{view === "past" ? "지난 프로젝트" : "진행 중 프로젝트"}</h1>
        <p className="muted mt-5 max-w-md text-lg leading-8">{view === "past" ? "선배들이 수행한 프로젝트를 연도별로 찾아보고 결과물을 참고해 보세요." : "다양한 프로그램의 주제를 비교하고 관심 있는 프로젝트에 지원해 보세요."}</p>
      </div>
      <div className="portal-hero-visual relative mt-8 min-h-56 lg:mt-0 lg:min-h-72" aria-hidden="true"><Image src="/illustrations/project-collaboration.png" alt="" fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-contain object-bottom" /></div>
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
    <nav aria-label="프로젝트 상태" className="-mx-1 flex gap-7 overflow-x-auto border-b border-[var(--line)] px-1 pt-2">
      {(Object.keys(phaseLabel) as PublicTopicPhase[]).map((item) => {
        const selected = view === "active" && phase === item;
        return <Link key={item} href={activeUrl(item)} aria-current={selected ? "page" : undefined} className={`portal-tab relative flex min-h-14 shrink-0 items-center text-sm font-extrabold ${selected ? "text-[var(--primary)] after:scale-x-100" : "text-[var(--muted)] hover:text-[var(--ink)] after:scale-x-0"}`}>{phaseLabel[item]} <span className="ml-1.5 text-xs font-semibold">{counts[item]}</span></Link>;
      })}
      <Link href={query ? `/topics?view=past&q=${encodeURIComponent(query)}` : "/topics?view=past"} aria-current={view === "past" ? "page" : undefined} className={`portal-tab relative flex min-h-14 shrink-0 items-center text-sm font-extrabold ${view === "past" ? "text-[var(--primary)] after:scale-x-100" : "text-[var(--muted)] hover:text-[var(--ink)] after:scale-x-0"}`}>지난 프로젝트</Link>
    </nav>
  );
}
