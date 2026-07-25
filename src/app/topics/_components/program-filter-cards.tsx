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
      <div className="mb-3">
        <h2 id="program-choice-title" className="text-lg font-black tracking-[-0.025em]">프로그램</h2>
      </div>
      <nav aria-label="프로그램 선택" className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <ul className="grid min-w-[48rem] grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-2.5">
          <li className="min-w-0">
            <ProgramFilterCard href={allHref} selected={!selectedId} name="전체 프로젝트" category={`${options.length}개 프로그램`} />
          </li>
          {options.map((option) => (
            <li key={option.id} className="min-w-0">
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
      className={`group flex h-[5.25rem] w-full min-w-0 flex-col justify-between rounded-[var(--radius-control)] border p-3.5 transition-[border-color,background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 ${
        selected
          ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary-hover)]"
          : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--line-strong)]"
      }`}
    >
      <span className={`text-[0.68rem] font-bold ${selected ? "text-[var(--primary)]" : "text-[var(--muted)]"}`}>{category}</span>
      <span className="truncate text-sm font-black">{name}</span>
    </Link>
  );
}
