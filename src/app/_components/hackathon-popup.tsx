"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

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

export function HackathonPopup() {
  const [open, setOpen] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);

  // 서버와 클라이언트의 시각이 달라 화면이 어긋나지 않게 판단을 브라우저에서만 한다.
  // 첫 페인트가 끝난 뒤에 띄운다. 이펙트 안에서 바로 상태를 바꾸면 렌더가 연쇄되고,
  // 사용자 입장에서도 배경이 먼저 그려진 뒤 안내가 얹히는 편이 덜 갑작스럽다.
  useEffect(() => {
    if (Date.now() >= EVENT_ENDS_AT.getTime() || dismissedToday()) return;
    // requestAnimationFrame 을 쓰면 배경 탭에서는 프레임이 돌지 않아 팝업이 뜨지 않는다.
    // 타이머는 배경 탭에서도 실행되므로 탭을 열어 두고 나중에 봐도 안내가 떠 있다.
    const timer = setTimeout(() => {
      openerRef.current = document.activeElement;
      setOpen(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    // 닫기 버튼에 포커스를 주면 마우스로 연 사람에게도 포커스 링이 보인다.
    // 대화상자 자체를 잡아 두면 화면 낭독기는 제목부터 읽고 Tab 은 안쪽에서 시작한다.
    posterRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
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

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      <div
        ref={posterRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hackathon-popup-title"
        tabIndex={-1}
        className={styles.poster}
      >
        <button type="button" onClick={close} className={styles.close}>
          <span className="sr-only"><UiText>{"닫기"}</UiText></span>
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          </svg>
        </button>

        <div className={styles.stage}>
          {/* 팝업은 열리자마자 보이는 그림이라 지연 로딩을 쓰지 않는다. */}
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
      </div>
    </div>
  );
}
