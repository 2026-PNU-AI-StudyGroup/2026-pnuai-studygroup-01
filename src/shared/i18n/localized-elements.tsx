"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { useI18n } from "@/shared/i18n/i18n-provider";

function useLocalizedLabel(label: string | undefined): string | undefined {
  const { t } = useI18n();
  return label ? t(label) : label;
}

export function UiInput({
  placeholder,
  "aria-label": ariaLabel,
  className = "",
  ...props
}: ComponentProps<"input">) {
  const { t } = useI18n();
  return (
    <input
      {...props}
      className={className.includes("form-control") ? className : `form-control ${className}`}
      placeholder={placeholder ? t(placeholder) : placeholder}
      aria-label={ariaLabel ? t(ariaLabel) : ariaLabel}
    />
  );
}

export function UiTextarea({
  placeholder,
  "aria-label": ariaLabel,
  className = "",
  ...props
}: ComponentProps<"textarea">) {
  const { t } = useI18n();
  return (
    <textarea
      {...props}
      className={className.includes("form-control") ? className : `form-control ${className}`}
      placeholder={placeholder ? t(placeholder) : placeholder}
      aria-label={ariaLabel ? t(ariaLabel) : ariaLabel}
    />
  );
}

export function UiButton({
  "aria-label": ariaLabel,
  title,
  ...props
}: ComponentProps<"button">) {
  const { t } = useI18n();
  return (
    <button
      {...props}
      aria-label={ariaLabel ? t(ariaLabel) : ariaLabel}
      title={title ? t(title) : title}
    />
  );
}

export function UiNav({
  "aria-label": ariaLabel,
  ...props
}: ComponentProps<"nav">) {
  return <nav {...props} aria-label={useLocalizedLabel(ariaLabel)} />;
}

export function UiSection({
  "aria-label": ariaLabel,
  ...props
}: ComponentProps<"section">) {
  return <section {...props} aria-label={useLocalizedLabel(ariaLabel)} />;
}

export function UiAside({
  "aria-label": ariaLabel,
  ...props
}: ComponentProps<"aside">) {
  return <aside {...props} aria-label={useLocalizedLabel(ariaLabel)} />;
}

export function UiDiv({
  "aria-label": ariaLabel,
  ...props
}: ComponentProps<"div">) {
  return <div {...props} aria-label={useLocalizedLabel(ariaLabel)} />;
}

export function UiUl({
  "aria-label": ariaLabel,
  ...props
}: ComponentProps<"ul">) {
  return <ul {...props} aria-label={useLocalizedLabel(ariaLabel)} />;
}

export function UiOl({
  "aria-label": ariaLabel,
  ...props
}: ComponentProps<"ol">) {
  return <ol {...props} aria-label={useLocalizedLabel(ariaLabel)} />;
}

export function UiArticle({
  "aria-label": ariaLabel,
  ...props
}: ComponentProps<"article">) {
  return <article {...props} aria-label={useLocalizedLabel(ariaLabel)} />;
}

export function UiLink({
  "aria-label": ariaLabel,
  title,
  ...props
}: ComponentProps<typeof Link>) {
  const { t } = useI18n();
  return (
    <Link
      {...props}
      aria-label={ariaLabel ? t(ariaLabel) : ariaLabel}
      title={title ? t(title) : title}
    />
  );
}
