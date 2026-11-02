"use client";

import { useEffect, useRef } from "react";

const BASE_MS = 1300;
const PER_DIGIT_MS = 180;

/**
 * 화면에 들어오면 슬롯처럼 굴러서 멈추는 숫자. 오른쪽 자리일수록 더 많이 돌고 늦게 멈춘다.
 *
 * 숫자 글자는 React 가 그린 그대로 두고, 굴리는 띠는 React 가 손대지 않는 빈 칸에만 만든다.
 * 굴리는 동안 숫자는 화면에서만 숨겨 읽기 프로그램은 계속 읽는다. 다 돌면 띠를 지워 복사와 검색이 원래대로 된다.
 * 움직임 줄이기 설정이거나 스크립트가 없으면 처음부터 숫자만 보인다.
 */
export function Odometer({ value }: { value: number }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const reelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const text = textRef.current;
    const reel = reelRef.current;
    if (!text || !reel) return;
    if (typeof window.matchMedia !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    let timer: number | undefined;
    let cancelled = false;
    const finish = () => {
      reel.replaceChildren();
      text.style.cssText = "";
    };
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      timer = roll(text, reel, finish);
    }, { threshold: 0.6 });
    // 글꼴이 다 들어온 뒤에 잰다. 먼저 재면 칸 높이를 대체 글꼴로 잡는다.
    void (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (!cancelled) observer.observe(text);
    });
    return () => {
      cancelled = true;
      observer.disconnect();
      window.clearTimeout(timer);
      finish();
    };
  }, [value]);

  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      <span ref={textRef}>{value}</span>
      <span ref={reelRef} aria-hidden="true" />
    </span>
  );
}

function roll(text: HTMLElement, reel: HTMLElement, finish: () => void): number {
  const final = text.textContent ?? "";
  const style = getComputedStyle(text);
  // 줄 간격이 글자보다 좁으면(큰 숫자) 칸을 글자 크기로 키우고 음수 여백으로 줄 높이는 그대로 둔다.
  const size = parseFloat(style.fontSize);
  const line = parseFloat(style.lineHeight) || size * 1.2;
  const cell = Math.max(line, size * 1.05);
  const shift = (line - cell) / 2;

  let digit = 0;
  let longest = 0;
  for (const char of final) {
    const box = document.createElement("span");
    if (!/\d/.test(char)) {
      box.textContent = char;
      reel.append(box);
      continue;
    }
    const spins = 1 + digit;
    const target = Number(char);
    const strip = document.createElement("span");
    strip.textContent = Array.from({ length: spins * 10 + target + 1 }, (_, n) => n % 10).join("\n");
    Object.assign(box.style, { display: "inline-block", height: `${cell}px`, margin: `${shift}px 0`, overflow: "hidden", verticalAlign: "top" });
    Object.assign(strip.style, { display: "block", whiteSpace: "pre", lineHeight: `${cell}px`, textAlign: "center" });
    box.append(strip);
    reel.append(box);
    const duration = BASE_MS + digit * PER_DIGIT_MS;
    longest = Math.max(longest, duration);
    strip.animate(
      [{ transform: "translateY(0)" }, { transform: `translateY(${-(spins * 10 + target) * cell}px)` }],
      { duration, easing: "cubic-bezier(.12, .8, .2, 1)", fill: "forwards" },
    );
    digit += 1;
  }
  // 굴리는 동안 숫자는 자리를 비우되 읽기 프로그램에는 남긴다.
  Object.assign(text.style, { position: "absolute", width: "1px", height: "1px", overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap" });
  return window.setTimeout(finish, longest + 60);
}
