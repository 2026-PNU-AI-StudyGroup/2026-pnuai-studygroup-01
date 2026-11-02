import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { ReactNode } from "react";

/** 줄 안의 버튼. 칸만큼 늘리지 않고 내용 크기의 낮은(32px) 테두리 버튼으로 둔다. */
export const rowActionClass = "button-secondary button-compact min-h-8 px-3 font-medium";

/** 찾은 사실 문장에 쓰는 서울 기준 "8월 18일". */
export const monthDay = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" });

/**
 * 입력 화면의 한 묶음. 왼쪽 칸에 이름과 설명, 오른쪽 흰 판에 입력 칸과 그 묶음의 저장 버튼.
 * 감싸는 쪽에 @container 가 있어야 두 칸으로 갈라진다. 좁으면 설명이 판 위로 올라간다.
 */
export function FormSection({ id, title, description, aside, bodyClassName = "px-5 py-4", children }: {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="grid gap-x-8 gap-y-3 @min-[48rem]:grid-cols-[15rem_minmax(0,1fr)]">
      <div className="min-w-0 @min-[48rem]:pt-3">
        <h2 id={id} className="text-base font-semibold leading-[1.375rem] text-[var(--ink)]">{title}</h2>
        {description ? <p className="mt-1 text-[0.8125rem] leading-5 text-[var(--muted)]">{description}</p> : null}
        {aside ? <div className="mt-2.5">{aside}</div> : null}
      </div>
      <div className={`min-w-0 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] ${bodyClassName}`}>{children}</div>
    </section>
  );
}

/**
 * 프로젝트 안쪽 화면의 제목 줄. 내 프로젝트 화면과 같은 24px 제목, 그 아래 데이터에서 뽑은 한 줄,
 * 오른쪽에 이 화면에서 가장 자주 하는 일 하나를 채운 버튼으로 둔다.
 */
export function WorkspacePageHeader({ title, titleId, meta, finding, actions }: {
  title: string;
  titleId?: string;
  /** 제목 위 회색 한 줄(사업 이름 등). */
  meta?: ReactNode;
  finding?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end gap-x-4 gap-y-3">
      {/* 제목 칸이 24rem 아래로 줄어들 자리면 버튼이 다음 줄로 내려간다. 휴대폰에서 문장이 짓눌리지 않게. */}
      <div className="min-w-0 flex-[1_1_24rem]">
        {meta ? <p className="mb-1 truncate text-[0.8125rem] text-[var(--muted)]">{meta}</p> : null}
        <h1 id={titleId} className="text-2xl font-bold leading-[1.875rem] text-[var(--ink)]"><UiText>{title}</UiText></h1>
        {finding ? <div className="mt-1.5 text-sm leading-[1.375rem] text-[var(--ink)]">{finding}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
