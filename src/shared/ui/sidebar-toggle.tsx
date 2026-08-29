"use client";

import { useEffect, useState } from "react";

import { UiButton } from "@/shared/i18n/localized-elements";
import { SIDEBAR_COOKIE, rememberAppearance, type SidebarState } from "@/shared/ui/appearance";

/** 화면 맨 왼쪽 이 폭 안에 닿아야 꺼내 본다. 손잡이는 이 띠 바깥에 있어 눌러도 안 열린다. */
const PEEK_EDGE_PX = 12;

/**
 * 왼쪽 영역을 여닫는 손잡이. 접힌 동안 살짝 꺼내 보는 일도 여기서 맡는다.
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

  /*
    꺼내 보기를 css :hover 로 판단하면 되먹임 고리에 걸린다. 판이 나오면 마우스 밑에
    판이 들어오고, 그것이 다시 판을 나오게 하고, 손잡이가 비켜서면 다시 들어간다.
    접기를 누른 자리에 마우스를 두면 이 고리가 끝없이 돈다.

    그래서 요소가 아니라 좌표로 본다. 여는 조건은 화면 맨 왼쪽 띠 하나뿐이고, 판 위에
    있는 것은 이미 열린 것을 유지할 때만 센다. 판이 나왔다는 사실이 여는 이유가 되지
    않으므로 고리가 생기지 않는다.
  */
  useEffect(() => {
    const root = document.documentElement;
    const clearPeek = () => { delete root.dataset.sidebarPeek; };
    if (!collapsed) {
      clearPeek();
      return;
    }

    const desktop = window.matchMedia("(min-width: 1024px)");
    let peeking = false;
    // 꺼낸 판의 오른쪽 끝. 열 때 한 번만 잰다. 움직일 때마다 재면 매 프레임 배치를 다시 잡는다.
    let flyoutRight = 0;

    const apply = (next: boolean) => {
      if (next === peeking) return;
      peeking = next;
      if (!next) {
        clearPeek();
        return;
      }
      const rail = document.querySelector(".shell-rail");
      const panel = document.querySelector(".shell-panel");
      flyoutRight = (rail?.getBoundingClientRect().width ?? 0) + (panel?.getBoundingClientRect().width ?? 0);
      root.dataset.sidebarPeek = "true";
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!desktop.matches) return;
      if (event.clientX <= PEEK_EDGE_PX) apply(true);
      else apply(peeking && event.clientX < flyoutRight);
    };
    const onPointerLeave = () => apply(false);
    // 키보드로 레일 안까지 넘어오면 보이지 않는 것을 짚고 있게 된다. 그때도 꺼내 준다.
    const onFocusIn = (event: FocusEvent) => {
      if (!desktop.matches) return;
      const target = event.target as Element | null;
      if (target?.closest?.(".shell-rail, .shell-panel")) apply(true);
      else if (!target?.closest?.(".shell-sidebar-toggle")) apply(false);
    };
    const onResize = () => apply(false);

    document.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("focusin", onFocusIn);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("resize", onResize);
      clearPeek();
    };
  }, [collapsed]);

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
      className="shell-sidebar-toggle hidden size-7 place-items-center rounded-md border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] shadow-[var(--shadow-card)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)] lg:grid"
    >
      {/*
        노션·클로드가 쓰는 판 모양. 네모 왼쪽을 세로선으로 갈라 사이드바 자리를 나타낸다.
        화살표와 달리 어느 쪽으로 움직이는지가 아니라 무엇을 여닫는지를 보여 준다.
      */}
      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-[1.5]">
        <rect x="2.75" y="3.75" width="14.5" height="12.5" rx="2.25" />
        <path d="M7.75 3.75v12.5" />
      </svg>
    </UiButton>
  );
}
