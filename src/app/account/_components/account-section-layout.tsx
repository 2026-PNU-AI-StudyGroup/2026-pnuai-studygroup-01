import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { ReactNode } from "react";

export function AccountSectionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="w-full px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <header className="border-b border-[var(--line)]">
        <h1 className="pb-3 text-[clamp(1.5rem,2.4vw,1.875rem)] font-bold tracking-[-0.02em] text-[var(--ink)]"><UiText>{"내 계정"}</UiText></h1>
      </header>
      <main className="min-w-0 pb-24 pt-8 lg:pb-10 lg:pt-10"><UiText>{children}</UiText></main>
    </div>
  );
}
