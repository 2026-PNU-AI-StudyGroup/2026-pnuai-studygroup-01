"use client";

import { useEffect } from "react";

function backdropDialogAt(event: MouseEvent | PointerEvent): HTMLDialogElement | null {
  const dialog = event.target;
  if (!(dialog instanceof HTMLDialogElement) || !dialog.open) return null;

  const rect = dialog.getBoundingClientRect();
  const outsideDialog = event.clientX < rect.left
    || event.clientX > rect.right
    || event.clientY < rect.top
    || event.clientY > rect.bottom;

  return outsideDialog ? dialog : null;
}

function requestDialogCancel(dialog: HTMLDialogElement) {
  const cancelEvent = new Event("cancel", { cancelable: true });
  if (dialog.dispatchEvent(cancelEvent)) dialog.close();
}

/**
 * Gives every native modal dialog the same light-dismiss behavior.
 *
 * A backdrop interaction is routed through the dialog's cancel event so that
 * forms can block dismissal while submitting, or run upload-abort cleanup,
 * exactly as they already do for Escape.
 */
export function DialogBackdropDismissController() {
  useEffect(() => {
    let pointerStartedOnBackdrop: HTMLDialogElement | null = null;

    const handlePointerDown = (event: PointerEvent) => {
      pointerStartedOnBackdrop = backdropDialogAt(event);
    };
    const handlePointerCancel = () => {
      pointerStartedOnBackdrop = null;
    };
    const handleClick = (event: MouseEvent) => {
      const clickedBackdrop = backdropDialogAt(event);
      const shouldDismiss = clickedBackdrop !== null
        && clickedBackdrop === pointerStartedOnBackdrop;
      pointerStartedOnBackdrop = null;
      if (shouldDismiss) requestDialogCancel(clickedBackdrop);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("pointercancel", handlePointerCancel, true);
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointercancel", handlePointerCancel, true);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return null;
}
