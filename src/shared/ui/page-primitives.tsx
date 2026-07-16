import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: ReactNode; description?: string; actions?: ReactNode }) {
  return (
    <header className="grid gap-10 border-b border-[var(--line)] pb-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,.5fr)] lg:items-end lg:gap-16 lg:pb-14">
      <div className="max-w-4xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-4 text-[clamp(2.75rem,5vw,3.5rem)] font-black leading-[1.05] tracking-[-0.045em] text-[var(--ink)]">{title}</h1>
      </div>
      <div className="border-l-2 border-[var(--accent)] pl-5 lg:mb-1">
        {description ? <p className="muted max-w-md text-base leading-7">{description}</p> : null}
        {actions ? <div className="mt-6">{actions}</div> : null}
      </div>
    </header>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="panel grid min-h-56 place-items-center px-6 py-10 text-center">
      <div className="max-w-sm">
        <span aria-hidden="true" className="mx-auto grid size-12 place-items-center rounded-lg bg-[var(--accent-subtle)] text-xl text-[var(--accent)]">○</span>
        <h2 className="mt-4 font-bold text-[var(--ink)]">{title}</h2>
        <p className="muted mt-2 text-sm leading-6">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

const statusStyle = {
  neutral: "bg-[var(--surface-subtle)] text-[var(--muted)]",
  info: "bg-[var(--accent-subtle)] text-[var(--accent-hover)]",
  success: "bg-[var(--success-subtle)] text-[var(--success)]",
  warning: "bg-[var(--warning-subtle)] text-[var(--warning-ink)]",
  danger: "bg-[var(--danger-subtle)] text-[var(--danger)]",
} as const;

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof statusStyle }) {
  return <span className={`inline-flex min-h-7 items-center rounded px-2.5 py-1 text-xs font-bold ${statusStyle[tone]}`}>{children}</span>;
}

export function ProgressBar({ value, label = "진행률" }: { value: number; label?: string }) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4 text-sm">
        <span className="muted font-medium">{label}</span><strong className="text-[var(--ink)]">{safeValue}%</strong>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--line)]" role="progressbar" aria-label={label} aria-valuenow={safeValue} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
