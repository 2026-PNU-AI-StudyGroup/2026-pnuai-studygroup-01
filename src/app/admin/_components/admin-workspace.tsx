import type { ReactNode } from "react";
import { WorkspaceNavigation } from "@/shared/ui/workspace-navigation";

const items = [
  ["/admin/programs", "프로그램", "개설과 공개 상태"],
  ["/admin/academic-cycles", "운영 학기", "연도와 학기 기준"],
  ["/admin/professors", "교수 권한", "교수 접근 승인"],
  ["/admin/users", "사용자", "계정 상태 관리"],
  ["/admin/audit", "감사 기록", "중요 변경 추적"],
] as const;

export function AdminWorkspace({ currentPath, eyebrow = "학과 운영", title, description, actions, children }: { currentPath: string; eyebrow?: string; title: string; description: string; actions?: ReactNode; children: ReactNode }) {
  const isActive = (href: string) => currentPath === href || currentPath.startsWith(`${href}/`);
  const navigationItems = items.map(([href, label, hint]) => ({
    href,
    label,
    hint,
    active: isActive(href),
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
    <WorkspaceNavigation label="관리자 업무" items={navigationItems} />
    <div className="space-y-10 pt-8">{children}</div>
  </main>;
}
