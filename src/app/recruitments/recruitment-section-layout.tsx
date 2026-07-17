import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { href: "/recruitments", label: "모집 글 탐색" },
  { href: "/recruitments/applications", label: "내 모집 지원 이력" },
  { href: "/recruitments/new", label: "모집 글 등록" },
] as const;

export function RecruitmentSectionLayout({ currentPath, children }: { currentPath: string; children: ReactNode }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14">
      <aside className="border-b border-[var(--line)] pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
        <p className="text-sm font-extrabold text-[var(--ink)]">팀원 모집</p>
        <nav aria-label="팀원 모집 메뉴" className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:grid lg:gap-1">
          {navigation.map((item) => {
            const active = currentPath === item.href;
            return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-11 shrink-0 items-center border-l-2 px-3 text-sm font-semibold ${active ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary-hover)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}>{item.label}</Link>;
          })}
        </nav>
        <p className="muted mt-6 hidden border-t border-[var(--line)] pt-5 text-xs leading-5 lg:block">모집 글 탐색과 내 지원 결과를 분리해 필요한 흐름에 바로 집중할 수 있습니다.</p>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
