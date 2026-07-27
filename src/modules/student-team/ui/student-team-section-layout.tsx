import Link from "next/link";
import { UiAside, UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { ReactNode } from "react";
import { ExplorerHero } from "@/shared/ui/explorer-hero";

const navigation = [
  { href: "/recruitments", label: "팀 찾기", icon: "search" },
  { href: "/teams", label: "팀 관리", icon: "document" },
  { href: "/recruitments/applications", label: "지원 상태", icon: "send" },
  { href: "/recruitments/mine", label: "내 공고", icon: "document" },
] as const;

type StudentTeamIconName = "search" | "send" | "document" | "plus" | "chevron-left" | "chevron-right";

export function StudentTeamIcon({ name, className = "size-5" }: { name: StudentTeamIconName; className?: string }) {
  const paths = {
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    send: <><path d="m21 3-7.2 18-3.3-7.5L3 10.2 21 3Z" /><path d="m10.5 13.5 4.4-4.4" /></>,
    document: <><path d="M6 3.5h9l3 3V21H6Z" /><path d="M14.5 3.5V7H18M9 11h6M9 15h6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    "chevron-left": <path d="m14.5 5-7 7 7 7" />,
    "chevron-right": <path d="m9.5 5 7 7-7 7" />,
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`${className} shrink-0 fill-none stroke-current stroke-[1.75]`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function isTeamNavigationActive(href: string, currentPath: string) {
  if (href === "/teams") return currentPath === "/teams" || currentPath.startsWith("/teams/");
  if (href === "/recruitments") return currentPath === "/recruitments";
  if (href === "/recruitments/mine") {
    return currentPath === "/recruitments/mine" || currentPath === "/recruitments/new";
  }
  return currentPath === href;
}

export function StudentTeamSectionLayout({ currentPath, children }: { currentPath: string; children: ReactNode }) {
  const current = navigation.find((item) => isTeamNavigationActive(item.href, currentPath)) ?? navigation[0];

  return (
    <div className="grid w-full grid-cols-[minmax(0,1fr)] lg:min-h-screen lg:grid-cols-[15.5rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)]">
      <UiAside aria-label="팀 영역 메뉴" className="min-w-0 bg-white px-5 pb-5 pt-5 sm:px-8 lg:border-r lg:border-[var(--line)] lg:px-5 lg:py-8">
        <div className="lg:sticky lg:top-8">
          <div className="hidden border-b border-[var(--line)] pb-6 lg:block">
            <p className="text-base font-extrabold tracking-[-0.025em] text-[var(--ink)]"><UiText>{"팀"}</UiText></p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]"><UiText>{"팀 구성과 모집을 관리합니다."}</UiText></p>
          </div>

          <details className="group lg:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 border-y border-[var(--line)] py-2.5 [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 items-center gap-2.5 text-sm font-extrabold text-[var(--primary-hover)]">
                <StudentTeamIcon name={current.icon} />
                <UiText>{current.label}</UiText>
              </span>
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0 fill-none stroke-[var(--muted)] stroke-[1.75] transition-transform group-open:rotate-180">
                <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <UiNav aria-label="팀 메뉴 모바일" className="border-b border-[var(--line)] py-2">
              <ul className="grid grid-cols-2 gap-x-4">
                {navigation.map((item) => {
                  const active = isTeamNavigationActive(item.href, currentPath);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`flex min-h-11 items-center gap-2 border-b px-1 text-sm font-bold ${
                          active
                            ? "border-[var(--primary)] text-[var(--primary-hover)]"
                            : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
                        }`}
                      >
                        <StudentTeamIcon name={item.icon} />
                        <UiText>{item.label}</UiText>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </UiNav>
          </details>

          <UiNav aria-label="팀 메뉴" className="mt-5 hidden lg:block">
            <ul className="flex flex-col">
              {navigation.map((item) => {
                const active = isTeamNavigationActive(item.href, currentPath);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`snap-color relative flex min-h-11 items-center gap-3 border-l-2 px-3 text-sm font-bold ${
                        active
                          ? "border-[var(--primary)] text-[var(--primary)]"
                          : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
                      }`}
                    >
                      <StudentTeamIcon name={item.icon} />
                      <UiText>{item.label}</UiText>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </UiNav>
        </div>
      </UiAside>
      <div className="min-w-0 px-5 pb-24 pt-6 sm:px-8 lg:px-10 lg:pb-12 lg:pt-10 xl:px-12 2xl:px-14"><UiText>{children}</UiText></div>
    </div>
  );
}

export function StudentTeamPageIntro({ title, description, action, meta }: { title: string; description: string; action?: ReactNode; meta?: ReactNode }) {
  return (
    <ExplorerHero
      title={<UiText>{title}</UiText>}
      description={<UiText>{description}</UiText>}
      context={meta}
      mark={<UiText>{title.replace(/\s/g, "").slice(0, 1)}</UiText>}
      action={action}
    />
  );
}

export function StudentTeamPagination({ page, totalPages, total, href }: { page: number; totalPages: number; total: number; href: (page: number) => string }) {
  if (totalPages <= 1) return null;
  return (
    <UiNav aria-label="페이지 이동" className="flex items-center justify-between gap-4 border-t border-[var(--line)] pt-6">
      <span className="text-sm text-[var(--muted)]"><UiText>{"전체"}</UiText>{" "}{total}<UiText>{"개 ·"}</UiText>{" "}{page}/{totalPages} {" "}<UiText>{"페이지"}</UiText></span>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link className="button-quiet gap-2" href={href(page - 1)}>
            <StudentTeamIcon name="chevron-left" className="size-4" />
            <UiText>{"이전"}</UiText></Link>
        ) : null}
        {page < totalPages ? (
          <Link className="button-quiet gap-2" href={href(page + 1)}>
            <UiText>{"다음"}</UiText><StudentTeamIcon name="chevron-right" className="size-4" />
          </Link>
        ) : null}
      </div>
    </UiNav>
  );
}
