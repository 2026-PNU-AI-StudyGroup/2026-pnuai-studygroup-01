import Link from "next/link";
import { UiText } from "@/shared/i18n/i18n-provider";
import { UiNav } from "@/shared/i18n/localized-elements";

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
    <UiNav aria-label={label} className="mt-5 border-b border-[var(--line)]">
      <details className="group relative pb-3 md:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-0 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <strong className="block truncate text-sm font-semibold"><UiText>{current.label}</UiText></strong>
            <span className="sr-only"><UiText>{current.hint}</UiText></span>
          </span>
          <svg
            aria-hidden="true"
            className="size-5 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <div className="absolute inset-x-0 top-full z-30 overflow-hidden rounded-[var(--radius-control)] border border-[var(--line)] bg-white p-1 shadow-[var(--shadow-float)]">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`block rounded-md px-3 py-2.5 text-sm transition-colors ${
                item.active
                  ? "bg-[var(--primary-subtle)] font-semibold text-[var(--primary)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"
              }`}
            >
              <span className="block"><UiText>{item.label}</UiText></span>
              <span className="sr-only"><UiText>{item.hint}</UiText></span>
            </Link>
          ))}
        </div>
      </details>

      <div className="hidden items-end gap-7 md:flex">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={`relative min-w-0 pb-3 text-sm transition-colors after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 ${
              item.active
                ? "font-semibold text-[var(--ink)] after:bg-[var(--primary)]"
                : "text-[var(--muted)] after:bg-transparent hover:text-[var(--ink)]"
            }`}
          >
            <span className="block truncate"><UiText>{item.label}</UiText></span>
            <span className="sr-only"><UiText>{item.hint}</UiText></span>
          </Link>
        ))}
      </div>
    </UiNav>
  );
}
