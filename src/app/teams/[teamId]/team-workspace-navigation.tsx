"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { label: "개요", suffix: "", icon: "overview" },
  { label: "마일스톤", suffix: "/milestones", icon: "milestone" },
  { label: "진행 기록", suffix: "/progress", icon: "progress" },
  { label: "토론", suffix: "/discussion", icon: "discussion" },
  { label: "보고서", suffix: "/reports", icon: "report" },
  { label: "결과물", suffix: "/artifacts", icon: "artifact" },
] as const;

type WorkspaceIcon = typeof sections[number]["icon"];

function NavigationIcon({ name }: { name: WorkspaceIcon }) {
  const paths = {
    overview: <><path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z" /></>,
    milestone: <><path d="M5 4v16M5 6h11l-2 3 2 3H5" /></>,
    progress: <><path d="M5 19V9M12 19V5M19 19v-7" /></>,
    discussion: <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12h5" /></>,
    report: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></>,
    artifact: <><path d="M4 7h6l2 2h8v10H4z" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 fill-none stroke-current stroke-[1.7]">{paths[name]}</svg>;
}

export function TeamWorkspaceNavigation({ teamId }: { teamId: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="프로젝트 공간" className="-mx-5 overflow-x-auto px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex min-w-max gap-1 border-b border-[var(--line)] lg:min-w-0 lg:flex-col lg:border-0">
        {sections.map(({ label, suffix, icon }) => {
          const href = `/teams/${teamId}${suffix}`;
          const selected = suffix ? pathname.startsWith(href) : pathname === href;
          return (
            <li key={suffix || "overview"}>
              <Link
                href={href}
                aria-current={selected ? "page" : undefined}
                className={`snap-color relative flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-bold lg:w-full ${selected ? "bg-[var(--primary)] text-white" : "text-[var(--muted)] hover:bg-[var(--primary-subtle)] hover:text-[var(--primary-hover)]"}`}
              >
                <NavigationIcon name={icon} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
