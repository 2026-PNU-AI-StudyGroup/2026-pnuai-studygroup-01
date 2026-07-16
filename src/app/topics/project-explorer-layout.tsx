import Link from "next/link";
import type { ReactNode } from "react";

import type { UserRole } from "@/modules/identity/domain/user-role";

export type ProjectView = "active" | "past";

function viewClass(selected: boolean) {
  return selected
    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
    : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]";
}

export function ProjectExplorerLayout({ role, view, children }: { role: UserRole; view: ProjectView; children: ReactNode }) {
  const projectLabel = role === "STUDENT" ? "내 프로젝트" : role === "PROFESSOR" ? "지도 프로젝트" : "전체 프로젝트";
  return (
    <main className="content-shell">
      <div className="lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12">
        <aside aria-label="프로젝트 탐색 메뉴" className="hidden border-r border-[var(--line)] pr-8 lg:block">
          <p className="eyebrow">프로젝트 탐색</p>
          <nav className="mt-5 grid gap-1">
            <Link href="/topics?view=active" aria-current={view === "active" ? "page" : undefined} className={`snap-color flex min-h-11 items-center border-l-2 pl-4 text-sm font-extrabold ${view === "active" ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}>진행 중 프로젝트</Link>
            <Link href="/topics?view=past" aria-current={view === "past" ? "page" : undefined} className={`snap-color flex min-h-11 items-center border-l-2 pl-4 text-sm font-extrabold ${view === "past" ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}>종료된 프로젝트</Link>
          </nav>
          <nav aria-label="내 프로젝트 메뉴" className="mt-6 grid gap-1 border-t border-[var(--line)] pt-5">
            <Link href="/dashboard" className="button-quiet justify-start px-4 text-sm">{projectLabel}</Link>
            {role === "STUDENT" ? <Link href="/recruitments" className="button-quiet justify-start px-4 text-sm">팀원 모집</Link> : null}
          </nav>
        </aside>

        <div className="min-w-0">
          <nav aria-label="프로젝트 상태 전환" className="mb-8 grid grid-cols-2 gap-2 lg:hidden">
            <Link href="/topics?view=active" aria-current={view === "active" ? "page" : undefined} className={`snap-color inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-extrabold ${viewClass(view === "active")}`}>진행 중</Link>
            <Link href="/topics?view=past" aria-current={view === "past" ? "page" : undefined} className={`snap-color inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-extrabold ${viewClass(view === "past")}`}>종료됨</Link>
          </nav>
          <div className="space-y-10">{children}</div>
        </div>
      </div>
    </main>
  );
}
