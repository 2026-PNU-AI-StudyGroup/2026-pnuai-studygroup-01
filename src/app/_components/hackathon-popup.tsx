"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import styles from "@/app/_components/hackathon-popup.module.css";

// 행사가 끝나면 저절로 사라진다. 지우는 것을 잊어도 지난 행사를 계속 띄우지 않는다.
const EVENT_ENDS_AT = new Date("2026-08-28T18:00:00+09:00");
const DISMISS_KEY = "aipms:hackathon-popup:7th";

function dismissedToday(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === new Date().toDateString();
  } catch {
    // 사생활 보호 모드처럼 저장소를 막아 둔 브라우저에서는 그냥 보여 준다.
    return false;
  }
}

/**
 * 해커톤 최종발표회 안내 창.
 *
 * 화면을 막는 대화상자가 아니다. 오른쪽 아래에 떠 있고 뒤 화면은 그대로 쓸 수 있다.
 * 그래서 뒤를 덮는 막도, 스크롤 잠금도, aria-modal 도 두지 않는다. 읽고 닫으면 그만인
 * 안내라 사용자를 가둘 이유가 없다.
 */
export function HackathonPopup() {
  const [open, setOpen] = useState(false);
  const openerRef = useRef<Element | null>(null);

  // 서버와 클라이언트의 시각이 달라 화면이 어긋나지 않게 판단을 브라우저에서만 한다.
  // requestAnimationFrame 을 쓰면 배경 탭에서는 프레임이 돌지 않아 창이 뜨지 않는다.
  // 타이머는 배경 탭에서도 실행되므로 탭을 열어 두고 나중에 봐도 안내가 떠 있다.
  useEffect(() => {
    if (Date.now() >= EVENT_ENDS_AT.getTime() || dismissedToday()) return;
    const timer = setTimeout(() => {
      openerRef.current = document.activeElement;
      setOpen(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  function close() {
    setOpen(false);
    (openerRef.current as HTMLElement | null)?.focus?.();
  }

  function dismissForToday() {
    try {
      window.localStorage.setItem(DISMISS_KEY, new Date().toDateString());
    } catch {
      // 저장을 막아 둔 브라우저에서는 이번만 닫힌다.
    }
    close();
  }

  // 랜딩 안에 그대로 두면 position: fixed 가 뷰포트가 아니라 변형이 걸린 조상 기준으로
  // 잡혀 화면 밖으로 밀려난다. body 로 빼내야 항상 화면 오른쪽 아래에 붙는다.
  return createPortal(
    <div role="dialog" aria-labelledby="hackathon-popup-title" className={styles.frame}>
      <div className={styles.stage}>
        <button type="button" onClick={close} className={styles.close}>
          <span className="sr-only"><UiText>{"닫기"}</UiText></span>
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          </svg>
        </button>

        {/* 창이 열리자마자 보이는 그림이라 지연 로딩을 쓰지 않는다. */}
        <Image src="/hackathon/ai-figure.png" alt="" width={256} height={256} className={styles.figure} priority unoptimized />
        <p className={styles.host}>AI CONVERGENCE EDUCATION INSTITUTE</p>
        <h2 id="hackathon-popup-title" className={styles.title}>
          <UiText>{"제7회 PNU 창의융합AI해커톤"}</UiText>
        </h2>
        <p className={styles.subtitle}><UiText>{"최종발표회"}</UiText></p>
      </div>

      <div className={styles.body}>
        <dl className={styles.rows}>
          <div className={styles.row}>
            <dt className={styles.rowLabel}><UiText>{"일시"}</UiText></dt>
            <dd className={styles.rowValue}><UiText>{"2026. 8. 28.(금) 09:00 ~ 18:00"}</UiText></dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.rowLabel}><UiText>{"장소"}</UiText></dt>
            <dd className={styles.rowValue}><UiText>{"농심호텔 1층 다이아몬드 B홀"}</UiText></dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.rowLabel}><UiText>{"주제"}</UiText></dt>
            <dd className={styles.rowValue}><UiText>{"지정 주제 또는 자유 주제, 웹 또는 모바일 앱"}</UiText></dd>
          </div>
        </dl>

        <div className={styles.vote}>
          <p className={styles.voteLabel}><UiText>{"온라인 투표"}</UiText></p>
          <p className={styles.voteValue}><UiText>{"8. 27.(목) 13:00 ~ 8. 28.(금) 16:00"}</UiText></p>
        </div>

        <a href="#sign-in" onClick={close} className={styles.cta}>
          <UiText>{"로그인하고 결과물 보기"}</UiText>
        </a>
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={dismissForToday} className={styles.textButton}>
          <UiText>{"오늘 하루 보지 않기"}</UiText>
        </button>
        <button type="button" onClick={close} className={styles.textButton}>
          <UiText>{"닫기"}</UiText>
        </button>
      </div>
    </div>,
    document.body,
  );
}
