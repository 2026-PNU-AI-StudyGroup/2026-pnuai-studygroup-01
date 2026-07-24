import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { href: "/recruitments", label: "모집 찾기", group: "browse", icon: "shield" },
  { href: "/recruitments/applications", label: "지원 현황", group: "mine", icon: "send" },
  { href: "/recruitments/mine", label: "내 모집", group: "mine", icon: "document" },
] as const;

function RecruitmentIcon({ name, className = "size-5" }: { name: "shield" | "send" | "document" | "plus" | "people" | "search"; className?: string }) {
  const paths = {
    shield: <><path d="M12 3 5.5 5.6v5.8c0 4.2 2.6 7.7 6.5 9.6 3.9-1.9 6.5-5.4 6.5-9.6V5.6L12 3Z" /><path d="m9.2 12 1.8 1.8 3.8-4" /></>,
    send: <><path d="m21 3-7.2 18-3.3-7.5L3 10.2 21 3Z" /><path d="m10.5 13.5 4.4-4.4" /></>,
    document: <><path d="M6 3.5h9l3 3V21H6Z" /><path d="M14.5 3.5V7H18M9 11h6M9 15h6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    people: <><circle cx="9" cy="8.5" r="3" /><path d="M3.5 20c0-4 1.9-6.2 5.5-6.2s5.5 2.2 5.5 6.2M16 6c2.7 0 4 1.7 4 3.5s-1.2 3.1-3 3.3M17 14.7c2.7.4 4 2.1 4 5.3" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={`${className} shrink-0 fill-none stroke-current stroke-[1.8]`}>{paths[name]}</svg>;
}

function NavigationLink({ href, label, icon, active }: { href: string; label: string; icon: "shield" | "send" | "document"; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`snap-color relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-1.5 rounded-lg px-1 text-center text-xs font-bold leading-4 lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-left lg:text-sm ${
        active
          ? "bg-[var(--primary-subtle)] text-[var(--primary-hover)] after:absolute after:right-3 after:hidden after:size-1 after:rounded-full after:bg-[var(--primary)] lg:after:block"
          : "text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"
      }`}
    >
      <RecruitmentIcon name={icon} />
      {label}
    </Link>
  );
}

export function RecruitmentSectionLayout({ currentPath, children }: { currentPath: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-2 shadow-[var(--shadow-card)] sm:flex-row sm:items-center">
        <nav aria-label="팀원 모집 메뉴" className="grid flex-1 grid-cols-3 gap-1">
          {navigation.map((item) => <NavigationLink key={item.href} {...item} active={currentPath === item.href} />)}
        </nav>
        <Link className="button-primary shrink-0 gap-2 max-sm:w-full" href="/recruitments/new" aria-current={currentPath === "/recruitments/new" ? "page" : undefined}>
          <RecruitmentIcon name="plus" />
          <span>새 모집</span>
        </Link>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function RecruitmentHero() {
  return (
    <header className="recruitment-hero grid min-h-[18rem] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white lg:grid-cols-[minmax(0,.9fr)_minmax(23rem,1.1fr)]">
      <div className="flex flex-col justify-center px-6 py-8 sm:px-10 lg:px-12">
        <p className="text-xs font-black tracking-[0.14em] text-[var(--primary)]">함께할 동료 찾기</p>
        <h1 className="mt-3 text-[clamp(2.4rem,5vw,3.5rem)] font-black leading-[1.05] tracking-[-0.06em] text-[var(--ink)]">팀원 모집</h1>
        <p className="mt-4 max-w-md text-base leading-7 text-[var(--muted)]">프로젝트의 역할과 필요 역량, 협업 방식을 비교하고 나에게 맞는 팀에 지원해 보세요.</p>
      </div>
      <div className="relative hidden min-h-[18rem] overflow-hidden bg-[#f5f6f8] lg:block" aria-hidden="true">
        <Image src="/illustrations/project-collaboration-3d.png" alt="" fill priority sizes="46vw" className="object-cover object-center" />
      </div>
    </header>
  );
}

export function RecruitmentPageIntro({ label, title, description, action }: { label: string; title: string; description: string; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <p className="text-xs font-black tracking-[0.14em] text-[var(--primary)]">{label}</p>
        <h1 className="mt-2 text-[clamp(2rem,4vw,2.75rem)] font-black leading-tight tracking-[-0.05em] text-[var(--ink)]">{title}</h1>
        <p className="mt-3 text-base leading-7 text-[var(--muted)]">{description}</p>
      </div>
      {action ? <div className="flex w-full sm:w-auto sm:shrink-0 [&>*]:max-sm:w-full">{action}</div> : null}
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
