import Link from "next/link";
import type { ReactNode } from "react";

import { AccountIcon, ProfileIcon } from "@/shared/ui/workspace-icons";
import type { UserRole } from "@/modules/identity/domain/user-role";

export function AccountSectionLayout({ role, currentPath, children }: { role: UserRole; currentPath: string; children: ReactNode }) {
  const items = role === "STUDENT"
    ? [
        { href: "/account", label: "계정 정보", icon: AccountIcon },
        { href: "/account/profile", label: "프로젝트 프로필", icon: ProfileIcon },
      ]
    : [];
  return (
    <div className="w-full px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <header className="border-b border-[var(--line)]">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <h1 className="pb-3 text-[2rem] font-extrabold tracking-[-0.04em] text-[var(--ink)]">내 계정</h1>
          {items.length ? <nav aria-label="계정 메뉴" className="flex min-w-0 gap-7 overflow-x-auto">
            {items.map((item) => {
              const active = currentPath === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`snap-color relative flex min-h-12 shrink-0 items-center gap-2 pb-3 text-sm font-bold ${
                    active
                      ? "text-[var(--primary)] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[var(--primary)]"
                      : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  <Icon className="size-[18px]" />
                  {item.label}
                </Link>
              );
            })}
          </nav> : null}
        </div>
      </header>
      <main className="page-enter min-w-0 pb-24 pt-10 lg:pb-10 lg:pt-12">{children}</main>
    </div>
  );
}
