import Link from "next/link";
import type { ReactNode } from "react";

import styles from "@/app/recruitments/_components/recruitment-hero.module.css";

const navigation = [
  { href: "/recruitments", label: "지원 가능한 모집", group: "browse", icon: "shield" },
  { href: "/recruitments/applications", label: "보낸 지원", group: "mine", icon: "send" },
  { href: "/recruitments/mine", label: "작성한 모집", group: "mine", icon: "document" },
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
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={`${className} shrink-0 fill-none stroke-current stroke-[1.7]`}>{paths[name]}</svg>;
}

function NavigationLink({ href, label, icon, active }: { href: string; label: string; icon: "shield" | "send" | "document"; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`snap-color relative flex min-h-12 shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-bold lg:px-4 ${
        active
          ? "bg-[var(--primary-subtle)] text-[var(--primary-hover)] after:absolute after:right-3 after:size-1 after:rounded-full after:bg-[var(--primary)]"
          : "text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"
      }`}
    >
      <RecruitmentIcon name={icon} />
      {label}
    </Link>
  );
}

export function RecruitmentSectionLayout({ currentPath, children }: { currentPath: string; children: ReactNode }) {
  const browse = navigation.filter((item) => item.group === "browse");
  const mine = navigation.filter((item) => item.group === "mine");

  return (
    <div className="grid gap-8 lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:gap-10">
      <aside className="self-start overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white lg:sticky lg:top-24">
        <div className="p-4">
          <Link className="button-primary flex w-full justify-between px-5" href="/recruitments/new" aria-current={currentPath === "/recruitments/new" ? "page" : undefined}>
            <span>모집 글 등록</span>
            <RecruitmentIcon name="plus" />
          </Link>
        </div>

        <nav aria-label="팀원 모집 메뉴" className="flex gap-1 overflow-x-auto border-t border-[var(--line)] p-3 lg:block lg:space-y-3">
          <div className="flex gap-1 lg:grid lg:gap-1">
            {browse.map((item) => <NavigationLink key={item.href} {...item} active={currentPath === item.href} />)}
          </div>
          <div className="flex gap-1 lg:grid lg:gap-1">
            {mine.map((item) => <NavigationLink key={item.href} {...item} active={currentPath === item.href} />)}
          </div>
        </nav>

        <div className="hidden border-t border-[var(--line)] bg-[var(--surface-subtle)] p-5 lg:block">
          <p className="flex items-center gap-2 text-sm font-extrabold text-[var(--ink)]"><span className="text-[var(--accent)]">●</span> 지원 전 확인</p>
          <p className="muted mt-2 text-sm leading-6">보낸 지원과 내가 연 모집의 검토 현황을 이 메뉴에서 확인할 수 있습니다.</p>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function RecruitmentHero() {
  return (
    <header className="recruitment-hero relative overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] px-6 py-9 sm:px-10 sm:py-11 lg:px-16">
      <div className="portal-hero-copy relative z-10 max-w-xl">
        <p className="text-sm font-extrabold text-[var(--primary)]">PROJECT TEAMWORK</p>
        <h1 className="mt-3 text-[clamp(2.5rem,5vw,3.75rem)] font-black leading-[1.05] tracking-[-0.055em] text-[var(--ink)]">팀원 모집</h1>
        <p className="muted mt-4 max-w-md text-base leading-7 sm:text-lg sm:leading-8">프로젝트의 역할과 필요 역량, 협업 방식을 비교하고 나에게 맞는 팀에 지원해 보세요.</p>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] hidden w-[47%] items-center justify-center lg:flex" aria-hidden="true">
        <div className={styles.art}>
          <span className={styles.bubble}>•••</span>
          <span className={`${styles.person} ${styles.personLeft}`} />
          <span className={`${styles.person} ${styles.personRight}`} />
          <span className={`${styles.person} ${styles.personMain}`} />
          <span className={styles.magnifier} />
        </div>
      </div>
    </header>
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
