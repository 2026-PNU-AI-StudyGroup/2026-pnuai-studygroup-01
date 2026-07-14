import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div className="max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--navy-deep)] sm:text-3xl">{title}</h1>
        {description ? <p className="muted mt-2 leading-7">{description}</p> : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </header>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="panel grid min-h-56 place-items-center px-6 py-10 text-center">
      <div className="max-w-sm">
        <span aria-hidden="true" className="mx-auto grid size-12 place-items-center rounded-full bg-[#edf3f7] text-xl text-[var(--navy)]">○</span>
        <h2 className="mt-4 font-bold text-[var(--navy-deep)]">{title}</h2>
        <p className="muted mt-2 text-sm leading-6">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

const statusStyle = {
  neutral: "bg-slate-100 text-slate-700",
  info: "bg-[#edf3f1] text-[var(--teal-dark)]",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
} as const;

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof statusStyle }) {
  return <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[tone]}`}>{children}</span>;
}

export function ProgressBar({ value, label = "진행률" }: { value: number; label?: string }) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4 text-sm">
        <span className="muted font-medium">{label}</span><strong className="text-[var(--navy-deep)]">{safeValue}%</strong>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={label} aria-valuenow={safeValue} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-[var(--teal)]" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
