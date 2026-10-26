/**
 * 화면 겉모습 취향.
 *
 * 계정이 아니라 기기에 붙는 값이라 데이터베이스가 아니라 쿠키에 둔다. 같은 사람이라도
 * 연구실 데스크톱과 집 노트북에서 원하는 모습이 다르다. 쿠키라서 서버가 첫 화면부터
 * 맞는 값으로 그릴 수 있다.
 */

export const SIDEBAR_COOKIE = "pms-sidebar";

export type SidebarState = "expanded" | "collapsed";

export function normalizeSidebarState(value: string | undefined): SidebarState {
  return value === "collapsed" ? "collapsed" : "expanded";
}

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/**
 * 브라우저에서 바로 적는다.
 *
 * 서버 액션으로 돌리면 왕복하는 동안 화면이 멈춰 전환이 툭툭 끊긴다. 보안과 무관한
 * 표시 취향이라 httpOnly 가 필요 없고, 그래서 자바스크립트로 쓸 수 있다.
 */
export function rememberAppearance(name: string, value: string): void {
  document.cookie = `${name}=${value}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; samesite=lax`;
}
