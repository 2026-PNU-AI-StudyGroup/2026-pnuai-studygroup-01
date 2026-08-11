import type { ReactNode } from "react";

export function ResponsiveSectionNavigation({
  eyebrow,
  label,
  meta,
  children,
}: {
  eyebrow: ReactNode;
  label: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="group lg:hidden">
      <summary className="flex min-h-[4.5rem] cursor-pointer list-none items-center gap-3 border-y border-[var(--line)] py-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
            {eyebrow}
          </span>
          <strong className="mt-1 block truncate text-sm font-bold text-[var(--ink)]">
            {label}
          </strong>
        </span>
        {meta ? <span className="shrink-0 text-xs font-bold text-[var(--primary)]">{meta}</span> : null}
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="size-5 shrink-0 fill-none stroke-[var(--muted)] stroke-[1.75] transition-transform group-open:rotate-180"
        >
          <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="max-h-[min(62vh,32rem)] overflow-y-auto border-b border-[var(--line)] py-3">
        {children}
      </div>
    </details>
  );
}
