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
  return (
    <section aria-labelledby="program-choice-title">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 id="program-choice-title" className="text-lg font-black tracking-[-0.025em]">프로그램</h2>
        <p className="text-xs font-semibold text-[var(--muted)]">좌우로 넘겨 살펴보세요</p>
      </div>
      <nav aria-label="프로그램 선택" className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <ul className="flex min-w-max gap-2.5">
          <li>
            <ProgramFilterCard href={allHref} selected={!selectedId} name="전체 프로젝트" category={`${options.length}개 프로그램`} />
          </li>
          {options.map((option) => (
            <li key={option.id}>
              <ProgramFilterCard href={option.href} selected={option.id === selectedId} name={option.name} category={option.category} />
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}

function ProgramFilterCard({ href, selected, name, category }: {
  href: string;
  selected: boolean;
  name: string;
  category: string;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={`group flex h-[5.25rem] w-48 flex-col justify-between rounded-[0.9rem] border p-3.5 transition-[border-color,background-color,color,transform] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 ${
        selected
          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
          : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--line-strong)]"
      }`}
    >
      <span className={`text-[0.68rem] font-bold ${selected ? "text-white/72" : "text-[var(--muted)]"}`}>{category}</span>
      <span className="truncate text-sm font-black">{name}</span>
    </Link>
  );
}
