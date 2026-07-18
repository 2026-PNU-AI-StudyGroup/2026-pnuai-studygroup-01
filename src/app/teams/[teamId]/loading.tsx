export default function TeamWorkspaceLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="프로젝트 작업공간을 불러오는 중" className="space-y-8">
      <header className="border-b border-[var(--line)] pb-7">
        <div className="h-3 w-20 rounded bg-[var(--surface-subtle)]" />
        <div className="mt-4 h-9 w-64 max-w-full rounded bg-[var(--primary-subtle)]" />
        <div className="mt-3 h-5 w-96 max-w-full rounded bg-[var(--surface-subtle)]" />
      </header>
      <div className="border-t border-[var(--primary)]">
        {[0, 1, 2].map((item) => <div key={item} className="grid gap-3 border-b border-[var(--line)] py-6 sm:grid-cols-[8rem_minmax(0,1fr)]"><div className="h-4 w-20 rounded bg-[var(--surface-subtle)]" /><div className="space-y-3"><div className="h-5 w-2/3 rounded bg-[var(--surface-subtle)]" /><div className="h-4 w-full rounded bg-[var(--surface-subtle)]" /></div></div>)}
      </div>
      <span className="sr-only">잠시만 기다려 주세요.</span>
    </div>
  );
}
