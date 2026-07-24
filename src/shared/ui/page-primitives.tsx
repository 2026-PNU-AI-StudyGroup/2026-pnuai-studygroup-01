import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions, compact = false }: { eyebrow: string; title: ReactNode; description?: string; actions?: ReactNode; compact?: boolean }) {
  return (
    <header className={`visual-page-header relative isolate flex flex-col overflow-hidden rounded-[var(--radius-panel)] border border-white/10 bg-[#0b1740] text-white shadow-[0_22px_55px_rgba(7,17,47,.18)] sm:flex-row sm:items-end sm:justify-between ${compact ? "gap-4 px-6 py-6" : "gap-6 px-6 py-8 sm:px-8 sm:py-9"}`}>
      <div className="max-w-3xl">
        <p className="text-xs font-black tracking-[0.16em] text-[#f0bd54]">{eyebrow}</p>
        <h1 className={`${compact ? "mt-2 text-[clamp(1.75rem,3vw,2rem)]" : "mt-3 text-[clamp(2rem,4vw,2.75rem)]"} font-black leading-tight tracking-[-0.045em] text-white`}>{title}</h1>
        {description ? <p className={`max-w-2xl text-[0.9375rem] leading-6 text-white/62 ${compact ? "mt-2" : "mt-3"}`}>{description}</p> : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0 [&>*]:max-sm:flex-1">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-[var(--radius-panel)] border border-white bg-white/80 px-6 py-10 text-center shadow-[0_18px_45px_rgba(23,32,51,.08)] backdrop-blur">
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
