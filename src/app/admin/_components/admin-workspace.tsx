import type { ReactNode } from "react";
import { WorkspaceNavigation } from "@/shared/ui/workspace-navigation";

const items = [
  ["/project-approvals", "프로젝트 승인", "학생 제안 검토"],
  ["/admin/programs", "프로그램", "개설과 공개 상태"],
  ["/admin/academic-cycles", "운영 학기", "연도와 학기 기준"],
  ["/admin/professors", "교수 권한", "교수 접근 승인"],
  ["/admin/users", "사용자", "계정 상태 관리"],
  ["/admin/audit", "감사 기록", "중요 변경 추적"],
] as const;

export function AdminWorkspace({ currentPath, title, description, actions, children }: { currentPath: string; eyebrow?: string; title: string; description: string; actions?: ReactNode; children: ReactNode }) {
  const isActive = (href: string) => currentPath === href || currentPath.startsWith(`${href}/`);
  const navigationItems = items.map(([href, label, hint]) => ({
    href,
    label,
    hint,
    active: isActive(href),
  }));

  return <main className="content-shell">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-bold leading-tight tracking-[-0.035em]">{title}</h1>
        <p className="mt-2 max-w-3xl text-[0.9375rem] leading-6 text-[var(--muted)]">{description}</p>
      </div>
      {actions ? <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:shrink-0 [&>*]:max-sm:flex-1">{actions}</div> : null}
    </header>
    <WorkspaceNavigation label="관리자 업무" items={navigationItems} />
    <div className="space-y-8 pt-7">{children}</div>
  </main>;
}
