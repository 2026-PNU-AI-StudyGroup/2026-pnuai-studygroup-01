import Link from "next/link";
import { UiAside, UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { ReactNode } from "react";
import { ExplorerHero } from "@/shared/ui/explorer-hero";
import { PaginationDirectionLink } from "@/shared/ui/icon-button";
import { ResponsiveSectionNavigation } from "@/shared/ui/responsive-section-navigation";

const navigation = [
  { href: "/recruitments", label: "둘러보기", icon: "search" },
  { href: "/teams", label: "내 팀", icon: "document" },
  { href: "/recruitments/received", label: "받은 지원", icon: "inbox" },
  { href: "/recruitments/applications", label: "지원 내역", icon: "send" },
] as const;

type StudentTeamIconName = "search" | "send" | "document" | "inbox" | "plus" | "chevron-left" | "chevron-right";

export function StudentTeamIcon({ name, className = "size-5" }: { name: StudentTeamIconName; className?: string }) {
  const paths = {
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    send: <><path d="m21 3-7.2 18-3.3-7.5L3 10.2 21 3Z" /><path d="m10.5 13.5 4.4-4.4" /></>,
    document: <><path d="M6 3.5h9l3 3V21H6Z" /><path d="M14.5 3.5V7H18M9 11h6M9 15h6" /></>,
    inbox: <><path d="M4 4.5h16v14H4Z" /><path d="M4 14h4l1.5 2h5l1.5-2h4M8 8h8" /></>,
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
  // 내 팀(/teams)이 팀 관리 경로를 포함한다.
  if (href === "/teams") return currentPath === "/teams" || currentPath.startsWith("/teams/") || currentPath.startsWith("/recruitments/mine");
  if (href === "/recruitments") return currentPath === "/recruitments";
  if (href === "/recruitments/received") return currentPath === "/recruitments/received";
  return currentPath === href;
}

export function StudentTeamSectionLayout({ currentPath, children }: { currentPath: string; children: ReactNode }) {
  const current = navigation.find((item) => isTeamNavigationActive(item.href, currentPath)) ?? navigation[0];

  return (
    <div className="grid w-full grid-cols-[minmax(0,1fr)] lg:min-h-screen lg:grid-cols-[var(--shell-panel)_minmax(0,1fr)]">
      <UiAside aria-label="팀 영역 메뉴" className="shell-panel min-w-0 bg-[var(--surface)] lg:border-r lg:border-[var(--line)]">
        {/* 여백을 안쪽으로 옮겼다. 칸이 0 으로 줄 때 바깥에 있으면 여백부터 찌그러진다. */}
        <div className="w-full bg-[var(--surface)] px-5 pb-5 pt-5 sm:px-8 lg:min-h-screen lg:w-[var(--shell-panel-open)] lg:px-5 lg:py-8">
        <div className="lg:sticky lg:top-8">
          <div className="hidden border-b border-[var(--line)] pb-6 lg:block">
            <p className="text-base font-bold tracking-[-0.025em] text-[var(--ink)]"><UiText>{"팀 모집"}</UiText></p>
          </div>

          <ResponsiveSectionNavigation
            eyebrow={<UiText>{"팀 모집"}</UiText>}
            label={<span className="flex min-w-0 items-center gap-2.5"><StudentTeamIcon name={current.icon} /><UiText>{current.label}</UiText></span>}
          >
            <UiNav aria-label="팀 메뉴 모바일">
              <ul className="grid grid-cols-2 gap-x-4 sm:grid-cols-4">
                {navigation.map((item) => {
                  const active = isTeamNavigationActive(item.href, currentPath);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`flex min-h-11 items-center gap-2 border-b px-1 text-sm font-semibold ${
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
          </ResponsiveSectionNavigation>

          <UiNav aria-label="팀 메뉴" className="mt-5 hidden lg:block">
            <ul className="flex flex-col">
              {navigation.map((item) => {
                const active = isTeamNavigationActive(item.href, currentPath);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`snap-color relative flex min-h-11 items-center gap-3 border-l-2 px-3 text-sm font-semibold ${
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
        </div>
      </UiAside>
      <div className="min-w-0 px-5 pb-24 pt-6 sm:px-8 lg:px-10 lg:pb-12 lg:pt-10 xl:px-12 2xl:px-14"><UiText>{children}</UiText></div>
    </div>
  );
}

export function StudentTeamPageIntro({ title, description, action, meta }: { title: string; description?: ReactNode; action?: ReactNode; meta?: ReactNode }) {
  return (
    <ExplorerHero
      title={<UiText>{title}</UiText>}
      description={description ? <UiText>{description}</UiText> : undefined}
      context={meta}
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
        {page > 1 ? <PaginationDirectionLink direction="previous" href={href(page - 1)} /> : null}
        {page < totalPages ? <PaginationDirectionLink direction="next" href={href(page + 1)} /> : null}
      </div>
    </UiNav>
  );
}
