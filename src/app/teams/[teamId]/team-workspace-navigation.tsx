"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  ["개요", ""],
  ["마일스톤", "/milestones"],
  ["진행 기록", "/progress"],
  ["토론", "/discussion"],
  ["보고서", "/reports"],
  ["결과물", "/artifacts"],
] as const;

export function TeamWorkspaceNavigation({ teamId }: { teamId: string }) {
  const pathname = usePathname();
  return <nav aria-label="프로젝트 공간" className="-mx-1 flex gap-7 overflow-x-auto border-b border-[var(--line)] px-1">
    {sections.map(([label, suffix]) => {
      const href = `/teams/${teamId}${suffix}`;
      const selected = suffix ? pathname.startsWith(href) : pathname === href;
      return <Link key={suffix || "overview"} href={href} aria-current={selected ? "page" : undefined} className={`portal-tab relative flex min-h-14 shrink-0 items-center text-sm font-extrabold ${selected ? "text-[var(--primary)] after:scale-x-100" : "text-[var(--muted)] hover:text-[var(--ink)] after:scale-x-0"}`}>{label}</Link>;
    })}
  </nav>;
}
