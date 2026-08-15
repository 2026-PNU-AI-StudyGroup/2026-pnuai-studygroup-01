import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { ReactNode } from "react";

export function WorkspacePageHeader({ eyebrow, title, titleId, description, meta, actions, bordered = true }: {
  eyebrow?: ReactNode;
  title: string;
  titleId?: string;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  bordered?: boolean;
}) {
  return (
    <header className={`flex flex-wrap items-end justify-between gap-5 ${bordered ? "border-b border-[var(--line)] pb-6" : ""}`}>
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow"><UiText>{eyebrow}</UiText></p> : null}
        <h1 id={titleId} className={`${eyebrow ? "mt-1.5" : ""} text-[clamp(1.375rem,2.2vw,1.75rem)] font-bold leading-[1.2] tracking-[-0.035em]`}><UiText>{title}</UiText></h1>
        {description ? <p className="muted mt-2 max-w-xl text-sm leading-6"><UiText>{description}</UiText></p> : null}
      </div>
      {actions || meta ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
          {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
    </header>
  );
}

export function MobileFieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1 block text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)] md:hidden"><UiText>{children}</UiText></span>;
}
