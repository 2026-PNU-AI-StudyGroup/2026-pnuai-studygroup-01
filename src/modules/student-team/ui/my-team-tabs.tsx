import Link from "next/link";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

const TABS = [
  { key: "workspace", href: "/dashboard", label: "작업공간" },
  { key: "build", href: "/recruitments", label: "팀 꾸리기" },
] as const;

// "내 팀" 상위 2탭: 작업공간(내 프로젝트·팀 워크스페이스) ↔ 팀 꾸리기(모집·팀 구성). 학생 전용.
export function MyTeamTabs({ active }: { active: "workspace" | "build" }) {
  return (
    <UiNav aria-label="내 팀 메뉴" className="flex gap-1 border-b border-[var(--line)] px-5 sm:px-8 lg:px-10 xl:px-12">
      {TABS.map((tab) => {
        const on = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={on ? "page" : undefined}
            className={`relative -mb-px px-4 py-3 text-sm font-semibold ${
              on
                ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            <UiText>{tab.label}</UiText>
          </Link>
        );
      })}
    </UiNav>
  );
}
