"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect } from "react";

/**
 * 랜딩에만 붙이는 관성 스크롤. 이 컴포넌트가 마운트된 화면에서만 동작하고
 * 벗어나면 원래 스크롤로 돌아간다.
 *
 * 움직임을 줄이도록 설정한 사람에게는 아예 붙이지 않는다. 관성 스크롤은
 * 어지러움을 유발할 수 있어 그 설정을 무시하면 안 된다.
 */
export function SmoothScroll() {
  useEffect(() => {
    // jsdom 처럼 matchMedia 가 없는 환경도 있다. 없으면 관성 스크롤을 붙이지 않는다.
    // 같은 이유로 program-sidebar 도 이 가드를 쓴다.
    if (typeof window.matchMedia !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      autoRaf: true,
      duration: 1.05,
      // 상단 바가 없어 보정값은 0이다. 앵커 이동도 Lenis 가 처리한다.
      anchors: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });

    return () => lenis.destroy();
  }, []);

  return null;
}
