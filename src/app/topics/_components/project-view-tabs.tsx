import Link from "next/link";

import type { ProjectView } from "@/app/topics/_components/project-explorer-layout";

export function ProjectViewTabs({ view, query }: { view: ProjectView; query?: string }) {
  const activeHref = query ? `/topics?q=${encodeURIComponent(query)}` : "/topics";
  const pastHref = query ? `/topics?view=past&q=${encodeURIComponent(query)}` : "/topics?view=past";

  return (
    <nav aria-label="프로젝트 구분" className="grid grid-cols-2 border-b border-[var(--primary)]">
      <ProjectViewTab href={activeHref} selected={view === "active"} label="진행 중 프로젝트" icon="calendar" />
      <ProjectViewTab href={pastHref} selected={view === "past"} label="지난 프로젝트" icon="clock" />
    </nav>
  );
}

function ProjectViewTab({ href, selected, label, icon }: {
  href: string;
  selected: boolean;
  label: string;
  icon: "calendar" | "clock";
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={`project-view-tab relative flex min-h-16 items-center justify-center gap-3 rounded-t-[var(--radius-panel)] border border-b-0 px-4 text-base font-extrabold sm:min-h-20 sm:text-lg ${selected ? "border-[var(--primary)] bg-white text-[var(--primary)]" : "border-[var(--line)] bg-[var(--surface-subtle)] text-[var(--muted)] hover:text-[var(--primary)]"}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-none stroke-current stroke-[1.8]">
        {icon === "calendar" ? <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16"/></> : <><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></>}
      </svg>
      <span>{label}</span>
    </Link>
  );
}
