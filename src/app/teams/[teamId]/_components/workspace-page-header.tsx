import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { ReactNode } from "react";

export function WorkspacePageHeader({ eyebrow, title, titleId, description, meta, actions }: {
  eyebrow: string;
  title: string;
  titleId?: string;
  description: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[var(--line)] pb-6">
      <div className="max-w-2xl">
        <p className="eyebrow"><UiText>{eyebrow}</UiText></p>
        <h1 id={titleId} className="mt-2 text-[clamp(1.75rem,4vw,2.25rem)] font-black leading-tight tracking-[-0.045em]"><UiText>{title}</UiText></h1>
        <p className="muted mt-2 max-w-xl text-sm leading-6 sm:text-base"><UiText>{description}</UiText></p>
      </div>
      {actions ?? meta ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions ?? meta}</div> : null}
    </header>
  );
}

export function MobileFieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1 block text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-[var(--muted)] md:hidden"><UiText>{children}</UiText></span>;
}
