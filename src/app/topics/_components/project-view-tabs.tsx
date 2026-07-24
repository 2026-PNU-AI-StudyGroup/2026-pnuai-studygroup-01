import Link from "next/link";

import type { ProjectView } from "@/app/topics/_components/project-explorer-layout";

export function ProjectViewTabs({ view, query }: { view: ProjectView; query?: string }) {
  const activeHref = query ? `/topics?q=${encodeURIComponent(query)}` : "/topics";
  const pastHref = query ? `/topics?view=past&q=${encodeURIComponent(query)}` : "/topics?view=past";

  return (
    <nav aria-label="프로젝트 구분" className="mt-5 inline-grid w-full grid-cols-2 gap-1 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-1 sm:w-auto">
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
      className={`relative flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-all sm:min-w-44 ${selected ? "bg-white text-[var(--ink)] shadow-[0_7px_18px_rgb(23_32_51_/_0.08)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className={`size-4 fill-none stroke-current stroke-[1.8] ${selected ? "text-[var(--primary)]" : ""}`}>
        {icon === "calendar" ? <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16"/></> : <><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></>}
      </svg>
      <span>{label}</span>
    </Link>
  );
}
