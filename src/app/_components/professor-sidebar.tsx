import Link from "next/link";

import type { UserRole } from "@/modules/identity/domain/user-role";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiNav } from "@/modules/translation/ui/localized-elements";

const professorNavigationItems = [
  { href: "/professor/topics", label: "프로젝트 주제", hint: "등록·공개·일정", icon: "topic" },
  { href: "/professor/applications", label: "지원 검토", icon: "application" },
  { href: "/project-approvals", label: "학생 제안", hint: "승인·반려", icon: "approval" },
] as const;

function isProfessorNavigationActive(href: string, currentPath: string) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function ProfessorNavigationIcon({ name }: { name: (typeof professorNavigationItems)[number]["icon"] }) {
  const paths = {
    topic: <><path d="M4 4h12v12H4z" /><path d="M7 8h6M7 11h4M13.5 2.5v3" /></>,
    application: <><path d="M5 3h10v14H5z" /><path d="M8 7h4M8 10h4M8 13h2" /></>,
    approval: <><path d="M4 10.5 8 14l8-9" /><path d="M4 4h8M4 17h12" /></>,
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]">
      {paths[name]}
    </svg>
  );
}

export function ProfessorSidebar({ currentPath, role }: { currentPath: string; role: UserRole }) {
  const items = role === "STUDENT"
    ? professorNavigationItems.filter(({ href }) => href !== "/project-approvals")
    : professorNavigationItems;
  const current = items.find((item) => isProfessorNavigationActive(item.href, currentPath)) ?? items[0];

  return (
    <div className="px-4 py-5 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:px-3 lg:py-8">
      <div className="hidden px-2 lg:block">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
          <UiText>{role === "STUDENT" ? "조교 업무" : "교수 업무"}</UiText>
        </p>
        <h2 className="mt-1 text-sm font-bold tracking-[-0.02em]"><UiText>{"프로젝트 관리"}</UiText></h2>
      </div>

      <UiNav aria-label={role === "STUDENT" ? "조교 업무" : "교수 업무"} className="lg:mt-5">
        <details className="group relative lg:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-lg border border-[var(--line)] bg-white px-3 [&::-webkit-details-marker]:hidden">
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
          <ul className="absolute inset-x-0 top-[calc(100%+0.4rem)] z-30 space-y-1 rounded-lg border border-[var(--line)] bg-white p-1.5 shadow-[var(--shadow-float)]">
            {items.map((item) => (
              <li key={item.href}>
                <ProfessorNavigationLink item={item} active={isProfessorNavigationActive(item.href, currentPath)} compact />
              </li>
            ))}
          </ul>
        </details>

        <ul className="hidden space-y-1 lg:block">
          {items.map((item) => (
            <li key={item.href}>
              <ProfessorNavigationLink item={item} active={isProfessorNavigationActive(item.href, currentPath)} />
            </li>
          ))}
        </ul>
      </UiNav>
    </div>
  );
}

function ProfessorNavigationLink({ item, active, compact = false }: {
  item: (typeof professorNavigationItems)[number];
  active: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-3 rounded-lg px-3 text-left transition-colors ${
        compact ? "min-h-12" : "hint" in item ? "min-h-[4.25rem]" : "min-h-12"
      } ${
        active
          ? "bg-[var(--primary-subtle)] text-[var(--primary)] before:absolute before:-left-3 before:inset-y-0 before:w-0.5 before:bg-[var(--primary)]"
          : "text-[var(--ink)] hover:bg-[var(--surface-subtle)]"
      }`}
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${active ? "bg-white text-[var(--primary)]" : "bg-[var(--surface-subtle)] text-[var(--muted)]"}`}>
        <ProfessorNavigationIcon name={item.icon} />
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-[0.82rem] font-bold"><UiText>{item.label}</UiText></strong>
        {"hint" in item ? <span className={`mt-0.5 block truncate text-[0.66rem] font-semibold ${active ? "text-[var(--primary)]/75" : "text-[var(--muted)]"}`}><UiText>{item.hint}</UiText></span> : null}
      </span>
    </Link>
  );
}
