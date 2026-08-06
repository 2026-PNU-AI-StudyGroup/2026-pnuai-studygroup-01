import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { ReactNode } from "react";

import { AdminSidebar } from "@/app/_components/admin-sidebar";

export function AdminWorkspace({ currentPath, eyebrow, title, description, actions, children }: { currentPath: string; eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return <main className="min-h-[calc(100vh-4.5rem)] lg:min-h-screen">
    <div className="grid w-full lg:grid-cols-[15.5rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="min-w-0 overflow-hidden border-b border-[var(--line)] bg-white lg:min-h-screen lg:overflow-visible lg:border-b-0 lg:border-r">
        <AdminSidebar currentPath={currentPath} />
      </aside>
      <div className="min-w-0 px-5 pb-24 pt-6 sm:px-8 lg:px-10 lg:pb-12 lg:pt-10 xl:px-12 2xl:px-14">
        <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            {eyebrow ? <p className="mb-2 text-xs font-bold text-[var(--primary)]"><UiText>{eyebrow}</UiText></p> : null}
            <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-semibold leading-tight tracking-[-0.035em]"><UiText>{title}</UiText></h1>
            {description ? <p className="mt-2 max-w-3xl text-[0.9375rem] leading-6 text-[var(--muted)]"><UiText>{description}</UiText></p> : null}
          </div>
          {actions ? <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:shrink-0 [&>*]:max-sm:flex-1">{actions}</div> : null}
        </header>
        <div className="page-enter space-y-8 pt-7"><UiText>{children}</UiText></div>
      </div>
    </div>
  </main>;
}
