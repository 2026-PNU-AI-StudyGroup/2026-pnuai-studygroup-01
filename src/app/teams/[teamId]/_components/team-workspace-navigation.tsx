"use client";

import Link from "next/link";
import { UiLink } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { usePathname } from "next/navigation";

const sections = [
  { label: "개요", suffix: "", icon: "overview" },
  { label: "마일스톤", suffix: "/milestones", icon: "milestone" },
  { label: "팀 대화", suffix: "/discussion", icon: "discussion" },
  { label: "미팅·검토", suffix: "/requests", icon: "request" },
  { label: "보고서", suffix: "/reports", icon: "report" },
  { label: "결과물", suffix: "/artifacts", icon: "artifact" },
] as const;

type WorkspaceIcon = typeof sections[number]["icon"];

function NavigationIcon({ name }: { name: WorkspaceIcon }) {
  const paths = {
    overview: <><path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z" /></>,
    milestone: <><path d="M5 4v16M5 6h11l-2 3 2 3H5" /></>,
    discussion: <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12h5" /></>,
    request: <><path d="M5 5h14v15H5zM8 3v4M16 3v4M5 9h14" /><path d="m9 14 2 2 4-4" /></>,
    report: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></>,
    artifact: <><path d="M4 7h6l2 2h8v10H4z" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 fill-none stroke-current stroke-[1.75] [stroke-linecap:round] [stroke-linejoin:round]">{paths[name]}</svg>;
}

export function TeamWorkspaceNavigation({ teamId, advisorEnabled }: { teamId: string; advisorEnabled: boolean }) {
  const pathname = usePathname();
  const visibleSections = advisorEnabled
    ? sections
    : sections.filter(({ suffix }) => suffix !== "/requests");
  const currentSection = visibleSections.find(({ suffix }) => {
    const href = `/teams/${teamId}${suffix}`;
    return suffix ? pathname.startsWith(href) : pathname === href;
  }) ?? visibleSections[0];

  return (
    <>
      <details className="group lg:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 border-y border-[var(--line)] py-2.5 [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-2.5 text-sm font-bold text-[var(--primary-hover)]"><NavigationIcon name={currentSection.icon} /><UiText>{currentSection.label}</UiText></span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0 fill-none stroke-[var(--muted)] stroke-[1.75] [stroke-linecap:round] [stroke-linejoin:round] transition-transform group-open:rotate-180"><path d="m6 8 4 4 4-4" /></svg>
        </summary>
        <UiNav aria-label="프로젝트 공간" className="border-b border-[var(--line)] py-2">
          <ul className="grid grid-cols-2 gap-x-4">
            {visibleSections.map(({ label, suffix, icon }) => {
              const href = `/teams/${teamId}${suffix}`;
              const selected = suffix ? pathname.startsWith(href) : pathname === href;
              return <li key={suffix || "overview"}><UiLink href={href} aria-label={`${label} 모바일 메뉴`} aria-current={selected ? "page" : undefined} className={`flex min-h-11 items-center gap-2 border-b px-1 text-sm font-semibold ${selected ? "border-[var(--primary)] text-[var(--primary-hover)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}><NavigationIcon name={icon} /><UiText>{label}</UiText></UiLink></li>;
            })}
          </ul>
        </UiNav>
      </details>
      <UiNav aria-label="프로젝트 공간" className="hidden lg:block">
      <ul className="flex flex-col">
        {visibleSections.map(({ label, suffix, icon }) => {
          const href = `/teams/${teamId}${suffix}`;
          const selected = suffix ? pathname.startsWith(href) : pathname === href;
          return (
            <li key={suffix || "overview"}>
              <Link
                href={href}
                aria-current={selected ? "page" : undefined}
                className={`snap-color relative flex min-h-11 items-center gap-3 border-l-2 px-3 text-sm font-semibold lg:w-full ${selected ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}
              >
                <NavigationIcon name={icon} />
                <UiText>{label}</UiText>
              </Link>
            </li>
          );
        })}
      </ul>
      </UiNav>
    </>
  );
}
