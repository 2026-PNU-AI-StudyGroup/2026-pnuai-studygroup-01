"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import styles from "@/app/_components/landing-notices.module.css";

// 지난 소식을 계속 띄우지 않게 각자 끝나는 시각을 들고 있는다. 지우는 것을 잊어도 저절로 빠진다.
const DOWNTIME_ENDS_AT = new Date("2026-08-26T10:00:00+09:00");
const EVENT_ENDS_AT = new Date("2026-08-28T18:00:00+09:00");

// 화면이 자리를 잡은 뒤에 올라오게 조금 기다린다. 들어오자마자 튀어나오면 놀란다.
const OPEN_DELAY_MS = 900;

const DOWNTIME_KEY = "aipms:notice:downtime-260825";
const EVENT_KEY = "aipms:notice:hackathon-7th";

function dismissedToday(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === new Date().toDateString();
  } catch {
    // 사생활 보호 모드처럼 저장소를 막아 둔 브라우저에서는 그냥 보여 준다.
    return false;
  }
}

function rememberDismissal(key: string) {
  try {
    window.localStorage.setItem(key, new Date().toDateString());
  } catch {
    // 저장을 막아 둔 브라우저에서는 이번만 닫힌다.
  }
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={styles.close}>
      <span className="sr-only"><UiText>{"닫기"}</UiText></span>
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function NoticeActions({ onDismissToday, onClose }: { onDismissToday: () => void; onClose: () => void }) {
  return (
    <div className={styles.actions}>
      <button type="button" onClick={onDismissToday} className={styles.textButton}>
        <UiText>{"오늘 하루 보지 않기"}</UiText>
      </button>
      <button type="button" onClick={onClose} className={styles.textButton}>
        <UiText>{"닫기"}</UiText>
      </button>
    </div>
  );
}

function DowntimeNotice({ onClose, onDismissToday }: { onClose: () => void; onDismissToday: () => void }) {
  return (
    <section aria-labelledby="downtime-notice-title" className={styles.window}>
      <div className={`${styles.head} ${styles.downtimeHead}`}>
        <CloseButton onClick={onClose} />
        <p className={styles.downtimeBadge}><UiText>{"중요"}</UiText></p>
        <h2 id="downtime-notice-title" className={styles.downtimeTitle}>
          <UiText>{"서비스 일시 중단 안내"}</UiText>
        </h2>
      </div>

      <div className={styles.body}>
        <p className={styles.lead}>
          <UiText>{"건물 내 전기 공사에 따른 정전으로 아래 시간 동안 서비스 접속이 중단됩니다."}</UiText>
        </p>
        <dl className={styles.rows}>
          <div className={styles.row}>
            <dt className={styles.rowLabel}><UiText>{"중단 일시"}</UiText></dt>
            <dd className={styles.rowValue}><UiText>{"2026년 8월 25일 17:00 ~ 8월 26일 10:00"}</UiText></dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.rowLabel}><UiText>{"중단 사유"}</UiText></dt>
            <dd className={styles.rowValue}><UiText>{"일시 정전"}</UiText></dd>
          </div>
        </dl>
        <p className={styles.apology}>
          <UiText>{"이용에 불편을 드려 죄송하며, 양해 부탁드립니다."}</UiText>
        </p>
      </div>

      <NoticeActions onDismissToday={onDismissToday} onClose={onClose} />
    </section>
  );
}

function HackathonNotice({ onClose, onDismissToday }: { onClose: () => void; onDismissToday: () => void }) {
  return (
    <section aria-labelledby="hackathon-notice-title" className={styles.window}>
      <div className={styles.eventStage}>
        <CloseButton onClick={onClose} />
        {/* 창이 열리자마자 보이는 그림이라 지연 로딩을 쓰지 않는다. */}
        <Image src="/hackathon/ai-figure.png" alt="" width={256} height={256} className={styles.figure} priority unoptimized />
        <p className={styles.host}>AI CONVERGENCE EDUCATION INSTITUTE</p>
        <h2 id="hackathon-notice-title" className={styles.eventTitle}>
          <UiText>{"제7회 PNU 창의융합AI해커톤"}</UiText>
        </h2>
        <p className={styles.eventSubtitle}><UiText>{"최종발표회"}</UiText></p>
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

        <a href="#sign-in" onClick={onClose} className={styles.cta}>
          <UiText>{"로그인하고 결과물 보기"}</UiText>
        </a>
      </div>

      <NoticeActions onDismissToday={onDismissToday} onClose={onClose} />
    </section>
  );
}

/**
 * 로그인 첫 화면 안내 창 묶음.
 *
 * 화면을 막는 대화상자가 아니다. 오른쪽 아래에 쌓여 뜨고 뒤 화면은 그대로 쓸 수 있다.
 * 그래서 뒤를 덮는 막도, 스크롤 잠금도, aria-modal 도 두지 않는다.
 */
export function LandingNotices() {
  const [mounted, setMounted] = useState(false);
  const [openDowntime, setOpenDowntime] = useState(false);
  const [openEvent, setOpenEvent] = useState(false);
  const openerRef = useRef<Element | null>(null);

  // 서버와 클라이언트의 시각이 달라 화면이 어긋나지 않게 판단을 브라우저에서만 한다.
  // requestAnimationFrame 을 쓰면 배경 탭에서는 프레임이 돌지 않아 창이 뜨지 않는다.
  // 타이머는 배경 탭에서도 실행되므로 탭을 열어 두고 나중에 봐도 안내가 떠 있다.
  useEffect(() => {
    const now = Date.now();
    const showDowntime = now < DOWNTIME_ENDS_AT.getTime() && !dismissedToday(DOWNTIME_KEY);
    const showEvent = now < EVENT_ENDS_AT.getTime() && !dismissedToday(EVENT_KEY);
    if (!showDowntime && !showEvent) return;
    const timer = setTimeout(() => {
      openerRef.current = document.activeElement;
      setMounted(true);
      setOpenDowntime(showDowntime);
      setOpenEvent(showEvent);
    }, OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const anyOpen = openDowntime || openEvent;

  useEffect(() => {
    if (!anyOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenDowntime(false);
      setOpenEvent(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [anyOpen]);

  if (!mounted || !anyOpen) return null;

  function restoreFocus() {
    (openerRef.current as HTMLElement | null)?.focus?.();
  }

  // 랜딩 안에 그대로 두면 position: fixed 가 뷰포트가 아니라 변형이 걸린 조상 기준으로
  // 잡혀 화면 밖으로 밀려난다. body 로 빼내야 항상 화면 오른쪽 아래에 붙는다.
  return createPortal(
    <div className={styles.stack}>
      {openDowntime ? (
        <DowntimeNotice
          onClose={() => { setOpenDowntime(false); restoreFocus(); }}
          onDismissToday={() => { rememberDismissal(DOWNTIME_KEY); setOpenDowntime(false); restoreFocus(); }}
        />
      ) : null}
      {openEvent ? (
        <HackathonNotice
          onClose={() => { setOpenEvent(false); restoreFocus(); }}
          onDismissToday={() => { rememberDismissal(EVENT_KEY); setOpenEvent(false); restoreFocus(); }}
        />
      ) : null}
    </div>,
    document.body,
  );
}
