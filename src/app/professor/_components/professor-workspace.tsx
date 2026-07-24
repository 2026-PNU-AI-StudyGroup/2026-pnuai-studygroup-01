import Link from "next/link";
import type { ReactNode } from "react";

const items = [
  ["/professor/topics", "1. 주제 설계", "작성·공개·일정"],
  ["/professor/applications", "2. 지원 검토", "지원서·팀 확인"],
  ["/dashboard", "3. 팀 운영", "확정 팀·진행 기록"],
] as const;

export function ProfessorWorkspace({ currentPath, eyebrow = "지도 프로젝트", title, description, actions, children }: { currentPath: string; eyebrow?: string; title: string; description: string; actions?: ReactNode; children: ReactNode }) {
  return <main className="content-shell lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-14">
    <aside className="mb-10 rounded-[var(--radius-panel)] border border-white bg-white/82 p-5 shadow-[0_16px_42px_rgba(23,32,51,.08)] backdrop-blur lg:mb-0 lg:self-start lg:sticky lg:top-24">
      <p className="text-sm font-extrabold">교수 업무 흐름</p>
      <nav aria-label="교수 업무 흐름" className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:grid lg:gap-1">
        {items.map(([href, label, hint]) => {
          const active = href === "/dashboard" ? currentPath === href : currentPath === href || currentPath.startsWith(`${href}/`);
          return <Link key={href} href={href} aria-current={active ? "step" : undefined} className={`min-w-max border-l-2 px-4 py-3 text-sm transition-colors motion-reduce:transition-none lg:min-w-0 ${active ? "border-[var(--primary)] bg-[var(--primary-subtle)] font-extrabold text-[var(--primary-hover)]" : "border-transparent text-[var(--muted)] hover:border-[var(--line)] hover:text-[var(--ink)]"}`}><span className="block">{label}</span><span className="mt-1 hidden text-xs font-normal text-[var(--muted)] lg:block">{hint}</span></Link>;
        })}
      </nav>
      <p className="mt-8 hidden border-l-2 border-[var(--accent)] pl-4 text-xs leading-5 text-[var(--muted)] lg:block">주제를 공개하고 지원을 결정하면 확정된 팀의 운영 화면으로 이어집니다.</p>
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
