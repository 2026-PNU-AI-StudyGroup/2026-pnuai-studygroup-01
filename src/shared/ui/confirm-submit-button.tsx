"use client";

import type { ComponentProps, MouseEvent } from "react";

import { useI18n } from "@/shared/i18n/i18n-provider";

type Props = Omit<ComponentProps<"button">, "type" | "onClick"> & { confirmMessage: string };

export function ConfirmSubmitButton({ confirmMessage, ...buttonProps }: Props) {
  const { t } = useI18n();
  function confirmSubmission(event: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(t(confirmMessage))) event.preventDefault();
  }

  return <button {...buttonProps} type="submit" onClick={confirmSubmission} />;
}
