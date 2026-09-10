"use client";

import { type PointerEvent, type ReactNode, useCallback } from "react";

/**
 * 마우스가 얹힌 자리를 카드에 알려 주는 껍데기.
 *
 * 쉴 때는 아무것도 하지 않는다. 목록이 스물네 장 깔리는 화면이라 가만히 있을 때 요란하면
 * 무엇도 눈에 안 들어온다. 마우스가 올라간 카드에만 그 자리를 `--spot-x`, `--spot-y` 로
 * 적어 주고, 빛을 그리는 일은 CSS 가 한다.
 *
 * 좌표는 state 로 두지 않는다. state 로 두면 마우스가 움직이는 동안 카드가 계속 다시
 * 그려진다. 여기서는 DOM 에 변수만 얹으므로 React 는 한 번도 다시 그리지 않는다.
 * `setProperty` 는 레이아웃을 강제하지 않고 그림은 어차피 프레임당 한 번만 나가므로
 * 값을 미뤄 모을 이유도 없다.
 */
export function ProjectCardSpotlight({ ariaLabelledBy, className, children }: {
  ariaLabelledBy: string;
  className: string;
  children: ReactNode;
}) {
  const track = useCallback((event: PointerEvent<HTMLElement>) => {
    // 손가락으로 만지는 화면에서는 빛이 손 밑에 갇혀 보이지 않는다. 마우스만 받는다.
    if (event.pointerType !== "mouse") return;
    const card = event.currentTarget;
    const box = card.getBoundingClientRect();
    card.style.setProperty("--spot-x", `${event.clientX - box.left}px`);
    card.style.setProperty("--spot-y", `${event.clientY - box.top}px`);
  }, []);

  const clear = useCallback((event: PointerEvent<HTMLElement>) => {
    // 다음에 얹힐 때 지난 자리에서 시작하지 않게 지운다.
    event.currentTarget.style.removeProperty("--spot-x");
    event.currentTarget.style.removeProperty("--spot-y");
  }, []);

  return (
    <article
      aria-labelledby={ariaLabelledBy}
      className={className}
      onPointerMove={track}
      onPointerLeave={clear}
    >
      {children}
    </article>
  );
}
