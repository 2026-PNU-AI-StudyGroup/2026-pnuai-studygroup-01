import type { ReactNode } from "react";

/**
 * 작업 화면의 제목 줄. 24px 이름, 그 밑에 회색 한 줄(대상, 기간 같은 정보)과 데이터에서 뽑은 한 줄,
 * 오른쪽에 그 화면의 할 일 버튼. 카드로 감싸지 않고 바탕 위에 둔다.
 * 공지, 알림, 계정, 처음 안내, 피드백, 처리방침 화면이 같이 쓴다.
 */
export function ScreenTitle({ id, title, aside, meta, finding, actions }: {
  id: string;
  title: ReactNode;
  aside?: ReactNode;
  meta?: ReactNode;
  finding?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          <h1 id={id} className="min-w-0 text-2xl font-bold leading-[1.875rem] text-[var(--ink)] [overflow-wrap:anywhere]">{title}</h1>
          {aside}
        </div>
        {meta ? <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">{meta}</p> : null}
        {finding ? <p className="mt-1.5 text-sm text-[var(--ink)]">{finding}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
