"use client";

import type { ComponentProps } from "react";

import { UiButton, UiLink } from "@/shared/i18n/localized-elements";
import { ChevronIcon } from "@/shared/ui/workspace-icons";

export const iconControlClassName = "grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-50";

export function IconButton({ className = "", ...props }: ComponentProps<typeof UiButton>) {
  return <UiButton {...props} className={`${iconControlClassName} ${className}`} />;
}

export function IconLink({ className = "", ...props }: ComponentProps<typeof UiLink>) {
  return <UiLink {...props} className={`${iconControlClassName} ${className}`} />;
}

export function PaginationDirectionLink({
  direction,
  href,
}: {
  direction: "previous" | "next";
  href: string;
}) {
  const label = direction === "previous" ? "이전 페이지" : "다음 페이지";
  return (
    <IconLink href={href} aria-label={label} title={label}>
      <ChevronIcon className={`size-5 ${direction === "previous" ? "rotate-180" : ""}`} />
    </IconLink>
  );
}

export function DisabledPaginationDirection({ direction }: { direction: "previous" | "next" }) {
  const label = direction === "previous" ? "이전 페이지" : "다음 페이지";
  return (
    <span aria-disabled="true" aria-label={label} className={`${iconControlClassName} bg-[var(--surface-subtle)] opacity-50`}>
      <ChevronIcon className={`size-5 ${direction === "previous" ? "rotate-180" : ""}`} />
    </span>
  );
}
