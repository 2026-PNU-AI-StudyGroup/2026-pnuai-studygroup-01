"use client";

import { useRouter } from "next/navigation";
import { type RefObject, useEffect, useState } from "react";

type ActionState = {
  status: string;
  message: string;
};

export const SUCCESS_TOAST_DURATION_MS = 3_000;

export function useDialogSuccessToast<TState extends ActionState>(
  state: TState,
  dialogRef: RefObject<HTMLDialogElement | null>,
  durationMs = SUCCESS_TOAST_DURATION_MS,
) {
  const router = useRouter();
  const [dismissedSuccess, setDismissedSuccess] = useState<TState | null>(null);
  const message = state.status === "success" && state !== dismissedSuccess
    ? state.message
    : "";

  useEffect(() => {
    if (state.status !== "success") return;
    dialogRef.current?.close();
    const timer = window.setTimeout(() => {
      setDismissedSuccess(state);
      router.refresh();
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [dialogRef, durationMs, router, state]);

  return message;
}
