/**
 * 왼쪽 메뉴의 한 줄.
 *
 * 주요 메뉴와 화면별 목록(운영 관리, 팀 메뉴 등)이 한 칸에 이어 붙는다. 줄 높이와
 * 선택 표시가 서로 다르면 한 메뉴로 읽히지 않아 모양을 여기 하나로 둔다.
 * 아이콘 색은 줄이 정한다. 선택된 줄만 아이콘이 진한 파랑이 된다.
 */
export function sidebarRowClass(active: boolean): string {
  return `snap-color flex min-h-9 items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 text-sm font-medium ${
    active
      ? "bg-[var(--accent-subtle)] text-[var(--accent-ink)] [&_svg]:text-[var(--accent)]"
      : "text-[var(--ink)] hover:bg-[var(--surface-active)] [&_svg]:text-[var(--muted)]"
  }`;
}

/** 메뉴 안 묶음 이름. 대문자 자간 꼬리표 대신 옅은 작은 글씨 한 줄. */
export const sidebarGroupLabelClass = "px-2.5 pb-1.5 text-xs font-medium text-[var(--muted)]";
