import Link from "next/link";
import type { ReactNode } from "react";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { PaginationDirectionLink } from "@/shared/ui/icon-button";

/**
 * 줄 안의 버튼. 칸만큼 늘리지 않고 내용 크기의 낮은 테두리 버튼으로 둔다.
 * 회수, 비활성화도 같은 회색 테두리다. 줄마다 빨간 단추가 서면 경고가 무늬가 되고, 확인 창이 결과를 말해 준다.
 */
export const adminRowButton = "button-secondary button-compact min-h-8 px-3 font-medium";

/** 목록 표의 머리 줄. 띠를 깔지 않고 12px 회색 글자만 둔다. 좁으면 숨기고 줄이 두 줄로 흐른다. */
export const adminHeadRow = "hidden h-9 items-center gap-x-5 px-5 text-xs text-[var(--muted)] @min-[48rem]:grid";
/** 목록 한 줄. 선 하나로만 나누고 눌러 볼 줄이 아니면 바탕을 바꾸지 않는다. */
export const adminRow = "grid gap-x-5 gap-y-1.5 border-t border-[var(--line)] px-5 py-3 @min-[48rem]:items-center";

/**
 * 운영 관리 화면의 본문 칸. 업무 목록(AdminSidebar)은 AppShell 의 panel 로 넘겨 왼쪽 메뉴에 둔다.
 * 제목 아래 한 줄(description)에는 화면 설명이 아니라 데이터에서 뽑은 사실을 적는다.
 */
export function AdminWorkspace({ eyebrow, title, description, actions, tabs, children }: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** 제목 아래 밑줄 탭. 같은 화면의 다른 보기다. */
  tabs?: ReactNode;
  children: ReactNode;
}) {
  return <main className="min-h-[calc(100vh-4.5rem)]">
    <div className="min-w-0 px-5 pb-24 pt-6 sm:px-8 lg:px-10 lg:pb-12 lg:pt-8 xl:px-12 2xl:px-14">
      <header className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          {eyebrow ? <p className="mb-1 text-[0.8125rem] text-[var(--muted)]"><UiText>{eyebrow}</UiText></p> : null}
          <h1 className="text-2xl font-bold leading-[1.875rem] text-[var(--ink)]"><UiText>{title}</UiText></h1>
          {description ? <p className="mt-1.5 text-sm text-[var(--ink)]"><UiText>{description}</UiText></p> : null}
        </div>
        {actions ? <div className="flex w-full flex-wrap gap-2 sm:w-auto">{actions}</div> : null}
      </header>
      {tabs}
      <div className="mt-4 grid gap-3.5"><UiText>{children}</UiText></div>
    </div>
  </main>;
}

/** 제목 아래 밑줄 탭. 바탕을 칠하지 않고 글자색과 2px 선으로만 고른다. */
export function AdminTabs({ label, items }: { label: string; items: Array<{ href: string; label: string; count?: ReactNode; current: boolean }> }) {
  return (
    <UiNav aria-label={label} className="mt-4 flex gap-5 overflow-x-auto border-b border-[var(--line)]">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.current ? "page" : undefined}
          className={`-mb-px whitespace-nowrap border-b-2 py-2.5 text-sm font-medium transition-colors ${item.current ? "border-[var(--primary)] text-[var(--ink)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}
        >
          <UiText>{item.label}</UiText>
          {item.count !== undefined ? <span className="ml-1 font-normal tabular-nums text-[var(--muted)]">{item.count}</span> : null}
        </Link>
      ))}
    </UiNav>
  );
}

/** 목록 아래 쪽 넘김. 지금 보고 있는 범위와 전체 수를 함께 적는다. */
export function AdminPager({ label, page, totalPages, pageSize, total, href }: {
  label: string;
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  href: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  return (
    <UiNav aria-label={label} className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-2.5">
      <span className="text-[0.8125rem] tabular-nums text-[var(--muted)]">{first.toLocaleString("ko-KR")}-{last.toLocaleString("ko-KR")} / {total.toLocaleString("ko-KR")}</span>
      <div className="flex gap-2">
        {page > 1 ? <PaginationDirectionLink direction="previous" href={href(page - 1)} /> : null}
        {page < totalPages ? <PaginationDirectionLink direction="next" href={href(page + 1)} /> : null}
      </div>
    </UiNav>
  );
}
