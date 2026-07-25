import Link from "next/link";
import type { ReactNode } from "react";

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
    <div className="grid w-full grid-cols-[minmax(0,1fr)] lg:min-h-screen lg:grid-cols-[13.5rem_minmax(0,1fr)]">
      <aside aria-label="팀 영역 메뉴" className="min-w-0 bg-white px-5 pb-5 pt-5 sm:px-8 lg:border-r lg:border-[var(--line)] lg:px-5 lg:py-8">
        <div className="lg:sticky lg:top-8">
          <div className="hidden border-b border-[var(--line)] pb-6 lg:block">
            <p className="text-base font-extrabold tracking-[-0.025em] text-[var(--ink)]">팀</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">팀 구성과 모집을 관리합니다.</p>
          </div>

          <details className="group lg:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 border-y border-[var(--line)] py-2.5 [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 items-center gap-2.5 text-sm font-extrabold text-[var(--primary-hover)]">
                <StudentTeamIcon name={current.icon} />
                {current.label}
              </span>
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0 fill-none stroke-[var(--muted)] stroke-[1.75] transition-transform group-open:rotate-180">
                <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <nav aria-label="팀 메뉴 모바일" className="border-b border-[var(--line)] py-2">
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
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </details>

          <nav aria-label="팀 메뉴" className="mt-5 hidden lg:block">
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
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>
      <div className="min-w-0 px-5 pb-16 pt-5 sm:px-8 sm:pt-8 lg:px-10 lg:py-10 xl:px-12">{children}</div>
    </div>
  );
}

export function StudentTeamPageIntro({ title, description, action, meta }: { title: string; description: string; action?: ReactNode; meta?: ReactNode }) {
  return (
    <header className="flex flex-col items-start justify-between gap-6 rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-6 sm:flex-row sm:items-end sm:gap-10 sm:p-7">
      <div className="min-w-0 max-w-3xl">
        {meta ? <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">{meta}</div> : null}
        <h1 className="text-[clamp(2.25rem,3.4vw,3.25rem)] font-black leading-[1.04] tracking-[-0.055em] text-[var(--ink)]">{title}</h1>
        <p className="mt-3 max-w-2xl text-[0.95rem] leading-6 text-[var(--muted)]">{description}</p>
      </div>
      {action ? <div className="flex shrink-0">{action}</div> : null}
    </header>
  );
}

export function StudentTeamPagination({ page, totalPages, total, href }: { page: number; totalPages: number; total: number; href: (page: number) => string }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="페이지 이동" className="flex items-center justify-between gap-4 border-t border-[var(--line)] pt-6">
      <span className="text-sm text-[var(--muted)]">전체 {total}개 · {page}/{totalPages} 페이지</span>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link className="button-quiet gap-2" href={href(page - 1)}>
            <StudentTeamIcon name="chevron-left" className="size-4" />
            이전
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link className="button-quiet gap-2" href={href(page + 1)}>
            다음
            <StudentTeamIcon name="chevron-right" className="size-4" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
