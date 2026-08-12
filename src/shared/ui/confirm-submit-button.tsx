"use client";

import { useRef, useState, type ComponentProps, type MouseEvent } from "react";

import { useI18n } from "@/shared/i18n/i18n-provider";
import { UiButton } from "@/shared/i18n/localized-elements";
import { ConfirmationDialog } from "@/shared/ui/confirmation-dialog";

type Props = Omit<ComponentProps<"button">, "type" | "onClick"> & { confirmMessage: string; confirmClassName?: string };

export function ConfirmSubmitButton({ confirmMessage, confirmClassName, ...buttonProps }: Props) {
  const { t } = useI18n();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  function confirmSubmission(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (form && !form.checkValidity()) {
      event.preventDefault();
      form.reportValidity();
      return;
    }
    event.preventDefault();
    setOpen(true);
  }

  function submitConfirmed() {
    setOpen(false);
    buttonRef.current?.form?.requestSubmit(buttonRef.current);
  }

  return (
    <>
      <UiButton {...buttonProps} ref={buttonRef} type="submit" onClick={confirmSubmission} />
      <ConfirmationDialog
        open={open}
        description={t(confirmMessage)}
        confirmClassName={confirmClassName}
        onConfirm={submitConfirmed}
        onCancel={() => setOpen(false)}
        returnFocusRef={buttonRef}
      />
    </>
  );
}
