import type { ReactNode } from "react";

export function ExplorerLayout({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <main className="min-h-[calc(100vh-4.5rem)] lg:min-h-screen">
      <div className="grid w-full lg:grid-cols-[15.5rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="min-w-0 overflow-hidden border-b border-[var(--line)] bg-white lg:min-h-screen lg:overflow-visible lg:border-b-0 lg:border-r">
          {sidebar}
        </aside>
        <div className="min-w-0 px-5 pb-24 pt-6 sm:px-8 lg:px-10 lg:pb-12 lg:pt-10 xl:px-12 2xl:px-14">
          {children}
        </div>
      </div>
    </main>
  );
}
