import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { ReactNode } from "react";

/** 운영 관리 화면의 본문 칸. 업무 목록(AdminSidebar)은 AppShell 의 panel 로 넘겨 왼쪽 메뉴에 둔다. */
export function AdminWorkspace({ eyebrow, title, description, actions, children }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return <main className="min-h-[calc(100vh-4.5rem)]">
    <div className="min-w-0 px-5 pb-24 pt-6 sm:px-8 lg:px-10 lg:pb-12 lg:pt-8 xl:px-12 2xl:px-14">
      <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="mb-1.5 text-[0.8125rem] font-medium text-[var(--muted)]"><UiText>{eyebrow}</UiText></p> : null}
          <h1 className="text-[clamp(1.5rem,2.4vw,1.875rem)] font-semibold leading-tight tracking-[-0.02em]"><UiText>{title}</UiText></h1>
          {description ? <p className="mt-2 max-w-3xl text-[0.9375rem] leading-6 text-[var(--muted)]"><UiText>{description}</UiText></p> : null}
        </div>
        {actions ? <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:shrink-0 [&>*]:max-sm:flex-1">{actions}</div> : null}
      </header>
      <div className="space-y-8 pt-7"><UiText>{children}</UiText></div>
    </div>
  </main>;
}
