import Link from "next/link";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

const TABS = [
  { key: "workspace", href: "/dashboard", label: "작업공간" },
  { key: "build", href: "/recruitments", label: "팀 꾸리기" },
] as const;

// "내 팀" 상위 영역 전환 드롭다운(작업공간 ↔ 팀 꾸리기). 각 영역 사이드바 상단. 학생 전용.
export function MyTeamTabs({ active }: { active: "workspace" | "build" }) {
  const current = TABS.find((tab) => tab.key === active) ?? TABS[0];
  return (
    <details className="group relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold text-[var(--ink)] transition-colors hover:border-[var(--line-strong)] [&::-webkit-details-marker]:hidden">
        <UiText>{current.label}</UiText>
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0 fill-none stroke-[var(--muted)] stroke-[1.7] transition-transform group-open:rotate-180"><path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </summary>
      <UiNav aria-label="내 팀 영역" className="absolute inset-x-0 top-[calc(100%+0.4rem)] z-30 space-y-1 rounded-lg border border-[var(--line)] bg-white p-1.5 shadow-[var(--shadow-float)]">
        {TABS.map((tab) => {
          const on = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={on ? "page" : undefined}
              className={`flex min-h-10 items-center rounded-md px-3 text-sm font-semibold transition-colors ${
                on
                  ? "bg-[var(--primary-subtle)] text-[var(--primary)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"
              }`}
            >
              <UiText>{tab.label}</UiText>
            </Link>
          );
        })}
      </UiNav>
    </details>
  );
}
