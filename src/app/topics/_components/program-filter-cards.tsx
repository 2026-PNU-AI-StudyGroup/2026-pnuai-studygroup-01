import Link from "next/link";

export type ProgramFilterOption = {
  id: string;
  name: string;
  category: string;
  href: string;
};

export function ProgramFilterCards({ allHref, options, selectedId }: {
  allHref: string;
  options: ProgramFilterOption[];
  selectedId?: string;
}) {
  const selectedOption = options.find((option) => option.id === selectedId);

  return (
    <section aria-labelledby="program-choice-title" className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_10px_30px_rgb(23_32_51_/_0.05)] lg:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="program-choice-title" className="text-sm font-black">프로그램</h2>
        <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-1 text-[0.68rem] font-bold text-[var(--muted)]">{options.length}개</span>
      </div>
      <details className="group mt-3 lg:hidden">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-2.5 transition-colors hover:border-[var(--primary)] [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-[var(--muted)]">{selectedOption?.category ?? "전체 보기"}</span>
            <strong className="mt-0.5 block truncate text-sm">{selectedOption?.name ?? "전체 프로그램"}</strong>
          </span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0 fill-none stroke-[var(--muted)] stroke-[1.8] transition-transform group-open:rotate-180"><path d="m6 8 4 4 4-4" /></svg>
        </summary>
        <nav aria-label="프로그램 선택" className="mt-2 grid gap-1.5 rounded-[var(--radius-control)] border border-[var(--line)] bg-white p-2">
          <ProgramFilterRow href={allHref} selected={!selectedId} name="전체 프로그램" />
          {options.map((option) => (
            <ProgramFilterRow key={option.id} href={option.href} selected={option.id === selectedId} name={option.name} category={option.category} />
          ))}
        </nav>
      </details>
      <nav aria-label="프로그램 선택" className="mt-4 hidden gap-1 lg:grid">
        <ProgramFilterRow href={allHref} selected={!selectedId} name="전체 프로그램" />
        {options.map((option) => (
          <ProgramFilterRow key={option.id} href={option.href} selected={option.id === selectedId} name={option.name} category={option.category} />
        ))}
      </nav>
    </section>
  );
}

function ProgramFilterRow({ href, selected, name, category }: {
  href: string;
  selected: boolean;
  name: string;
  category?: string;
}) {
  return (
    <Link href={href} aria-current={selected ? "page" : undefined} className={`group flex min-h-12 min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${selected ? "bg-[var(--primary-subtle)] text-[var(--primary-hover)]" : "text-[var(--ink)] hover:bg-[var(--surface-subtle)]"}`}>
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${selected ? "bg-[var(--primary)]" : "bg-[var(--line-strong)] group-hover:bg-[var(--primary)]"}`} />
      <span className="min-w-0">
        {category ? <span className="block text-xs font-semibold text-[var(--muted)]">{category}</span> : null}
        <strong className="block truncate text-sm">{name}</strong>
      </span>
      {selected ? <svg aria-hidden="true" viewBox="0 0 20 20" className="ml-auto size-4 shrink-0 fill-none stroke-current stroke-2"><path d="m5 10 3 3 7-7" /></svg> : null}
    </Link>
  );
}
