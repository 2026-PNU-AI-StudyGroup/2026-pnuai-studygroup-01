"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="bottom-center"
      richColors
      visibleToasts={1}
      duration={3_000}
    />
  );
}
