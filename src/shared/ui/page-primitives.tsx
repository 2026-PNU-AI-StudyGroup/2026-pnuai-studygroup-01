import { UiDiv } from "@/shared/i18n/localized-elements";
import type { ReactNode } from "react";

import { UiText } from "@/shared/i18n/i18n-provider";

export function PageHeader({ eyebrow, title, description, actions, compact = false }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; compact?: boolean }) {
  return (
    <header className={`flex flex-col sm:flex-row sm:items-end sm:justify-between ${compact ? "gap-4" : "gap-6"}`}>
      <div className="max-w-3xl">
        {eyebrow ? <p className="text-[0.6875rem] font-bold tracking-[0.1em] text-[var(--muted)]"><UiText>{eyebrow}</UiText></p> : null}
        <h1 className={`${eyebrow ? "mt-1.5" : ""} ${compact ? "text-[clamp(1.375rem,2vw,1.625rem)]" : "text-[clamp(1.5rem,2.4vw,1.875rem)]"} font-bold leading-[1.15] tracking-[-0.035em] text-[var(--ink)]`}><UiText>{title}</UiText></h1>
        {description ? <p className={`max-w-2xl text-[0.9375rem] leading-6 text-[var(--muted)] ${compact ? "mt-2" : "mt-2.5"}`}><UiText>{description}</UiText></p> : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0 [&>*]:max-sm:flex-1">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({ title, description, action, variant = "results" }: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  variant?: "results" | "section" | "compact";
}) {
  const Title = variant === "results" ? "h2" : variant === "section" ? "h3" : "p";
  const containerClassName = variant === "results"
    ? "flex min-h-44 flex-col items-center justify-center px-5 py-12 text-center sm:min-h-52 sm:py-16"
    : variant === "section"
      ? "flex min-h-28 flex-col items-center justify-center px-1 py-8 text-center"
      : "flex min-h-16 flex-wrap items-center justify-between gap-3 py-4 text-left";
  const titleClassName = variant === "compact"
    ? "text-sm font-semibold text-[var(--ink)]"
    : "text-lg font-semibold tracking-[-0.025em] text-[var(--ink)]";

  return (
    <div className={containerClassName} data-empty-state={variant} role="status">
      <div className={variant === "compact" ? "min-w-0 flex-1" : "max-w-2xl"}>
        <Title className={titleClassName}><UiText>{title}</UiText></Title>
        {description ? <p className={`text-[var(--muted)] ${variant === "compact" ? "mt-1 text-sm leading-5" : "mt-2 text-[0.9375rem] leading-6"}`}><UiText>{description}</UiText></p> : null}
      </div>
      {action ? <div className={variant === "compact" ? "flex shrink-0" : "mt-5 flex justify-center"}>{action}</div> : null}
    </div>
  );
}

const statusStyle = {
  neutral: "bg-[var(--surface-subtle)] text-[var(--muted)] ring-[var(--line-strong)]",
  info: "bg-[var(--primary-subtle)] text-[var(--primary-hover)] ring-[color-mix(in_srgb,var(--primary)_24%,transparent)]",
  success: "bg-[var(--success-subtle)] text-[var(--success)] ring-[color-mix(in_srgb,var(--success)_26%,transparent)]",
  warning: "bg-[var(--warning-subtle)] text-[var(--warning-ink)] ring-[color-mix(in_srgb,var(--warning)_28%,transparent)]",
  danger: "bg-[var(--danger-subtle)] text-[var(--danger)] ring-[color-mix(in_srgb,var(--danger)_26%,transparent)]",
} as const;

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof statusStyle }) {
  return <span className={`inline-flex min-h-7 items-center rounded-[0.375rem] px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyle[tone]}`}><UiText>{children}</UiText></span>;
}

export function ProgressBar({ value, label = "진행률" }: { value: number; label?: string }) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4 text-sm">
        <span className="muted font-medium"><UiText>{label}</UiText></span><strong className="text-[var(--ink)]">{safeValue}%</strong>
      </div>
      <UiDiv className="h-2.5 overflow-hidden rounded-full bg-[var(--line)]" role="progressbar" aria-label={label} aria-valuenow={safeValue} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${safeValue}%` }} />
      </UiDiv>
    </div>
  );
}
