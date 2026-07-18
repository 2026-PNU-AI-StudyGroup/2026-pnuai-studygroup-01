import Link from "next/link";
import type { ReactNode } from "react";

const items = [
  { href: "/account", label: "계정 정보" },
  { href: "/account/profile", label: "프로젝트 프로필" },
  { href: "/notifications", label: "알림함" },
];

export function AccountSectionLayout({ currentPath, children }: { currentPath: string; children: ReactNode }) {
  return <div className="mx-auto grid max-w-[1180px] lg:grid-cols-[13.5rem_minmax(0,1fr)]">
    <aside className="border-b border-[var(--line)] px-6 py-5 lg:min-h-[calc(100vh-4.5rem)] lg:border-b-0 lg:border-r lg:py-10">
      <p className="eyebrow">마이페이지</p>
      <nav aria-label="계정 메뉴" className="mt-4 flex gap-2 overflow-x-auto lg:block lg:space-y-1">{items.map((item) => { const active = currentPath === item.href; return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`snap-color flex min-h-11 shrink-0 items-center border-l-2 px-3 text-sm font-bold ${active ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}>{item.label}</Link>; })}</nav>
    </aside>
    <main className="page-enter min-w-0 px-6 py-9 pb-28 lg:px-12 lg:py-12">{children}</main>
  </div>;
}
