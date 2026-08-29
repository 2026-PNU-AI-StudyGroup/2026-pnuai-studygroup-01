import type { ReactNode } from "react";

export function ExplorerLayout({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <main className="min-h-[calc(100vh-4.5rem)] lg:min-h-screen">
      <div className="grid w-full lg:grid-cols-[var(--shell-panel)_minmax(0,1fr)]">
        <aside className="shell-panel min-w-0 overflow-hidden border-b border-[var(--line)] bg-[var(--surface)] lg:min-h-screen lg:overflow-visible lg:border-b-0 lg:border-r">
          {/* 칸이 줄어드는 동안 안쪽은 제 폭을 지킨다. 안 그러면 글자가 눌려 줄바꿈이 요동친다. */}
          <div className="w-full bg-[var(--surface)] lg:min-h-screen lg:w-[var(--shell-panel-open)]">{sidebar}</div>
        </aside>
        <div className="min-w-0 px-5 pb-24 pt-6 sm:px-8 lg:px-10 lg:pb-12 lg:pt-10 xl:px-12 2xl:px-14">
          {children}
        </div>
      </div>
    </main>
  );
}
