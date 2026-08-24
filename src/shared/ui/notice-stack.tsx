"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { UiText } from "@/shared/i18n/i18n-provider";
import styles from "@/shared/ui/notice-stack.module.css";

export type NoticeTone = "default" | "warning";

export type NoticeItem = {
  id: string;
  /** "오늘 하루 보지 않기" 를 기억해 두는 자리. 공지마다 달라야 한다. */
  storageKey: string;
  /** 지나면 더 뜨지 않는다. 없으면 닫을 때까지 뜬다. */
  endsAt?: Date;
  badge?: string;
  tone?: NoticeTone;
  title: string;
  /** 본문 첫 문단. 항목표만 있는 안내면 비워 둔다. */
  lead?: string;
  /** 이름과 값이 짝지어진 항목. 일시, 장소처럼 눈으로 훑는 정보에 쓴다. */
  rows?: { label: string; value: string }[];
  /** 위 둘로 담기지 않는 본문. 공지 본문 마크다운처럼 통째로 넘긴다. */
  body?: ReactNode;
  cta?: { href: string; label: string };
};

export type NoticePlacement = "bottom-right" | "center";

// 화면이 자리를 잡은 뒤에 올라오게 조금 기다린다. 들어오자마자 튀어나오면 놀란다.
const OPEN_DELAY_MS = 900;

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

/**
 * 카드처럼 겹쳐 쌓이는 안내 창.
 *
 * 화면을 막는 대화상자가 아니다. 뒤 화면은 그대로 쓸 수 있어서 덮는 막도,
 * 스크롤 잠금도, aria-modal 도 두지 않는다. 창은 모두 같은 크기라 겹쳤을 때
 * 어긋난 모서리가 한 장씩 고르게 보인다. 앞장을 닫으면 다음 장이 드러나고,
 * 뒷장을 누르거나 탭으로 들어가면 그 장이 앞으로 온다.
 */
export function NoticeStack({
  items,
  placement,
}: {
  items: NoticeItem[];
  placement: NoticePlacement;
}) {
  const [order, setOrder] = useState<string[]>([]);
  const openerRef = useRef<Element | null>(null);

  // 서버와 클라이언트의 시각이 달라 화면이 어긋나지 않게 판단을 브라우저에서만 한다.
  // requestAnimationFrame 을 쓰면 배경 탭에서는 프레임이 돌지 않아 창이 뜨지 않는다.
  // 타이머는 배경 탭에서도 실행되므로 탭을 열어 두고 나중에 봐도 안내가 떠 있다.
  useEffect(() => {
    const now = Date.now();
    const visible = items
      .filter((item) => (item.endsAt ? now < item.endsAt.getTime() : true) && !dismissedToday(item.storageKey))
      .map((item) => item.id);
    if (visible.length === 0) return;
    const timer = setTimeout(() => {
      openerRef.current = document.activeElement;
      setOrder(visible);
    }, OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [items]);

  useEffect(() => {
    if (order.length === 0) return;
    // 여러 장이 쌓여 있으니 Esc 는 맨 앞장만 걷어낸다. 한 번에 다 닫으면 되돌릴 수 없다.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOrder((current) => current.slice(0, -1));
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [order.length]);

  if (order.length === 0) return null;

  function close(id: string) {
    setOrder((current) => {
      const next = current.filter((openId) => openId !== id);
      // 마지막 한 장까지 닫혔을 때만 원래 있던 자리로 초점을 돌려준다.
      if (next.length === 0) (openerRef.current as HTMLElement | null)?.focus?.();
      return next;
    });
  }

  function bringToFront(id: string) {
    setOrder((current) =>
      current[current.length - 1] === id ? current : [...current.filter((openId) => openId !== id), id],
    );
  }

  // 화면 안에 그대로 두면 position: fixed 가 뷰포트가 아니라 변형이 걸린 조상 기준으로
  // 잡혀 엉뚱한 자리로 밀려난다. body 로 빼내야 항상 같은 구석에 붙는다.
  return createPortal(
    <ul className={`${styles.stack} ${placement === "center" ? styles.center : styles.bottomRight}`}>
      {order.map((id, index) => {
        const item = items.find((candidate) => candidate.id === id);
        if (!item) return null;
        const depth = order.length - 1 - index;
        const titleId = `notice-title-${item.id}`;
        return (
          <li
            key={item.id}
            className={`${styles.card} ${depth === 0 ? styles.front : styles.behind}`}
            style={{ "--depth": depth, "--z": index } as CSSProperties}
            onMouseDownCapture={() => bringToFront(item.id)}
            onFocusCapture={() => bringToFront(item.id)}
          >
            <section aria-labelledby={titleId} className={styles.window}>
              <div className={`${styles.head} ${item.tone === "warning" ? styles.warning : ""}`}>
                <button type="button" onClick={() => close(item.id)} className={styles.close}>
                  <span className="sr-only"><UiText>{"닫기"}</UiText></span>
                  <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                  </svg>
                </button>
                {item.badge ? <p className={styles.badge}><UiText>{item.badge}</UiText></p> : null}
                <h2 id={titleId} className={styles.title}><UiText>{item.title}</UiText></h2>
              </div>

              <div className={styles.body}>
                {item.lead ? <p className={styles.lead}><UiText>{item.lead}</UiText></p> : null}
                {item.rows?.length ? (
                  <dl className={styles.rows}>
                    {item.rows.map((row) => (
                      <div key={row.label} className={styles.row}>
                        <dt className={styles.rowLabel}><UiText>{row.label}</UiText></dt>
                        <dd className={styles.rowValue}><UiText>{row.value}</UiText></dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {item.body}
              </div>

              <div className={styles.foot}>
                {item.cta ? (
                  <a href={item.cta.href} onClick={() => close(item.id)} className={styles.cta}>
                    <UiText>{item.cta.label}</UiText>
                  </a>
                ) : null}
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => { rememberDismissal(item.storageKey); close(item.id); }}
                  >
                    <UiText>{"오늘 하루 보지 않기"}</UiText>
                  </button>
                  <button type="button" className={styles.textButton} onClick={() => close(item.id)}>
                    <UiText>{"닫기"}</UiText>
                  </button>
                </div>
              </div>
            </section>
          </li>
        );
      })}
    </ul>,
    document.body,
  );
}
