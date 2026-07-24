import { Brand } from "@/shared/ui/brand";

export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-label="페이지를 불러오는 중" className="min-h-screen bg-[var(--canvas)]">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex h-[4.5rem] max-w-[1440px] items-center justify-between px-5 sm:px-8">
          <Brand href="/" />
          <div aria-hidden="true" className="skeleton h-9 w-24 rounded-lg" />
        </div>
      </header>
      <main className="content-shell">
        <span className="sr-only">페이지를 불러오고 있습니다.</span>
        <div aria-hidden="true" className="grid gap-8">
          <section className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-subtle)] p-7 sm:p-10">
            <div className="skeleton h-4 w-32 rounded" />
            <div className="skeleton mt-5 h-12 max-w-md rounded" />
            <div className="skeleton mt-5 h-5 max-w-2xl rounded" />
          </section>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="min-h-64 rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-6"><div className="skeleton h-6 w-24 rounded" /><div className="skeleton mt-7 h-8 w-3/4 rounded" /><div className="skeleton mt-5 h-4 w-full rounded" /><div className="skeleton mt-3 h-4 w-5/6 rounded" /><div className="skeleton mt-14 h-11 w-full rounded" /></div>)}
          </div>
        </div>
      </main>
    </div>
  );
}
