export function ApplicationSectionHeader({ eyebrow, title, titleId, count }: {
  eyebrow: string;
  title: string;
  titleId: string;
  count: number;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] px-6 py-5 sm:px-7">
      <div>
        <p className="text-xs font-black text-[var(--primary)]">{eyebrow}</p>
        <h2 id={titleId} className="mt-1.5 text-2xl font-black tracking-[-0.03em]">{title}</h2>
      </div>
      <p className="text-sm font-bold text-[var(--muted)]">{count}건</p>
    </div>
  );
}
