import type { ReactNode } from "react";
import { WorkspaceNavigation } from "@/shared/ui/workspace-navigation";

const items = [
  ["/professor/topics", "1. 주제 설계", "작성·공개·일정"],
  ["/professor/applications", "2. 지원 검토", "지원서·팀 확인"],
  ["/dashboard", "3. 팀 운영", "확정 팀·진행 기록"],
] as const;

export function ProfessorWorkspace({ currentPath, eyebrow = "지도 프로젝트", title, description, actions, children }: { currentPath: string; eyebrow?: string; title: string; description: string; actions?: ReactNode; children: ReactNode }) {
  const navigationItems = items.map(([href, label, hint]) => ({
    href,
    label,
    hint,
    active: href === "/dashboard" ? currentPath === href : currentPath === href || currentPath.startsWith(`${href}/`),
  }));

  return <main className="content-shell">
    <header className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
      <div className="max-w-3xl">
        <p className="text-xs font-black tracking-[0.14em] text-[var(--primary)]">{eyebrow}</p>
        <h1 className="mt-2 text-[clamp(2.1rem,4vw,3rem)] font-black leading-[1.08] tracking-[-0.055em]">{title}</h1>
        <p className="mt-3 text-base leading-7 text-[var(--muted)]">{description}</p>
      </div>
      {actions ? <div className="flex w-full flex-wrap gap-2 xl:w-auto xl:shrink-0 [&>*]:max-sm:flex-1">{actions}</div> : null}
    </header>
    <WorkspaceNavigation label="교수 업무 흐름" items={navigationItems} />
    <div className="space-y-10 pt-8">{children}</div>
  </main>;
}
