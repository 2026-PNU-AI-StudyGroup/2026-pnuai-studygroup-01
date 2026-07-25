import type { ReactNode } from "react";

import { Brand } from "@/shared/ui/brand";

export function AppShellSkeleton({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      data-shell-skeleton="app"
      className="min-h-screen bg-[var(--workspace)]"
    >
      <span className="sr-only">{label}</span>
      <div
        aria-hidden="true"
        className="min-h-screen bg-[var(--workspace)] lg:grid lg:grid-cols-[6.5rem_minmax(0,1fr)]"
      >
        <aside className="hidden h-screen min-h-[42rem] flex-col items-center bg-[var(--sidebar)] px-2 py-6 lg:flex">
          <Brand href="/topics" variant="sidebar" inverse />
          <div className="mt-9 flex w-full flex-col gap-2">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex min-h-[4.4rem] flex-col items-center justify-center gap-2"
              >
                <div className="size-7 rounded-md bg-white/16" />
                <div className="h-2.5 w-12 rounded-full bg-white/16" />
              </div>
            ))}
          </div>
          <div className="mt-auto flex w-full flex-col items-center gap-5 pb-2">
            <div className="size-8 rounded-full bg-white/16" />
            <div className="size-8 rounded-full bg-white/16" />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
