import Link from "next/link";
import type { Metadata } from "next";

import { ScreenTitle } from "@/app/_components/screen-title";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import {
  PRIVACY_POLICY_EFFECTIVE_DATE,
  PRIVACY_POLICY_MARKDOWN,
} from "@/shared/content/privacy-policy";
import { Brand } from "@/shared/ui/brand";
import { renderMarkdown } from "@/shared/ui/render-markdown";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("개인정보 처리방침");
}

// 원문은 손대지 않고 "## 제N조" 앞에서만 잘라 조마다 앵커를 단다. 이어 붙이면 원문 그대로다.
const [preamble, ...articles] = PRIVACY_POLICY_MARKDOWN.split(/^(?=## )/m);
const sections = articles.map((source, index) => ({
  id: `article-${index + 1}`,
  heading: source.slice(3, source.indexOf("\n")).trim(),
  source,
}));

// 로그인 전에도 열람할 수 있어야 하므로 AppShell 없이 단독으로 렌더한다.
export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--workspace)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-[var(--surface)] px-5 sm:px-8">
        <div className="mx-auto flex h-16 max-w-[66rem] items-center">
          <Brand href="/" />
        </div>
      </header>
      <main className="mx-auto grid max-w-[66rem] gap-6 px-5 pb-16 pt-8 sm:px-8">
        <ScreenTitle
          id="privacy-title"
          title={<UiText>{"개인정보 처리방침"}</UiText>}
          meta={<span className="tabular-nums"><UiText>{"시행일"}</UiText> {PRIVACY_POLICY_EFFECTIVE_DATE}</span>}
        />
        {/* 넓은 화면은 왼쪽에 조 목록을 붙여 두고 읽는다. 좁은 화면은 본문만. */}
        <div className="grid items-start gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <UiNav aria-label="처리방침 목차" className="sticky top-6 hidden lg:block">
            <p className="text-xs text-[var(--muted)]"><UiText>{"목차"}</UiText></p>
            <ol className="mt-2 grid gap-0.5 text-[0.8125rem]">
              {sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="block rounded-[var(--radius-control)] px-2 py-1 text-[var(--muted)] transition-colors hover:bg-[var(--surface-active)] hover:text-[var(--ink)]">{section.heading}</a>
                </li>
              ))}
            </ol>
          </UiNav>
          <article aria-labelledby="privacy-title" className="max-w-[46rem] rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] px-5 py-6 text-[0.9375rem] leading-7 [overflow-wrap:anywhere] sm:px-8 sm:py-8 [&_th]:bg-transparent [&_th]:font-medium [&_th]:text-[var(--muted)]">
            <div className="space-y-4">{renderMarkdown(preamble)}</div>
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="mt-8 scroll-mt-6 space-y-4 border-t border-[var(--line)] pt-6">
                {renderMarkdown(section.source)}
              </section>
            ))}
          </article>
        </div>
        <div>
          <Link href="/" className="button-secondary button-compact">
            <UiText>{"로그인으로 돌아가기"}</UiText>
          </Link>
        </div>
      </main>
    </div>
  );
}
