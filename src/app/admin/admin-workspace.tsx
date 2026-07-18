import Link from "next/link";
import type { ReactNode } from "react";

const items = [
  ["/admin/programs", "프로그램", "개설과 공개 상태"],
  ["/admin/academic-cycles", "운영 학기", "연도와 학기 기준"],
  ["/admin/professors", "교수 권한", "교수 접근 승인"],
  ["/admin/users", "사용자", "계정 상태 관리"],
  ["/admin/audit", "감사 기록", "중요 변경 추적"],
] as const;

export function AdminWorkspace({ currentPath, eyebrow = "학과 운영", title, description, actions, children }: { currentPath: string; eyebrow?: string; title: string; description: string; actions?: ReactNode; children: ReactNode }) {
  return <main className="content-shell lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-14">
    <aside className="mb-10 border-b border-[var(--line)] pb-5 lg:mb-0 lg:border-b-0 lg:border-r lg:pr-7">
      <p className="text-sm font-extrabold text-[var(--ink)]">관리자 업무</p>
      <nav aria-label="관리자 업무" className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:grid lg:gap-1">
        {items.map(([href, label, hint]) => {
          const active = currentPath === href || currentPath.startsWith(`${href}/`);
          return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`min-w-max border-l-2 px-4 py-3 text-sm transition-colors motion-reduce:transition-none lg:min-w-0 ${active ? "border-[var(--primary)] bg-[var(--primary-subtle)] font-extrabold text-[var(--primary-hover)]" : "border-transparent text-[var(--muted)] hover:border-[var(--line)] hover:text-[var(--ink)]"}`}>
            <span className="block">{label}</span><span className="mt-1 hidden text-xs font-normal text-[var(--muted)] lg:block">{hint}</span>
          </Link>;
        })}
      </nav>
      <p className="mt-8 hidden border-l-2 border-[var(--accent)] pl-4 text-xs leading-5 text-[var(--muted)] lg:block">프로그램과 운영 기간을 먼저 확정한 뒤 교수 권한과 사용자를 관리합니다.</p>
    </aside>
    <div className="min-w-0">
      <header className="border-b border-[var(--line)] pb-8">
        <p className="text-xs font-extrabold tracking-[0.14em] text-[var(--primary)]">{eyebrow}</p>
        <div className="mt-3 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl"><h1 className="editorial-title">{title}</h1><p className="muted mt-3 text-base leading-7">{description}</p></div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      </header>
      <div className="space-y-10 pt-8">{children}</div>
    </div>
  </main>;
}
