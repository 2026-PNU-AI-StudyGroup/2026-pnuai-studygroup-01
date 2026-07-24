import Link from "next/link";

type WorkspaceNavigationItem = {
  href: string;
  label: string;
  hint: string;
  active: boolean;
};

export function WorkspaceNavigation({
  label,
  items,
}: {
  label: string;
  items: WorkspaceNavigationItem[];
}) {
  const current = items.find((item) => item.active) ?? items[0];

  return (
    <nav aria-label={label} className="mt-8">
      <details className="group relative md:hidden">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-[var(--radius-control)] border border-[var(--line)] bg-white px-4 shadow-[var(--shadow-card)] [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <strong className="block truncate text-sm">{current.label}</strong>
            <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">{current.hint}</span>
          </span>
          <svg
            aria-hidden="true"
            className="size-5 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-[var(--radius-control)] border border-[var(--line)] bg-white p-1.5 shadow-[var(--shadow-float)]">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`block rounded-lg px-3 py-3 text-sm transition-colors ${
                item.active
                  ? "bg-[var(--primary-subtle)] font-extrabold text-[var(--primary)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"
              }`}
            >
              <span className="block">{item.label}</span>
              <span className="mt-0.5 block text-xs font-normal text-[var(--muted)]">{item.hint}</span>
            </Link>
          ))}
        </div>
      </details>

      <div className="hidden gap-1 rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-2 shadow-[var(--shadow-card)] md:flex">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={`min-w-0 flex-1 rounded-[var(--radius-control)] px-4 py-3 text-sm transition-colors ${
              item.active
                ? "bg-[var(--primary-subtle)] font-extrabold text-[var(--primary)]"
                : "text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"
            }`}
          >
            <span className="block truncate">{item.label}</span>
            <span className="mt-0.5 block truncate text-xs font-normal text-[var(--muted)]">{item.hint}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
