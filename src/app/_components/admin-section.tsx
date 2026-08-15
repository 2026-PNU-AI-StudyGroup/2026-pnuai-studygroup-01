import type { ReactNode } from "react";

import { UiText } from "@/modules/translation/ui/i18n-provider";

export const adminRecordListClassName = "divide-y divide-[var(--line)] bg-white";
export const adminRecordRowClassName = "record-row px-5 py-5 sm:px-6";

export function AdminSection({
  id,
  title,
  description,
  meta,
  actions,
  children,
}: {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="admin-panel overflow-hidden">
      <header className="flex flex-col gap-4 border-b border-[var(--line)] bg-[var(--surface-subtle)] px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 id={id} className="text-lg font-bold tracking-[-0.025em] text-[var(--ink)]">
            <UiText>{title}</UiText>
          </h2>
          {description !== undefined && description !== null ? (
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              <UiText>{description}</UiText>
            </p>
          ) : null}
        </div>
        {actions !== undefined && actions !== null ? <div className="min-w-0 lg:ml-auto">{actions}</div> : null}
        {meta !== undefined && meta !== null ? <div className="shrink-0 text-sm font-semibold text-[var(--muted)]"><UiText>{meta}</UiText></div> : null}
      </header>
      {children}
    </section>
  );
}

export function AdminSectionEmpty({ children }: { children: ReactNode }) {
  return <div className="px-5 sm:px-6">{children}</div>;
}
