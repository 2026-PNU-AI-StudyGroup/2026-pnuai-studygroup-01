import Link from "next/link";
import type { Metadata } from "next";

import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import {
  PRIVACY_POLICY_EFFECTIVE_DATE,
  PRIVACY_POLICY_MARKDOWN,
} from "@/shared/content/privacy-policy";
import { Brand } from "@/shared/ui/brand";
import { renderMarkdown } from "@/shared/ui/render-markdown";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("개인정보 처리방침");
}

// 로그인 전에도 열람할 수 있어야 하므로 AppShell 없이 단독으로 렌더한다.
export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--workspace)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-5 sm:px-8">
        <Brand href="/" />
      </header>
      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-semibold leading-tight tracking-[-0.035em]">
          <UiText>{"개인정보 처리방침"}</UiText>
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          <UiText>{"시행일"}</UiText> {PRIVACY_POLICY_EFFECTIVE_DATE}
        </p>
        <article className="mt-8 space-y-4 text-[0.9375rem] leading-7 [overflow-wrap:anywhere]">
          {renderMarkdown(PRIVACY_POLICY_MARKDOWN)}
        </article>
        <div className="mt-12 border-t border-[var(--line)] pt-6">
          <Link href="/" className="button-secondary">
            <UiText>{"로그인으로 돌아가기"}</UiText>
          </Link>
        </div>
      </main>
    </div>
  );
}
