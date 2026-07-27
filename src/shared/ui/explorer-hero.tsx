import type { ReactNode } from "react";

export function ExplorerHero({
  title,
  description,
  context,
  mark,
  action,
}: {
  title: ReactNode;
  description: ReactNode;
  context?: ReactNode;
  mark: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section aria-labelledby="explorer-hero-title" className="border-b border-[var(--line)] pb-7">
      <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-full border border-[var(--primary)]/20 bg-white text-lg font-black text-[var(--primary)] shadow-[0_8px_24px_rgba(47,91,234,.08)]">
            {mark}
          </span>
          <div className="min-w-0">
            <h1 id="explorer-hero-title" className="truncate text-[clamp(1.55rem,3vw,2rem)] font-black tracking-[-0.04em] text-[var(--ink)]">
              {title}
            </h1>
            <p className="mt-1 line-clamp-1 text-sm font-semibold text-[var(--muted)]">
              {context ? <>{context}{" · "}</> : null}{description}
            </p>
          </div>
        </div>
        {action ? <div className="flex shrink-0 pl-[4.5rem] sm:pl-0">{action}</div> : null}
      </div>
    </section>
  );
}
