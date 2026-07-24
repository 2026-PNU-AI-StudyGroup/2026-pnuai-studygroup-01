export function ApplicationSectionHeader({ eyebrow, title, titleId, count }: {
  eyebrow: string;
  title: string;
  titleId: string;
  count: number;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 bg-[var(--surface-subtle)] px-6 py-5">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={titleId} className="mt-1 text-xl font-extrabold tracking-[-0.02em]">{title}</h2>
      </div>
      <p className="text-sm font-bold text-[var(--muted)]">{count}건</p>
    </div>
  );
}
