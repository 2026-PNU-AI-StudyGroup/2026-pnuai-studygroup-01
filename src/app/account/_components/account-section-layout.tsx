import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { ReactNode } from "react";

export function AccountSectionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="w-full px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <header className="border-b border-[var(--line)]">
        <h1 className="pb-3 text-[2rem] font-bold tracking-[-0.04em] text-[var(--ink)]"><UiText>{"내 계정"}</UiText></h1>
      </header>
      <main className="page-enter min-w-0 pb-24 pt-10 lg:pb-10 lg:pt-12"><UiText>{children}</UiText></main>
    </div>
  );
}
