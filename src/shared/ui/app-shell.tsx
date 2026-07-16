import Link from "next/link";
import type { ReactNode } from "react";

import type { UserRole } from "@/modules/identity/domain/user-role";
import { NotificationIndicator } from "@/modules/notification/ui/notification-indicator";
import { Brand } from "@/shared/ui/brand";

type NavigationItem = {
  href: string;
  label: string;
  icon: "home" | "search" | "file" | "users" | "settings";
};

function navigationFor(role: UserRole): NavigationItem[] {
  if (role === "STUDENT") {
    return [
      { href: "/topics", label: "프로젝트 탐색", icon: "search" },
      { href: "/dashboard", label: "내 프로젝트", icon: "home" },
      { href: "/recruitments", label: "팀원 모집", icon: "users" },
    ];
  }
  if (role === "ADMIN") {
    return [
      { href: "/topics", label: "프로젝트 탐색", icon: "search" },
      { href: "/dashboard", label: "전체 프로젝트", icon: "home" },
      { href: "/admin/programs", label: "관리", icon: "settings" },
    ];
  }
  return [
    { href: "/topics", label: "프로젝트 탐색", icon: "search" },
    { href: "/dashboard", label: "지도 프로젝트", icon: "home" },
    { href: "/professor/topics", label: "관리", icon: "settings" },
  ];
}

function managementNavigationFor(role: UserRole): Array<Pick<NavigationItem, "href" | "label">> {
  if (role === "ADMIN") return [
    { href: "/admin/programs", label: "프로그램" },
    { href: "/admin/academic-cycles", label: "학기" },
    { href: "/admin/professors", label: "교수 권한" },
    { href: "/admin/users", label: "사용자" },
    { href: "/admin/audit", label: "감사 기록" },
    { href: "/professor/topics", label: "주제" },
    { href: "/professor/applications", label: "지원 검토" },
  ];
  if (role === "PROFESSOR") return [
    { href: "/professor/topics", label: "주제" },
    { href: "/professor/applications", label: "지원 검토" },
  ];
  return [];
}

function isNavigationActive(item: NavigationItem, currentPath: string, role: UserRole): boolean {
  if (item.label !== "관리") return currentPath === item.href;
  return role === "ADMIN"
    ? currentPath.startsWith("/admin/") || currentPath.startsWith("/professor/")
    : currentPath.startsWith("/professor/");
}

function NavIcon({ name }: { name: NavigationItem["icon"] }) {
  const paths = {
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-4 2-6 6-6s6 2 6 6M16 5c3 0 4 2 4 4s-1 3-3 3M17 14c3 0 4 2 4 5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A8 8 0 0 0 15 6l-.3-2.6h-4L10.4 6A8 8 0 0 0 8.8 7L6.4 6 4.5 9.5 6.6 11a7 7 0 0 0 0 2L4.5 14.5 6.4 18l2.4-1a8 8 0 0 0 1.6 1l.3 2.6h4L15 18a8 8 0 0 0 1.6-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 fill-none stroke-current stroke-[1.8] lg:hidden">{paths[name]}</svg>;
}

export function AppShell({ role, userId, userName, currentPath, children }: { role: UserRole; userId: string; userName: string; currentPath: string; children: ReactNode }) {
  const navigation = navigationFor(role);
  const managementNavigation = managementNavigationFor(role);
  const showManagementNavigation = managementNavigation.some(({ href }) => currentPath === href);
  const roleLabel = role === "STUDENT" ? "학생" : role === "PROFESSOR" ? "교수" : "관리자";
  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-8 px-6">
          <Brand href="/topics" />
          <nav aria-label="주요 메뉴" className="hidden h-full items-center gap-8 lg:flex">
            {navigation.map((item) => {
              const active = isNavigationActive(item, currentPath, role);
              return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`snap-color relative flex h-full items-center text-sm font-semibold ${active ? "text-[var(--accent)] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}>{item.label}</Link>;
            })}
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <NotificationIndicator userId={userId} active={currentPath === "/notifications"} />
            <Link href="/account" aria-current={currentPath === "/account" ? "page" : undefined} className="snap-color flex min-h-11 min-w-11 items-center justify-end gap-3 rounded-lg text-right hover:text-[var(--accent-hover)]" aria-label={`${userName} 계정 정보`}>
              <span className="hidden min-w-0 sm:block"><span className="block truncate text-sm font-semibold">{userName}</span><span className="muted block text-xs">내 정보</span></span>
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--accent-subtle)] text-sm font-extrabold text-[var(--accent-hover)]">{userName.trim().charAt(0) || "나"}</span>
              <span className="sr-only">{roleLabel}</span>
            </Link>
          </div>
        </div>
        {showManagementNavigation ? (
          <nav aria-label="관리 메뉴" className="mx-auto flex max-w-[1280px] gap-6 overflow-x-auto px-6">
            {managementNavigation.map((item) => {
              const active = currentPath === item.href;
              return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`snap-color flex min-h-11 shrink-0 items-center border-b-2 text-sm font-semibold ${active ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}>{item.label}</Link>;
            })}
          </nav>
        ) : null}
      </header>
      {children}
      <nav aria-label="모바일 주요 메뉴" className="fixed inset-x-0 bottom-0 z-30 grid border-t border-[var(--line)] bg-white px-2 pb-[env(safe-area-inset-bottom)] lg:hidden" style={{ gridTemplateColumns: `repeat(${navigation.length}, minmax(0, 1fr))` }}>
        {navigation.map((item) => {
          const active = isNavigationActive(item, currentPath, role);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`snap-color flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[0.6875rem] font-bold ${active ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}><NavIcon name={item.icon} />{item.label}</Link>;
        })}
      </nav>
    </div>
  );
}
