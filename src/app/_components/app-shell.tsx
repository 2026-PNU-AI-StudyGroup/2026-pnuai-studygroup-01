import Link from "next/link";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { ReactNode } from "react";

import { openNotificationAction } from "@/app/_actions/notification-actions";
import { updateLanguageAction } from "@/app/_actions/language-actions";
import { NotificationIndicatorContainer } from "@/app/_components/notification-indicator-container";
import type { UserRole } from "@/modules/identity/domain/user-role";
import { AccountPopover } from "@/modules/identity/ui/account-popover";
import { requireCompletedStudentOnboarding } from "@/modules/identity/infrastructure/student-onboarding-guard";
import type { SiteLocale } from "@/modules/translation/domain/site-locale";
import { readStoredContentTranslations } from "@/modules/translation/application/localize-stored-content";
import { ReadStoredTranslationService } from "@/modules/translation/application/read-stored-translation";
import { PrismaStoredTranslationReader } from "@/modules/translation/infrastructure/prisma-stored-translation-reader";
import { getUserLocale } from "@/modules/translation/infrastructure/user-locale";
import { I18nProvider } from "@/modules/translation/ui/i18n-provider";
import { AppToaster } from "@/shared/ui/app-toaster";
import { LanguagePopover } from "@/modules/translation/ui/language-popover";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { Brand } from "@/shared/ui/brand";

type NavigationItem = {
  href: string;
  label: string;
  icon: "home" | "search" | "users" | "notice" | "settings";
};

function navigationFor(role: UserRole, locale: SiteLocale): NavigationItem[] {
  const label = locale === "ko"
    ? {
        explore: "프로젝트 찾기",
        myTeam: "내 팀",
        announcements: "공지사항",
        allProjects: "전체 프로젝트",
        mentoredProjects: "프로젝트 운영",
        manage: "관리",
      }
    : {
        explore: "Explore",
        myTeam: "My team",
        announcements: "Notices",
        allProjects: "All projects",
        mentoredProjects: "Mentoring",
        manage: "Manage",
      };
  if (role === "STUDENT") {
    return [
      { href: "/topics", label: label.explore, icon: "search" },
      { href: "/dashboard", label: label.myTeam, icon: "users" },
      { href: "/announcements", label: label.announcements, icon: "notice" },
    ];
  }
  if (role === "ADMIN") {
    return [
      { href: "/topics", label: label.explore, icon: "search" },
      { href: "/dashboard", label: label.allProjects, icon: "home" },
      { href: "/announcements", label: label.announcements, icon: "notice" },
      { href: "/admin/programs", label: label.manage, icon: "settings" },
    ];
  }
  return [
    { href: "/topics", label: label.explore, icon: "search" },
    { href: "/dashboard", label: label.mentoredProjects, icon: "home" },
    { href: "/announcements", label: label.announcements, icon: "notice" },
    { href: "/professor/topics", label: label.manage, icon: "settings" },
  ];
}

function isNavigationActive(item: NavigationItem, currentPath: string, role: UserRole): boolean {
  if (role === "STUDENT" && item.href === "/dashboard") {
    return isSectionActive("/dashboard", currentPath) ||
      isSectionActive("/projects", currentPath) ||
      isSectionActive("/project-approvals", currentPath) ||
      isSectionActive("/recruitments", currentPath) ||
      isSectionActive("/teams", currentPath);
  }
  if (item.href !== "/admin/programs" && item.href !== "/professor/topics") return isSectionActive(item.href, currentPath);
  if (currentPath.startsWith("/project-approvals")) return true;
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
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-4 2-6 6-6s6 2 6 6M16 5c3 0 4 2 4 4s-1 3-3 3M17 14c3 0 4 2 4 5" /></>,
    notice: <><path d="M6 4h12v16H6z" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A8 8 0 0 0 15 6l-.3-2.6h-4L10.4 6A8 8 0 0 0 8.8 7L6.4 6 4.5 9.5 6.6 11a7 7 0 0 0 0 2L4.5 14.5 6.4 18l2.4-1a8 8 0 0 0 1.6 1l.3 2.6h4L15 18a8 8 0 0 0 1.6-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z" /></>,
  };
  const filledPaths = {
    home: <path d="M2.8 11.2 12 3l9.2 8.2-1.5 1.7-1.2-1.1V21H14v-6H10v6H5.5v-9.2l-1.2 1.1-1.5-1.7Z" />,
    search: <path fillRule="evenodd" d="M10.5 2.5a8 8 0 1 0 4.9 14.3l4.5 4.5 1.4-1.4-4.5-4.5a8 8 0 0 0-6.3-12.9Zm0 2.2a5.8 5.8 0 1 1 0 11.6 5.8 5.8 0 0 1 0-11.6Z" />,
    users: <path d="M9 3.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM1.8 21c.2-5.1 2.6-7.6 7.2-7.6s7 2.5 7.2 7.6H1.8Zm14-9.2c2.8-.4 5.2-2.1 5.2-5 0-2.3-1.6-3.8-4.1-3.8-.5 0-1 .1-1.4.2a5.6 5.6 0 0 1 .1 7.5l.2 1.1Zm1.8 1.7c3.1.8 4.6 3.3 4.6 7.5h-4.1a9.8 9.8 0 0 0-2.2-6.4c.5-.5 1.1-.8 1.7-1.1Z" />,
    notice: <path d="M5 3h14v18H5V3Zm3 4v2h8V7H8Zm0 4v2h8v-2H8Zm0 4v2h5v-2H8Z" />,
    settings: <path d="M19.4 13a7.7 7.7 0 0 0 .1-1 7.7 7.7 0 0 0-.1-1l2.1-1.6-2-3.5-2.6 1a7.4 7.4 0 0 0-1.7-1L14.8 3h-4l-.4 2.9a7.4 7.4 0 0 0-1.7 1l-2.6-1-2 3.5L6.2 11a7.7 7.7 0 0 0-.1 1 7.7 7.7 0 0 0 .1 1l-2.1 1.6 2 3.5 2.6-1a7.4 7.4 0 0 0 1.7 1l.4 2.9h4l.4-2.9a7.4 7.4 0 0 0 1.7-1l2.6 1 2-3.5-2.1-1.6ZM12.8 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" />,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={`size-5 shrink-0 ${active ? "fill-current" : "fill-none stroke-current stroke-[1.75]"}`}>{active ? filledPaths[name] : outlinePaths[name]}</svg>;
}

export async function AppShell({ role, userId, userName, currentPath, children, preferredLocale }: { role: UserRole; userId: string; userName: string; currentPath: string; children: ReactNode; preferredLocale?: SiteLocale }) {
  if (currentPath !== "/onboarding") {
    await requireCompletedStudentOnboarding({ id: userId, role });
  }
  const locale = preferredLocale ?? await getUserLocale(userId);
  const storedTranslations = await readStoredContentTranslations(
    children,
    locale,
    new ReadStoredTranslationService(new PrismaStoredTranslationReader(prisma)),
  );
  const navigation = navigationFor(role, locale);
  if (
    role === "STUDENT" &&
    await prisma.projectAssistant.count({ where: { userId } }) > 0
  ) {
    navigation.splice(2, 0, {
      href: "/professor/topics",
      label: locale === "ko" ? "조교 관리" : "Assistant",
      icon: "settings",
    });
  }
  const roleLabel = locale === "ko"
    ? role === "STUDENT" ? "학생" : role === "PROFESSOR" ? "교수" : "관리자"
    : role === "STUDENT" ? "Student" : role === "PROFESSOR" ? "Professor" : "Administrator";
  const shellCopy = locale === "ko"
    ? { skip: "본문으로 건너뛰기", navigation: "주요 메뉴", mobileNavigation: "모바일 주요 메뉴", mobileBrand: "부산대학교 학과 프로젝트 찾기 모바일" }
    : { skip: "Skip to content", navigation: "Primary navigation", mobileNavigation: "Mobile navigation", mobileBrand: "Pusan National University project explorer mobile" };
  return (
    <I18nProvider locale={locale} storedTranslations={storedTranslations}>
    <div className="min-h-screen bg-[var(--workspace)]">
      <a href="#main-content" className="skip-link">{shellCopy.skip}</a>
      <div className="app-shell min-h-screen bg-[var(--workspace)] lg:grid lg:grid-cols-[6.5rem_minmax(0,1fr)]">
        <aside className="sticky top-0 z-40 hidden h-screen min-h-[42rem] flex-col items-center border-r border-[var(--line)] bg-[var(--sidebar)] px-2 py-6 lg:flex">
          <Brand href="/topics" variant="sidebar" />
          <nav aria-label={shellCopy.navigation} className="mt-9 flex w-full flex-col gap-1">
            {navigation.map((item) => {
              const active = isNavigationActive(item, currentPath, role);
              return (
                <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`group flex min-h-[4.4rem] flex-col items-center justify-center gap-1.5 rounded-[var(--radius-control)] px-1 text-center text-[0.7rem] font-semibold leading-tight transition-colors ${active ? "bg-[var(--primary-subtle)] text-[var(--primary)]" : "text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"}`}>
                  <span className="grid size-9 place-items-center"><NavIcon name={item.icon} active={active} /></span>
                  <span><UiText>{item.label}</UiText></span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto flex w-full flex-col items-center gap-2 pt-4">
            <NotificationIndicatorContainer
              userId={userId}
              active={currentPath === "/notifications"}
              openNotification={openNotificationAction}
            />
            <LanguagePopover locale={locale} updateLanguage={updateLanguageAction} />
            <AccountPopover userName={userName} roleLabel={roleLabel} active={isSectionActive("/account", currentPath)} accountPageCurrent={currentPath === "/account"} locale={locale} />
          </div>
        </aside>
        <div className="min-w-0 bg-[var(--workspace)]">
          <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-white/94 backdrop-blur-xl lg:hidden">
            <div className="flex h-[4.5rem] items-center justify-between gap-5 px-5 sm:px-8">
              <div><Brand href="/topics" ariaLabel={shellCopy.mobileBrand} /></div>
              <div className="flex items-center gap-2">
                <NotificationIndicatorContainer
                  userId={userId}
                  active={currentPath === "/notifications"}
                  placement="below"
                  openNotification={openNotificationAction}
                />
                <LanguagePopover locale={locale} updateLanguage={updateLanguageAction} placement="below" />
                <AccountPopover userName={userName} roleLabel={roleLabel} active={isSectionActive("/account", currentPath)} accountPageCurrent={currentPath === "/account"} placement="below" locale={locale} />
              </div>
            </div>
          </header>
          <div id="main-content" tabIndex={-1}><UiText>{children}</UiText></div>
        </div>
        <nav aria-label={shellCopy.mobileNavigation} className="fixed inset-x-0 bottom-0 z-30 grid border-t border-[var(--line)] bg-white/94 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_35px_rgba(31,35,48,.08)] backdrop-blur-xl lg:hidden" style={{ gridTemplateColumns: `repeat(${navigation.length}, minmax(0, 1fr))` }}>
          {navigation.map((item) => {
            const active = isNavigationActive(item, currentPath, role);
            return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`snap-color my-1 flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-xs font-semibold ${active ? "text-[var(--primary)]" : "text-[var(--muted)]"}`}><NavIcon name={item.icon} active={active} /><UiText>{item.label}</UiText></Link>;
          })}
        </nav>
        <AppToaster />
      </div>
    </div>
    </I18nProvider>
  );
}
