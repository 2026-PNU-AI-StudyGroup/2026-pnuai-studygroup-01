import Link from "next/link";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ExplorerHero } from "@/shared/ui/explorer-hero";

import type { PublicTopicPage, PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";

const phaseLabel: Record<PublicTopicPhase, string> = {
  ACTIVE: "전체",
  RECRUITING: "모집 중",
  CLOSING_SOON: "마감 임박",
};

export function ProjectPortalHero({ view, program }: {
  view: "active" | "past";
  program?: { name: string; category: string; description?: string };
}) {
  const title = program?.name ?? (view === "past" ? "지난 프로젝트" : "전체 프로젝트");
  const description = program?.description ?? (view === "past" ? "완료된 프로젝트와 결과물을 둘러보세요." : "현재 참여할 수 있는 프로젝트를 한곳에서 찾아보세요.");
  return (
    <ExplorerHero
      title={<UiText>{title}</UiText>}
      description={<UiText>{description}</UiText>}
      context={program?.category ? <UiText>{program.category}</UiText> : undefined}
      mark={program ? program.name.replace(/[^A-Za-z가-힣]/g, "").slice(0, 2) : "P"}
    />
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
    <UiNav aria-label="프로젝트 상태" className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {(Object.keys(phaseLabel) as PublicTopicPhase[]).map((item) => {
        const selected = phase === item;
        return <Link key={item} href={activeUrl(item)} aria-current={selected ? "page" : undefined} className={`flex min-h-9 shrink-0 items-center justify-center rounded-lg border px-3 text-xs font-bold transition-colors ${selected ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]" : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"}`}>{phaseLabel[item]} <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold ${selected ? "bg-white text-[var(--primary)]" : "bg-[var(--surface-subtle)] text-[var(--muted)]"}`}>{counts[item]}</span></Link>;
      })}
    </UiNav>
  );
}
