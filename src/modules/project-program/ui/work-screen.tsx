import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { UiText } from "@/modules/translation/ui/i18n-provider";

/*
  안쪽 화면(프로젝트 현황, 프로젝트 상세, 내 프로젝트)이 같이 쓰는 조각.
  흰 카드는 1px 선 하나로만 나누고 그림자를 두지 않는다. 진한 파랑은 작은 표시와 버튼 하나에만,
  넓은 면은 옅은 단계(accent-subtle, accent-track)로 칠한다.
*/

export const cardClass = "min-w-0 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)]";

export function CardHead({ id, title, count, action }: {
  id?: string;
  title: ReactNode;
  count?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1 px-5 pb-2.5 pt-4">
      <h2 id={id} className="text-base font-semibold leading-[1.375rem] text-[var(--ink)]">{title}</h2>
      {count !== undefined ? <span className="text-[0.8125rem] tabular-nums text-[var(--muted)]">{count}</span> : null}
      {action ? <div className="ml-auto flex items-center gap-2 text-[0.8125rem]">{action}</div> : null}
    </div>
  );
}

/**
 * 화면 맨 위 대상 머리. 표지(작은 그림), 이름과 상태 알약, 회색 한 줄 정보, 데이터에서 뽑은
 * 한 줄, 오른쪽 할 일 버튼. 사업 화면과 프로젝트 화면이 같이 쓴다.
 */
export function ObjectHeader({ id, media, title, titleAside, meta, finding, actions }: {
  id: string;
  media?: ReactNode;
  title: ReactNode;
  titleAside?: ReactNode;
  meta?: ReactNode;
  finding?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={`${cardClass} flex flex-wrap items-center gap-x-4 gap-y-3 p-3.5 sm:flex-nowrap`}>
      {media}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <h1 id={id} className="min-w-0 text-lg font-semibold leading-6 text-[var(--ink)] [overflow-wrap:anywhere]">{title}</h1>
          {titleAside}
        </div>
        {meta ? <p className="mt-0.5 text-[0.8125rem] text-[var(--muted)]">{meta}</p> : null}
        {finding ? <p className="mt-1.5 text-sm text-[var(--ink)]">{finding}</p> : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-none sm:justify-end">{actions}</div> : null}
    </section>
  );
}

/** 카드 머리 오른쪽의 글자 링크. */
export function HeadLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="font-medium text-[var(--primary)] hover:underline hover:underline-offset-[3px]">{children}</Link>;
}

const pillTone = {
  strong: "bg-[var(--accent-track)] text-[var(--accent-ink)]",
  accent: "bg-[var(--accent-subtle)] text-[var(--accent-ink)]",
  plain: "bg-[var(--surface-subtle)] text-[#374151]",
  success: "bg-[var(--success-subtle)] text-[#14532d]",
  warning: "bg-[var(--warning-subtle)] text-[var(--warning-ink)]",
  danger: "bg-[var(--danger-subtle)] text-[#831c1e]",
} as const;

export type PillTone = keyof typeof pillTone;

export function Pill({ tone = "plain", children }: { tone?: PillTone; children: ReactNode }) {
  return (
    <span className={`inline-flex h-[1.375rem] flex-none items-center whitespace-nowrap rounded-full px-2 text-xs font-medium ${pillTone[tone]}`}>
      <UiText>{children}</UiText>
    </span>
  );
}

/** 팀 상태 색(StatusBadge 의 tone)을 옅은 알약 색으로 옮긴다. 진행 중은 파랑, 끝난 것은 회색. */
export function pillToneFor(tone: "neutral" | "info" | "success" | "warning" | "danger"): PillTone {
  return tone === "info" ? "accent" : tone === "neutral" || tone === "success" ? "plain" : tone;
}

/**
 * 표 칸에 값이 없을 때 쓰는 회색 줄표. 0 은 0 으로 적고, 이것은 모르는 값에만 쓴다.
 * 목록이 좁아 칸이 한 줄로 흐를 때는 줄표만 남으면 뜻 없는 기호가 되어 숨긴다.
 */
export function Missing() {
  return <span className="text-[var(--muted)] @max-[40rem]:hidden">-</span>;
}

export type Kpi = {
  label: string;
  value: number | null;
  unit?: string;
  note?: ReactNode;
  /** 나쁜 쪽으로 간 값. 숫자에만 빨강을 얹는다. */
  alert?: boolean;
  href?: string;
  current?: boolean;
};

/**
 * 숫자 몇 개를 한 판에 1px 선으로 나눠 담는다. 칸마다 카드를 따로 만들지 않는다.
 * 휴대폰에서는 두 칸씩, 홀수면 마지막 칸이 한 줄을 다 쓴다.
 */
export function KpiStrip({ items }: { items: Kpi[] }) {
  return (
    <div
      style={{ "--kpi-cols": items.length } as CSSProperties}
      className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-[repeat(var(--kpi-cols),minmax(0,1fr))] max-sm:[&>:last-child:nth-child(odd)]:col-span-2"
    >
      {items.map((item) => <KpiCell key={item.label} item={item} />)}
    </div>
  );
}

function KpiCell({ item }: { item: Kpi }) {
  const body = (
    <>
      <span className={`block text-[0.8125rem] ${item.current ? "font-medium text-[var(--accent-ink)]" : "text-[var(--muted)]"}`}><UiText>{item.label}</UiText></span>
      <span className="mt-1.5 block text-2xl font-medium leading-[1.875rem] tabular-nums">
        {item.value === null
          ? <span className="text-base text-[var(--muted)]">-</span>
          : <span className={item.alert && item.value > 0 ? "text-[var(--danger)]" : "text-[var(--ink)]"}>{item.value.toLocaleString("ko-KR")}</span>}
        {item.unit && item.value !== null ? <small className="ml-0.5 text-sm font-normal text-[var(--muted)]"><UiText>{item.unit}</UiText></small> : null}
      </span>
      {item.note ? <span className="mt-1 block truncate text-xs text-[var(--muted)]">{item.note}</span> : null}
    </>
  );
  const cellClass = `block min-w-0 px-5 py-3.5 ${item.current ? "bg-[var(--accent-subtle)] shadow-[inset_0_-2px_0_var(--primary)]" : "bg-[var(--surface)]"}`;
  if (!item.href) return <div className={cellClass}>{body}</div>;
  return (
    <Link
      href={item.href}
      aria-current={item.current ? "page" : undefined}
      aria-label={`${item.label} ${item.value ?? 0}${item.unit ?? ""}`}
      className={`${cellClass} transition-colors hover:bg-[var(--surface-subtle)] focus-visible:relative focus-visible:z-[1] ${item.current ? "hover:bg-[var(--accent-subtle)]" : ""}`}
    >
      {body}
    </Link>
  );
}

const DAY_MS = 86_400_000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1_000;

/** 서울 날짜로 센 남은 날. 오늘이 0, 어제가 -1 이다. */
export function daysUntil(date: Date, now: Date): number {
  const day = (value: Date) => Math.floor((value.getTime() + KST_OFFSET_MS) / DAY_MS);
  return day(date) - day(now);
}

export function daysLabel(days: number): string {
  return days === 0 ? "오늘" : days > 0 ? `${days}일 남음` : `${-days}일 지남`;
}

/** 목록 행의 대표 이미지 자리. 이미지가 없으면 회색 판에 프로그램 아이콘만 둔다. */
export function Thumb({ src, fallback, className = "size-10" }: { src?: string | null; fallback: ReactNode; className?: string }) {
  return src ? (
    // /api/files 는 로그인 쿠키를 요구해 이미지 최적화를 거치지 않는다.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`${className} flex-none rounded border border-[var(--line)] bg-[var(--surface-subtle)] object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${className} grid flex-none place-items-center rounded bg-[var(--surface-subtle)] text-[#9ca3af] [&>svg]:size-5`}>{fallback}</span>
  );
}
