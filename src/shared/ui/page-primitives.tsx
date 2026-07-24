import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions, compact = false }: { eyebrow: string; title: ReactNode; description?: string; actions?: ReactNode; compact?: boolean }) {
  return (
    <header className={`flex flex-col border-b border-[var(--line)] sm:flex-row sm:items-end sm:justify-between ${compact ? "gap-4 pb-6" : "gap-6 pb-8"}`}>
      <div className="max-w-3xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className={`${compact ? "mt-1 text-[clamp(1.75rem,3vw,2rem)]" : "mt-2 text-[clamp(2rem,4vw,2.5rem)]"} font-black leading-tight tracking-[-0.04em] text-[var(--ink)]`}>{title}</h1>
        {description ? <p className={`muted max-w-2xl text-[0.9375rem] leading-6 ${compact ? "mt-2" : "mt-3"}`}>{description}</p> : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0 [&>*]:max-sm:flex-1">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-[var(--radius-panel)] border border-dashed border-[var(--line-strong)] bg-[var(--surface-subtle)] px-6 py-10 text-center">
      <div className="max-w-sm">
        <span aria-hidden="true" className="mx-auto grid size-11 place-items-center rounded-full border border-[var(--line)] bg-white text-[var(--primary)] shadow-sm">
          <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.8]"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
        </span>
        <h2 className="mt-4 font-bold text-[var(--ink)]">{title}</h2>
        <p className="muted mt-2 text-sm leading-6">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

const statusStyle = {
  neutral: "bg-[var(--surface-subtle)] text-[var(--muted)]",
  info: "bg-[var(--primary-subtle)] text-[var(--primary-hover)]",
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
        <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
