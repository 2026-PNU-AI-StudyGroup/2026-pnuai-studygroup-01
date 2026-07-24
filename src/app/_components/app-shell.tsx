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
      { href: "/topics/applications", label: "내 지원", icon: "file" },
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

function isNavigationActive(item: NavigationItem, currentPath: string, role: UserRole): boolean {
  if (item.href === "/topics" && currentPath.startsWith("/topics/applications")) return false;
  if (item.label !== "관리") return isSectionActive(item.href, currentPath);
  return role === "ADMIN"
    ? currentPath.startsWith("/admin/") || currentPath.startsWith("/professor/")
    : currentPath.startsWith("/professor/");
}

function isSectionActive(href: string, currentPath: string) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function NavIcon({ name, active = false }: { name: NavigationItem["icon"]; active?: boolean }) {
  const outlinePaths = {
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-4 2-6 6-6s6 2 6 6M16 5c3 0 4 2 4 4s-1 3-3 3M17 14c3 0 4 2 4 5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A8 8 0 0 0 15 6l-.3-2.6h-4L10.4 6A8 8 0 0 0 8.8 7L6.4 6 4.5 9.5 6.6 11a7 7 0 0 0 0 2L4.5 14.5 6.4 18l2.4-1a8 8 0 0 0 1.6 1l.3 2.6h4L15 18a8 8 0 0 0 1.6-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z" /></>,
  };
  const filledPaths = {
    home: <path d="M2.8 11.2 12 3l9.2 8.2-1.5 1.7-1.2-1.1V21H14v-6H10v6H5.5v-9.2l-1.2 1.1-1.5-1.7Z" />,
    search: <path fillRule="evenodd" d="M10.5 2.5a8 8 0 1 0 4.9 14.3l4.5 4.5 1.4-1.4-4.5-4.5a8 8 0 0 0-6.3-12.9Zm0 2.2a5.8 5.8 0 1 1 0 11.6 5.8 5.8 0 0 1 0-11.6Z" />,
    file: <path fillRule="evenodd" d="M5 2.5h9.2L19.5 8v13.5H5v-19Zm8 1.8V9h4.6L13 4.3ZM8.2 12h8v1.8h-8V12Zm0 4h8v1.8h-8V16Z" />,
    users: <path d="M9 3.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM1.8 21c.2-5.1 2.6-7.6 7.2-7.6s7 2.5 7.2 7.6H1.8Zm14-9.2c2.8-.4 5.2-2.1 5.2-5 0-2.3-1.6-3.8-4.1-3.8-.5 0-1 .1-1.4.2a5.6 5.6 0 0 1 .1 7.5l.2 1.1Zm1.8 1.7c3.1.8 4.6 3.3 4.6 7.5h-4.1a9.8 9.8 0 0 0-2.2-6.4c.5-.5 1.1-.8 1.7-1.1Z" />,
    settings: <path d="M19.4 13a7.7 7.7 0 0 0 .1-1 7.7 7.7 0 0 0-.1-1l2.1-1.6-2-3.5-2.6 1a7.4 7.4 0 0 0-1.7-1L14.8 3h-4l-.4 2.9a7.4 7.4 0 0 0-1.7 1l-2.6-1-2 3.5L6.2 11a7.7 7.7 0 0 0-.1 1 7.7 7.7 0 0 0 .1 1l-2.1 1.6 2 3.5 2.6-1a7.4 7.4 0 0 0 1.7 1l.4 2.9h4l.4-2.9a7.4 7.4 0 0 0 1.7-1l2.6 1 2-3.5-2.1-1.6ZM12.8 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" />,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={`size-5 shrink-0 ${active ? "fill-current" : "fill-none stroke-current stroke-[1.8]"}`}>{active ? filledPaths[name] : outlinePaths[name]}</svg>;
}

export function AppShell({ role, userId, userName, currentPath, children }: { role: UserRole; userId: string; userName: string; currentPath: string; children: ReactNode }) {
  const navigation = navigationFor(role);
  const roleLabel = role === "STUDENT" ? "학생" : role === "PROFESSOR" ? "교수" : "관리자";
  return (
    <div className="min-h-screen bg-[var(--workspace)]">
      <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
      <div className="app-shell min-h-screen bg-[var(--workspace)] lg:grid lg:grid-cols-[6.5rem_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen min-h-[42rem] flex-col items-center bg-transparent px-2 py-6 lg:flex">
          <Brand href="/topics" compact />
          <nav aria-label="주요 메뉴" className="mt-9 flex w-full flex-col gap-2">
            {navigation.map((item) => {
              const active = isNavigationActive(item, currentPath, role);
              return (
                <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`group flex min-h-[4.4rem] flex-col items-center justify-center gap-1.5 rounded-[var(--radius-control)] px-1 text-center text-[0.7rem] font-bold leading-tight transition-colors ${active ? "text-[var(--primary)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}>
                  <span className="grid size-9 place-items-center"><NavIcon name={item.icon} active={active} /></span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto flex w-full flex-col items-center gap-2 pt-4">
            <div className={`flex min-h-[4rem] flex-col items-center justify-center gap-0.5 text-[0.7rem] font-bold ${currentPath === "/notifications" ? "text-[var(--primary)]" : "text-[var(--muted)]"}`}>
              <NotificationIndicator userId={userId} active={currentPath === "/notifications"} />
              <span aria-hidden="true">알림</span>
            </div>
            <Link href="/account" aria-label={`${userName} 마이페이지`} aria-current={isSectionActive("/account", currentPath) ? "page" : undefined} className={`flex min-h-[4rem] w-full flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] text-[0.7rem] font-bold ${isSectionActive("/account", currentPath) ? "text-[var(--primary)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}>
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e8ebf2] text-[var(--muted)]">
                <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.75]"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.4-4.2 2.7-6.2 7-6.2s6.6 2 7 6.2" /></svg>
              </span>
              <span>{roleLabel}</span>
            </Link>
          </div>
        </aside>
        <div className="min-w-0 bg-[var(--workspace)]">
          <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-white/94 backdrop-blur-xl lg:hidden">
            <div className="flex h-[4.5rem] items-center justify-between gap-5 px-5 sm:px-8">
              <div><Brand href="/topics" ariaLabel="부산대학교 학과 프로젝트 탐색 모바일" /></div>
              <div className="flex items-center gap-2">
                <NotificationIndicator userId={userId} active={currentPath === "/notifications"} />
                <Link href="/account" aria-label={`${userName} 마이페이지 모바일`} aria-current={isSectionActive("/account", currentPath) ? "page" : undefined} className="grid size-10 place-items-center rounded-full bg-[#e8ebf2] text-[var(--muted)]">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.75]"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.4-4.2 2.7-6.2 7-6.2s6.6 2 7 6.2" /></svg>
                </Link>
              </div>
            </div>
          </header>
          <div id="main-content" tabIndex={-1}>{children}</div>
        </div>
        <nav aria-label="모바일 주요 메뉴" className="fixed inset-x-0 bottom-0 z-30 grid border-t border-[var(--line)] bg-white/94 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_35px_rgba(31,35,48,.08)] backdrop-blur-xl lg:hidden" style={{ gridTemplateColumns: `repeat(${navigation.length}, minmax(0, 1fr))` }}>
          {navigation.map((item) => {
            const active = isNavigationActive(item, currentPath, role);
            return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`snap-color my-1 flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-xs font-bold ${active ? "text-[var(--primary)]" : "text-[var(--muted)]"}`}><NavIcon name={item.icon} active={active} />{item.label}</Link>;
          })}
        </nav>
      </div>
    </div>
  );
}
