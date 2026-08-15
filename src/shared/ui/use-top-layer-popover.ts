"use client";

import { useLayoutEffect, useSyncExternalStore, type RefObject } from "react";

const subscribeToPopoverSupport = () => () => undefined;
const getPopoverSupport = () => typeof HTMLElement !== "undefined"
  && typeof HTMLElement.prototype.showPopover === "function";
const getServerPopoverSupport = () => false;

/**
 * Promotes a dialog-owned floating control into the browser top layer.
 *
 * Keeping the popover in the dialog DOM preserves modal focus/inert behavior,
 * while the top layer lets it paint outside a scrollable dialog's clip.
 */
export function useTopLayerPopover(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
) {
  const popoverSupported = useSyncExternalStore(
    subscribeToPopoverSupport,
    getPopoverSupport,
    getServerPopoverSupport,
  );
  useLayoutEffect(() => {
    const element = ref.current;
    if (!open || !element || !popoverSupported) return;

    try {
      if (!element.matches(":popover-open")) element.showPopover();
    } catch {
      // The element may already have left the document during portal cleanup.
    }

    return () => {
      try {
        if (element.matches(":popover-open")) element.hidePopover();
      } catch {
        // The element may already have left the document during portal cleanup.
      }
    };
  }, [open, popoverSupported, ref]);

  return { popoverSupported, topLayer: popoverSupported };
}
