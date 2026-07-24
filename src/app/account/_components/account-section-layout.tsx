import Link from "next/link";
import type { ReactNode } from "react";

import type { UserRole } from "@/modules/identity/domain/user-role";

const commonItems = [
  { href: "/account", label: "계정 정보" },
  { href: "/notifications", label: "알림함" },
];

export function AccountSectionLayout({ role, currentPath, children }: { role: UserRole; currentPath: string; children: ReactNode }) {
  const items = role === "STUDENT"
    ? [commonItems[0], { href: "/account/profile", label: "프로젝트 프로필" }, commonItems[1]]
    : commonItems;
  return <div className="mx-auto grid max-w-[1280px] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:py-10">
    <aside className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-white px-4 py-4 shadow-[var(--shadow-card)] lg:self-start lg:sticky lg:top-24">
      <p className="eyebrow">마이페이지</p>
      <nav aria-label="계정 메뉴" className="mt-4 flex gap-2 overflow-x-auto lg:block lg:space-y-1">{items.map((item) => { const active = currentPath === item.href; return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`snap-color flex min-h-11 shrink-0 items-center rounded-2xl px-3 text-sm font-bold ${active ? "bg-[var(--primary-subtle)] text-[var(--primary)]" : "text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"}`}>{item.label}</Link>; })}</nav>
    </aside>
    <main className="page-enter min-w-0 pb-24 lg:pb-10">{children}</main>
  </div>;
}
