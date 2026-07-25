import { AppShellSkeleton } from "@/app/_components/app-shell-skeleton";
import { StudentTeamSectionLayout } from "@/modules/student-team/ui/student-team-section-layout";

export default function TeamsLoading() {
  return (
    <AppShellSkeleton label="팀 관리 화면을 불러오는 중">
      <main className="pb-28 lg:min-h-screen lg:pb-0">
        <StudentTeamSectionLayout currentPath="/teams">
        <div aria-hidden="true" className="grid gap-8">
          <header className="grid gap-6 rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <div className="skeleton h-3 w-20 rounded-full" />
              <div className="skeleton mt-5 h-12 w-52 rounded-lg" />
              <div className="skeleton mt-5 h-5 max-w-xl rounded-full" />
            </div>
            <div className="flex gap-2">
              <div className="skeleton h-11 w-28 rounded-[var(--radius-control)]" />
              <div className="skeleton h-11 w-32 rounded-[var(--radius-control)]" />
            </div>
          </header>

          <section>
            <div className="flex items-end justify-between border-b border-[var(--line)] pb-4">
              <div>
                <div className="skeleton h-7 w-36 rounded-md" />
                <div className="skeleton mt-3 h-4 w-72 rounded-full" />
              </div>
              <div className="skeleton h-4 w-10 rounded-full" />
            </div>
            <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white px-6">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="grid min-h-28 gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_8rem_6rem] lg:items-center"
                >
                  <div>
                    <div className="skeleton h-5 w-52 rounded" />
                    <div className="skeleton mt-3 h-4 max-w-lg rounded-full" />
                  </div>
                  <div className="skeleton h-4 w-20 rounded-full" />
                  <div className="skeleton h-9 w-20 rounded-[var(--radius-control)]" />
                </div>
              ))}
            </div>
          </section>
        </div>
        </StudentTeamSectionLayout>
      </main>
    </AppShellSkeleton>
  );
}
