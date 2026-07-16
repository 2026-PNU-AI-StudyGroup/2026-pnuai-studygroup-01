"use client";

import type { ComponentProps, MouseEvent } from "react";

type Props = Omit<ComponentProps<"button">, "type" | "onClick"> & { confirmMessage: string };

export function ConfirmSubmitButton({ confirmMessage, ...buttonProps }: Props) {
  function confirmSubmission(event: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(confirmMessage)) event.preventDefault();
  }

  return <button {...buttonProps} type="submit" onClick={confirmSubmission} />;
}
