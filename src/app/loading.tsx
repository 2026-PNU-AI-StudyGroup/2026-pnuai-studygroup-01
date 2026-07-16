export default function Loading() {
  return (
    <main className="content-shell" role="status" aria-live="polite" aria-label="화면을 불러오는 중">
      <div className="animate-pulse motion-reduce:animate-none">
        <div className="h-3 w-24 rounded bg-[var(--surface-subtle)]" />
        <div className="mt-5 h-11 w-full max-w-md rounded bg-[var(--surface-subtle)]" />
        <div className="mt-4 h-5 w-full max-w-2xl rounded bg-[var(--surface-subtle)]" />
        <div className="mt-12 space-y-5 border-y border-[var(--line)] py-7">
          <div className="h-6 w-2/3 rounded bg-[var(--surface-subtle)]" />
          <div className="h-4 w-full rounded bg-[var(--surface-subtle)]" />
          <div className="h-4 w-5/6 rounded bg-[var(--surface-subtle)]" />
        </div>
      </div>
      <span className="sr-only">화면을 불러오고 있습니다.</span>
    </main>
  );
}
