import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { href: "/recruitments", label: "모집 글 탐색", group: "browse" },
  { href: "/recruitments/applications", label: "보낸 지원", group: "mine" },
  { href: "/recruitments/mine", label: "작성한 모집", group: "mine" },
] as const;

function NavigationLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`snap-color relative flex min-h-11 shrink-0 items-center px-3 text-sm font-bold lg:px-4 ${
        active
          ? "bg-[var(--primary-subtle)] text-[var(--primary-hover)] before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:bg-[var(--primary)]"
          : "text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"
      }`}
    >
      {label}
    </Link>
  );
}

export function RecruitmentSectionLayout({ currentPath, children }: { currentPath: string; children: ReactNode }) {
  const browse = navigation.filter((item) => item.group === "browse");
  const mine = navigation.filter((item) => item.group === "mine");

  return (
    <div className="grid gap-8 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-12">
      <aside className="self-start border-b border-[var(--line)] pb-5 lg:sticky lg:top-24 lg:border-b-0 lg:border-r lg:pb-8 lg:pr-7">
        <div className="flex items-center justify-between gap-4 lg:block">
          <div>
            <p className="text-xs font-extrabold tracking-[0.12em] text-[var(--primary)]">TEAM RECRUITING</p>
            <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-[var(--ink)]">팀원 모집</h2>
          </div>
          <Link className="button-secondary lg:mt-5 lg:flex lg:w-full" href="/recruitments/new" aria-current={currentPath === "/recruitments/new" ? "page" : undefined}>
            모집 글 등록
          </Link>
        </div>

        <nav aria-label="팀원 모집 메뉴" className="mt-5 flex gap-1 overflow-x-auto pb-1 lg:block lg:space-y-6">
          <div className="flex gap-1 lg:grid lg:gap-1">
            {browse.map((item) => <NavigationLink key={item.href} {...item} active={currentPath === item.href} />)}
          </div>
          <div className="flex gap-1 lg:grid lg:gap-1">
            <p className="hidden px-4 pb-1 text-xs font-bold text-[var(--muted)] lg:block">내 모집 · 지원</p>
            {mine.map((item) => <NavigationLink key={item.href} {...item} active={currentPath === item.href} />)}
          </div>
        </nav>

        <div className="mt-7 hidden border-t border-[var(--line)] pt-5 lg:block">
          <p className="border-l-2 border-[var(--accent)] pl-3 text-sm font-bold text-[var(--ink)]">지원 전 확인</p>
          <p className="muted mt-2 pl-[0.875rem] text-xs leading-5">지원한 글과 내가 연 모집의 검토 현황은 왼쪽 메뉴에서 계속 확인할 수 있습니다.</p>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function RecruitmentPageIntro({ label, title, description, action }: { label: string; title: string; description: string; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-6 border-b border-[var(--line)] pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <p className="text-sm font-extrabold text-[var(--primary)]">{label}</p>
        <h1 className="mt-2 text-[clamp(2rem,4vw,2.75rem)] font-black leading-tight tracking-[-0.045em] text-[var(--ink)]">{title}</h1>
        <p className="muted mt-3 text-base leading-7">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function RecruitmentPagination({ page, totalPages, total, href }: { page: number; totalPages: number; total: number; href: (page: number) => string }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="페이지 이동" className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
      <span className="muted text-sm">전체 {total}개 · {page}/{totalPages} 페이지</span>
      <div className="flex gap-2">
        {page > 1 ? <Link className="button-secondary" href={href(page - 1)}>이전</Link> : null}
        {page < totalPages ? <Link className="button-secondary" href={href(page + 1)}>다음</Link> : null}
      </div>
    </nav>
  );
}
