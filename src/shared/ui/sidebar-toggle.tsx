"use client";

import { useState } from "react";

import { UiButton } from "@/shared/i18n/localized-elements";
import { SIDEBAR_COOKIE, rememberAppearance, type SidebarState } from "@/shared/ui/appearance";

/**
 * 왼쪽 영역을 여닫는 손잡이.
 *
 * 상태는 html 의 data-sidebar 에 적는다. 접히는 폭을 정하는 css 변수가 거기 걸려 있고,
 * 아이콘 레일과 목록 패널이 서로 다른 격자에 들어 있어 공통 조상이 그것뿐이다.
 * 서버를 갔다 오지 않고 그 자리에서 속성을 바꾸므로 누르는 즉시 움직인다. 쿠키는 다음에
 * 들어올 때 서버가 같은 모습으로 그리라고 남기는 메모다.
 *
 * 레일 안이 아니라 밖에 둔다. 안에 두면 접힐 때 같이 사라져 다시 펼 길이 없다.
 */
export function SidebarToggle({ initialState }: { initialState: SidebarState }) {
  const [state, setState] = useState(initialState);
  const collapsed = state === "collapsed";
  const label = collapsed ? "사이드바 펼치기" : "사이드바 접기";

  return (
    <UiButton
      type="button"
      aria-label={label}
      title={label}
      aria-expanded={!collapsed}
      onClick={() => {
        const next: SidebarState = collapsed ? "expanded" : "collapsed";
        document.documentElement.dataset.sidebar = next;
        rememberAppearance(SIDEBAR_COOKIE, next);
        setState(next);
      }}
      className="shell-sidebar-toggle hidden size-8 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--muted)] shadow-[var(--shadow-card)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)] lg:grid"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className={`size-4 fill-none stroke-current stroke-[1.9] ${collapsed ? "" : "rotate-180"}`}>
        <path d="m8 5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </UiButton>
  );
}
