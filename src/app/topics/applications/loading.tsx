export default function TopicApplicationsLoading() {
  return (
    <main className="content-shell space-y-8" aria-busy="true" aria-label="지원 이력을 불러오는 중">
      <header className="border-b border-[var(--line)] pb-6">
        <div className="h-3 w-24 animate-pulse rounded bg-[var(--line)] motion-reduce:animate-none" />
        <div className="mt-4 h-10 w-40 animate-pulse rounded bg-[var(--line)] motion-reduce:animate-none" />
        <div className="mt-4 h-5 w-full max-w-xl animate-pulse rounded bg-[var(--surface-subtle)] motion-reduce:animate-none" />
      </header>
      <section className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)]">
        <div className="space-y-5 p-6 sm:p-8">
          <div className="h-5 w-52 animate-pulse rounded bg-[var(--line)] motion-reduce:animate-none" />
          <div className="h-9 w-full max-w-xl animate-pulse rounded bg-[var(--surface-subtle)] motion-reduce:animate-none" />
          <div className="grid grid-cols-3 gap-5 pt-4">
            {[0, 1, 2].map((step) => <div key={step} className="mx-auto size-9 animate-pulse rounded-full bg-[var(--line)] motion-reduce:animate-none" />)}
          </div>
          <div className="h-24 animate-pulse rounded-lg bg-[var(--primary-subtle)] motion-reduce:animate-none" />
          <div className="h-12 animate-pulse rounded-lg bg-[var(--surface-subtle)] motion-reduce:animate-none" />
        </div>
      </section>
      <p className="sr-only">지원 이력을 불러오고 있습니다.</p>
    </main>
  );
}
