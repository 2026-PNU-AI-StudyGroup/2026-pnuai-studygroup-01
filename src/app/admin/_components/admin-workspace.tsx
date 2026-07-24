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
  const isActive = (href: string) => currentPath === href || currentPath.startsWith(`${href}/`);
  const currentItem = items.find(([href]) => isActive(href)) ?? items[0];

  return <main className="content-shell lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-14">
    <aside className="mb-10 rounded-[var(--radius-panel)] border border-white bg-white/82 p-5 shadow-[0_16px_42px_rgba(23,32,51,.08)] backdrop-blur lg:mb-0 lg:self-start lg:sticky lg:top-24">
      <p className="text-sm font-extrabold text-[var(--ink)]">관리자 업무</p>
      <details className="group mt-4 lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-2.5 [&::-webkit-details-marker]:hidden">
          <span><strong className="block text-sm text-[var(--primary-hover)]">{currentItem[1]}</strong><span className="mt-0.5 block text-xs text-[var(--muted)]">{currentItem[2]}</span></span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0 fill-none stroke-[var(--muted)] stroke-[1.8] transition-transform group-open:rotate-180"><path d="m6 8 4 4 4-4" /></svg>
        </summary>
        <nav aria-label="관리자 업무" className="mt-2 grid gap-1 rounded-[var(--radius-control)] border border-[var(--line)] bg-white p-2">
          {items.map(([href, label, hint]) => {
            const active = isActive(href);
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? "bg-[var(--primary-subtle)] font-extrabold text-[var(--primary-hover)]" : "text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"}`}>
              <span className="block">{label}</span><span className="mt-0.5 block text-xs font-normal text-[var(--muted)]">{hint}</span>
            </Link>;
          })}
        </nav>
      </details>
      <nav aria-label="관리자 업무" className="mt-4 hidden gap-1 lg:grid">
        {items.map(([href, label, hint]) => {
          const active = isActive(href);
          return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`min-w-max border-l-2 px-4 py-3 text-sm transition-colors motion-reduce:transition-none lg:min-w-0 ${active ? "border-[var(--primary)] bg-[var(--primary-subtle)] font-extrabold text-[var(--primary-hover)]" : "border-transparent text-[var(--muted)] hover:border-[var(--line)] hover:text-[var(--ink)]"}`}>
            <span className="block">{label}</span><span className="mt-1 hidden text-xs font-normal text-[var(--muted)] lg:block">{hint}</span>
          </Link>;
        })}
      </nav>
    </aside>
    <div className="min-w-0">
      <header className="visual-page-header relative isolate overflow-hidden rounded-[var(--radius-panel)] border border-white/10 bg-[#0b1740] px-6 py-8 text-white shadow-[0_22px_55px_rgba(7,17,47,.18)] sm:px-8">
        <p className="text-xs font-extrabold tracking-[0.14em] text-[#f0bd54]">{eyebrow}</p>
        <div className="mt-3 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl"><h1 className="editorial-title text-white">{title}</h1><p className="mt-3 text-base leading-7 text-white/62">{description}</p></div>
          {actions ? <div className="flex w-full flex-wrap gap-2 xl:w-auto xl:shrink-0 [&>*]:max-sm:flex-1">{actions}</div> : null}
        </div>
      </header>
      <div className="space-y-10 pt-8">{children}</div>
    </div>
  </main>;
}
