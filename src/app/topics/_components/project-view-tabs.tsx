import Link from "next/link";

import type { ProjectView } from "@/app/topics/_components/project-explorer-layout";

export function ProjectViewTabs({ view, query }: { view: ProjectView; query?: string }) {
  const activeHref = query ? `/topics?q=${encodeURIComponent(query)}` : "/topics";
  const pastHref = query ? `/topics?view=past&q=${encodeURIComponent(query)}` : "/topics?view=past";

  return (
    <nav aria-label="프로젝트 구분" className="flex gap-7 border-b border-[var(--line)]">
      <ProjectViewTab href={activeHref} selected={view === "active"} label="진행 중 프로젝트" />
      <ProjectViewTab href={pastHref} selected={view === "past"} label="지난 프로젝트" />
    </nav>
  );
}

function ProjectViewTab({ href, selected, label }: {
  href: string;
  selected: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={`relative flex min-h-12 items-center justify-center border-b-2 text-sm font-bold transition-colors ${selected ? "border-[var(--primary)] text-[var(--ink)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}
    >
      <span>{label}</span>
    </Link>
  );
}
