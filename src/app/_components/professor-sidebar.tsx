import Link from "next/link";

import type { UserRole } from "@/modules/identity/domain/user-role";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { sidebarGroupLabelClass, sidebarRowClass } from "@/shared/ui/sidebar-row";

const professorNavigationItems = [
  { href: "/professor/topics", label: "프로젝트 주제", hint: "등록·공개·일정", icon: "topic" },
  { href: "/professor/applications", label: "지원 검토", icon: "application" },
] as const;

function isProfessorNavigationActive(href: string, currentPath: string) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function ProfessorNavigationIcon({ name }: { name: (typeof professorNavigationItems)[number]["icon"] }) {
  const paths = {
    topic: <><path d="M4 4h12v12H4z" /><path d="M7 8h6M7 11h4M13.5 2.5v3" /></>,
    application: <><path d="M5 3h10v14H5z" /><path d="M8 7h4M8 10h4M8 13h2" /></>,
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0 fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]">
      {paths[name]}
    </svg>
  );
}

/** 교수(조교) 업무 목록. AppShell 의 panel 로 넘겨 왼쪽 메뉴의 주요 메뉴 아래에 놓인다. */
export function ProfessorSidebar({ currentPath, role }: { currentPath: string; role: UserRole }) {
  const items = professorNavigationItems;
  const current = items.find((item) => isProfessorNavigationActive(item.href, currentPath)) ?? items[0];

  return (
    <div className="px-4 py-5 lg:p-0">
      <h2 className={`hidden lg:block ${sidebarGroupLabelClass}`}>
        <UiText>{role === "STUDENT" ? "조교 업무" : "교수 업무"}</UiText>
      </h2>

      <UiNav aria-label={role === "STUDENT" ? "조교 업무" : "교수 업무"}>
        <details className="group relative lg:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--primary-subtle)] text-[var(--primary)]">
                <ProfessorNavigationIcon name={current.icon} />
              </span>
              <span className="min-w-0 text-left">
                <strong className="block truncate text-sm font-bold"><UiText>{current.label}</UiText></strong>
                {"hint" in current ? <span className="block truncate text-xs text-[var(--muted)]"><UiText>{current.hint}</UiText></span> : null}
              </span>
            </span>
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0 fill-none stroke-[var(--muted)] stroke-[1.7] transition-transform group-open:rotate-180"><path d="m6 8 4 4 4-4" /></svg>
          </summary>
          <ul className="absolute inset-x-0 top-[calc(100%+0.4rem)] z-30 space-y-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-float)]">
            {items.map((item) => (
              <li key={item.href}>
                <ProfessorNavigationLink item={item} active={isProfessorNavigationActive(item.href, currentPath)} />
              </li>
            ))}
          </ul>
        </details>

        {/* 주요 메뉴와 같은 줄 모양. 설명 한 줄은 휴대폰 펼침 목록에만 남긴다. */}
        <ul className="hidden space-y-0.5 lg:block">
          {items.map((item) => {
            const active = isProfessorNavigationActive(item.href, currentPath);
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined} className={sidebarRowClass(active)}>
                  <ProfessorNavigationIcon name={item.icon} />
                  <UiText>{item.label}</UiText>
                </Link>
              </li>
            );
          })}
        </ul>
      </UiNav>
    </div>
  );
}

function ProfessorNavigationLink({ item, active }: {
  item: (typeof professorNavigationItems)[number];
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-h-12 items-center gap-3 rounded-lg px-3 text-left transition-colors ${
        active
          ? "bg-[var(--accent-subtle)] text-[var(--accent-ink)]"
          : "text-[var(--ink)] hover:bg-[var(--surface-active)]"
      }`}
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${active ? "bg-[var(--surface)] text-[var(--primary)]" : "bg-[var(--surface-subtle)] text-[var(--muted)]"}`}>
        <ProfessorNavigationIcon name={item.icon} />
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-[0.82rem] font-bold"><UiText>{item.label}</UiText></strong>
        {"hint" in item ? <span className={`mt-0.5 block truncate text-[0.66rem] font-semibold ${active ? "text-[var(--primary)]/75" : "text-[var(--muted)]"}`}><UiText>{item.hint}</UiText></span> : null}
      </span>
    </Link>
  );
}
