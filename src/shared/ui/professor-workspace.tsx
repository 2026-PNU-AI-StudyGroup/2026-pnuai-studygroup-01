import type { ReactNode } from "react";

import { UiText } from "@/shared/i18n/i18n-provider";
import { WorkspaceNavigation } from "@/shared/ui/workspace-navigation";

const items = [
  ["/professor/topics", "주제 설계", "작성·공개·일정"],
  ["/professor/applications", "지원 검토", "지원자·팀 검토"],
  ["/dashboard", "프로젝트 운영", "확정 팀·작업 현황"],
  ["/project-approvals", "학생 제안", "승인·반려"],
] as const;

export function ProfessorWorkspace({ currentPath, eyebrow, title, description, actions, children }: {
  currentPath: string;
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigationItems = items.map(([href, label, hint]) => ({
    href,
    label,
    hint,
    active: href === "/dashboard" ? currentPath === href : currentPath === href || currentPath.startsWith(`${href}/`),
  }));

  return <main className="content-shell">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-2 text-xs font-black tracking-[0.14em] text-[var(--primary)]"><UiText>{eyebrow}</UiText></p> : null}
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-bold leading-tight tracking-[-0.035em]"><UiText>{title}</UiText></h1>
        <p className="mt-2 max-w-3xl text-[0.9375rem] leading-6 text-[var(--muted)]"><UiText>{description}</UiText></p>
      </div>
      {actions ? <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:shrink-0 [&>*]:max-sm:flex-1">{actions}</div> : null}
    </header>
    <WorkspaceNavigation label="프로젝트 운영 흐름" items={navigationItems} />
    <div className="space-y-8 pt-7"><UiText>{children}</UiText></div>
  </main>;
}
