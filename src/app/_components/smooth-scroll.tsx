"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect } from "react";

type Item = { el: HTMLElement; kind: "reveal" | "speed" | "drift" | "rise"; order: number; top: number; height: number };

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * 공개 화면에만 붙이는 관성 스크롤과 스크롤 위치에 묶인 움직임. 이 컴포넌트가 마운트된 화면에서만
 * 동작하고 벗어나면 원래 스크롤로 돌아간다.
 *
 * 움직임은 시간이 아니라 스크롤 위치로 계산한다. 위로 올리면 그대로 거꾸로 돌아간다.
 * - data-reveal="순서": 옅게(0.2) 내려앉아 있다가 화면에 들어오며 올라온다. 순서마다 조금씩 늦다.
 * - data-speed="배율": 시차. 한 화면 거리까지만 밀려서 멀리 있어도 끝없이 밀리지 않는다.
 * - data-drift: 틀(부모) 안에서 그림이 흐른다. 그림은 틀보다 위아래로 길게 둔다.
 * - data-rise: 부모 아래에서 솟아오른다.
 * - data-blocks 의 칸: 차례로 올라온다.
 *
 * 움직임을 줄이도록 설정한 사람에게는 아무것도 붙이지 않는다. 관성 스크롤은 어지러움을 부를 수 있다.
 * 스크립트가 없으면 모두 제자리에 그대로 보인다.
 */
export function SmoothScroll() {
  useEffect(() => {
    // jsdom 처럼 matchMedia 가 없는 환경도 있다. 없으면 붙이지 않는다. program-sidebar 도 이 가드를 쓴다.
    if (typeof window.matchMedia !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      autoRaf: true,
      duration: 1.05,
      // 상단 바가 붙어 다니지 않아 보정값은 0이다. 앵커 이동도 Lenis 가 처리한다.
      anchors: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });

    const items: Item[] = [];
    const add = (selector: string, kind: Item["kind"]) => document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      items.push({ el, kind, order: kind === "reveal" ? Number(el.dataset.reveal) || 0 : 0, top: 0, height: 0 });
    });
    add("[data-reveal]", "reveal");
    add("[data-speed]", "speed");
    add("[data-drift]", "drift");
    add("[data-rise]", "rise");
    const mark = document.querySelector<HTMLElement>("[data-blocks]");
    const blocks = mark ? [...mark.children] as HTMLElement[] : [];
    let markTop = 0;

    // 자리는 변형을 걷어낸 상태로 잰다. 변형이 붙은 채 재면 계산이 서로 물린다.
    const measure = () => {
      for (const item of items) item.el.style.transform = "";
      for (const item of items) {
        const target = item.kind === "drift" || item.kind === "rise" ? item.el.parentElement ?? item.el : item.el;
        const box = target.getBoundingClientRect();
        item.top = box.top + window.scrollY;
        item.height = box.height;
      }
      if (mark) markTop = mark.getBoundingClientRect().top + window.scrollY;
    };

    const update = () => {
      // Lenis 가 매 프레임 창 스크롤을 옮기므로 실제 위치는 scrollY 다.
      const y = window.scrollY;
      const vh = window.innerHeight;
      for (const { el, kind, order, top, height } of items) {
        if (kind === "reveal") {
          const p = ease(clamp((y + vh - top - order * 40) / (vh * 0.32)));
          // 화면 밖에서도 완전히 사라지지 않고 옅게 남는다.
          el.style.opacity = String(0.2 + p * 0.8);
          el.style.transform = `translateY(${(1 - p) * 56}px)`;
        } else if (kind === "speed") {
          const offset = Math.max(-vh, Math.min(vh, y + vh / 2 - (top + height / 2)));
          el.style.transform = `translateY(${-offset * Number(el.dataset.speed)}px)`;
        } else if (kind === "drift") {
          const t = Math.max(-1, Math.min(1, (y + vh / 2 - (top + height / 2)) / vh));
          el.style.transform = `translateY(${-t * height * 0.08}px)`;
        } else {
          const p = ease(clamp((y + vh - top) / (height * 0.9)));
          el.style.transform = `translateY(${(1 - p) * 70}%)`;
        }
      }
      if (mark) {
        const p = clamp((y + vh - markTop) / (vh * 0.45));
        blocks.forEach((block, index) => {
          block.style.transform = `translateY(${(1 - ease(clamp(p * 1.4 - index * 0.08))) * 30}%)`;
        });
      }
    };

    const refresh = () => {
      measure();
      update();
    };
    refresh();
    // 그림이 늦게 들어오거나 탭을 바꿔 높이가 달라지면 자리를 다시 잰다.
    const resize = new ResizeObserver(refresh);
    resize.observe(document.body);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("load", refresh);

    return () => {
      resize.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("load", refresh);
      for (const { el } of items) {
        el.style.transform = "";
        el.style.opacity = "";
      }
      for (const block of blocks) block.style.transform = "";
      lenis.destroy();
    };
  }, []);

  return null;
}
