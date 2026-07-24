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
    <section aria-labelledby="program-choice-title" className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-5 sm:p-6">
      <h2 id="program-choice-title" className="text-sm font-extrabold">프로그램 카테고리</h2>
      <details className="group mt-3 xl:hidden">
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
      <nav aria-label="프로그램 선택" className="mt-3 hidden gap-3 xl:grid xl:grid-cols-4">
        <ProgramFilterLink href={allHref} selected={!selectedId} name="전체 프로그램" />
        {options.map((option) => (
          <ProgramFilterLink key={option.id} href={option.href} selected={option.id === selectedId} name={option.name} category={option.category} />
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
    <Link href={href} aria-current={selected ? "page" : undefined} className={`flex min-h-12 min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors ${selected ? "bg-[var(--primary-subtle)] text-[var(--primary-hover)]" : "hover:bg-[var(--surface-subtle)]"}`}>
      <span className="min-w-0">
        {category ? <span className="block text-xs font-semibold text-[var(--muted)]">{category}</span> : null}
        <strong className="block truncate text-sm">{name}</strong>
      </span>
      {selected ? <span aria-hidden="true" className="text-sm font-black">✓</span> : null}
    </Link>
  );
}

function ProgramFilterLink({ href, selected, name, category }: {
  href: string;
  selected: boolean;
  name: string;
  category?: string;
}) {
  return (
    <Link href={href} aria-current={selected ? "page" : undefined} className={`program-choice flex min-h-16 min-w-0 items-center gap-3 border px-3.5 py-3 text-left sm:min-h-20 sm:px-4 ${selected ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--primary)] hover:bg-[var(--primary-subtle)]"}`}>
      <ProgramMark category={category} selected={selected} />
      <span className="min-w-0">
        {category ? <span className={`block text-xs font-semibold ${selected ? "text-white" : "text-[var(--muted)]"}`}>{category}</span> : null}
        <span className={`block text-sm font-extrabold leading-5 sm:text-base ${category ? "mt-0.5 sm:mt-1" : ""}`}>{name}</span>
      </span>
      {selected ? <span aria-hidden="true" className="ml-auto grid size-6 shrink-0 place-items-center rounded-full bg-white text-sm font-black text-[var(--primary)]">✓</span> : null}
    </Link>
  );
}

function ProgramMark({ category, selected }: { category?: string; selected: boolean }) {
  const normalized = category?.toLowerCase() ?? "";
  const path = normalized.includes("해커") || normalized.includes("대회")
    ? <><path d="M8 5h8v4a4 4 0 0 1-8 0V5Z"/><path d="M8 7H5v1a3 3 0 0 0 3 3m8-4h3v1a3 3 0 0 1-3 3M12 13v4m-3 2h6"/></>
    : normalized.includes("ai") || normalized.includes("인공지능") || normalized.includes("교육")
      ? <><path d="m5 16 3-7 7-3 4-1-1 4-3 7-7 3 1-5-4-4-5 1 4-4Z"/><circle cx="14" cy="10" r="1.5"/><path d="M7 16 4 19m8-3 1 4"/></>
      : normalized.includes("캡스톤")
        ? <><path d="M9 16h6m-5 3h4M8 12a5 5 0 1 1 8 0c-1 1-1.5 2-1.5 3h-5C9.5 14 9 13 8 12Z"/><path d="M12 2v2M4 9H2m20 0h-2M6 4l1.5 1.5M18 4l-1.5 1.5"/></>
        : <><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2 2.2 3 4.9 3 8s-1 5.8-3 8c-2-2.2-3-4.9-3-8s1-5.8 3-8Z"/></>;
  return <span aria-hidden="true" className={`program-mark grid size-10 shrink-0 place-items-center rounded-full sm:size-12 ${selected ? "bg-white/18 text-white" : "bg-[var(--primary-subtle)] text-[var(--primary)]"}`}><svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.8] sm:size-6">{path}</svg></span>;
}
