import type { ReactNode } from "react";

import { Brand } from "@/shared/ui/brand";

export function PublicHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="relative z-30 border-b border-[var(--line)] bg-white/88 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.75rem] w-full min-w-0 max-w-[1480px] items-center justify-between gap-4 px-5 sm:px-8">
        <Brand />
        {children ? <div className="flex shrink-0 items-center gap-5">{children}</div> : null}
      </div>
    </header>
  );
}
