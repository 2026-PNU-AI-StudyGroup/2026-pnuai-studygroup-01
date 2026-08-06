import type { ReactNode } from "react";

export function ExplorerHero({
  title,
  details,
  description,
  context,
  action,
}: {
  title: ReactNode;
  details?: ReactNode;
  description?: ReactNode;
  context?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section aria-labelledby="explorer-hero-title" className="border-b border-[var(--line)] pb-7">
      <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 id="explorer-hero-title" className="truncate text-[clamp(1.55rem,3vw,2rem)] font-bold tracking-[-0.04em] text-[var(--ink)]">
            {title}
          </h1>
          {context || description ? (
            <p className="mt-1 line-clamp-1 text-sm font-semibold text-[var(--muted)]">
              {context}{context && description ? " · " : null}{description}
            </p>
          ) : null}
          {details ? <div className="mt-3">{details}</div> : null}
        </div>
        {action ? <div className="flex shrink-0">{action}</div> : null}
      </div>
    </section>
  );
}
