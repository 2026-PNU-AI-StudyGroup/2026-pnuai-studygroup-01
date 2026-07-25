import { AppShellSkeleton } from "@/app/_components/app-shell-skeleton";

export default function TeamWorkspaceLoading() {
  return (
    <AppShellSkeleton label="프로젝트 작업공간을 불러오는 중">
      <main
        aria-hidden="true"
        className="grid min-h-screen w-full grid-cols-[13.5rem_minmax(0,1fr)]"
      >
        <aside data-shell-skeleton="team-context" className="border-r border-[var(--line)] bg-white px-5 py-8">
          <div className="skeleton h-5 w-32 rounded" />
          <div className="skeleton mt-3 h-3 w-full rounded-full" />
          <div className="mt-7 border-t border-[var(--line)] pt-5">
            <div className="skeleton h-2.5 w-16 rounded-full" />
            <div className="skeleton mt-3 h-2 w-full rounded-full" />
          </div>
          <div className="mt-7 space-y-5">
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="skeleton size-5 rounded-md" />
                <div className="skeleton h-3 w-24 rounded-full" />
              </div>
            ))}
          </div>
          <div className="mt-8 border-t border-[var(--line)] pt-5">
            <div className="skeleton h-2.5 w-14 rounded-full" />
            <div className="skeleton mt-3 h-4 w-24 rounded-full" />
            <div className="skeleton mt-3 h-3 w-16 rounded-full" />
          </div>
        </aside>

        <div className="min-w-0 px-10 py-10 xl:px-12">
          <header className="border-b border-[var(--line)] pb-7">
            <div className="skeleton h-3 w-24 rounded-full" />
            <div className="skeleton mt-5 h-10 w-[min(34rem,70%)] rounded-lg" />
            <div className="skeleton mt-4 h-4 w-[min(44rem,90%)] rounded-full" />
          </header>
          <section className="mt-9 grid gap-3 border-b border-[var(--line)] pb-7 grid-cols-[8rem_minmax(0,1fr)_8rem] items-center">
            <div className="skeleton h-3 w-16 rounded-full" />
            <div className="skeleton h-5 w-72 rounded" />
            <div className="skeleton h-4 w-24 rounded-full" />
          </section>
          <section className="mt-10">
            <div className="skeleton h-3 w-16 rounded-full" />
            <div className="skeleton mt-3 h-7 w-40 rounded-md" />
            <div className="mt-4 grid border-y border-[var(--line)] grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="border-r border-[var(--line)] px-5 py-6 last:border-r-0">
                  <div className="skeleton size-2 rounded-full" />
                  <div className="skeleton mt-4 h-4 w-20 rounded" />
                  <div className="skeleton mt-3 h-3 w-32 rounded-full" />
                </div>
              ))}
            </div>
          </section>
          <section className="mt-10">
            <div className="skeleton h-3 w-20 rounded-full" />
            <div className="skeleton mt-3 h-7 w-48 rounded-md" />
            <div className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="grid min-h-20 grid-cols-[9rem_minmax(0,1fr)_10rem] items-center gap-3 py-4">
                  <div className="skeleton h-4 w-20 rounded" />
                  <div className="skeleton h-3 w-64 rounded-full" />
                  <div className="skeleton h-3 w-24 rounded-full" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </AppShellSkeleton>
  );
}
