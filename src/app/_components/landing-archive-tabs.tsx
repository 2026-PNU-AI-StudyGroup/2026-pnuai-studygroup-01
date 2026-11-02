"use client";

import { useState, type KeyboardEvent } from "react";

import type { PublicArchiveDigest } from "@/app/_components/landing-archive";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import styles from "./sign-in-landing.module.css";

/**
 * 첫 화면 파란 무대 위의 사업별 결과물 조각. 실제 공개 목록에서 사업마다 가장 최근 대회를 보여 준다.
 * 탭은 눌러서, 또는 좌우 화살표로 바꾼다. 스크립트가 없으면 첫 사업만 보인다.
 */
export function LandingArchiveTabs({ digest }: { digest: PublicArchiveDigest }) {
  const [selected, setSelected] = useState(0);
  const select = (index: number) => {
    const next = (index + digest.tabs.length) % digest.tabs.length;
    setSelected(next);
    document.getElementById(`landing-tab-${next}`)?.focus();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    select(selected + step);
  };

  return (
    <div className={styles.ui} data-ui="">
      <div className={styles.uiHead}>
        <strong id="landing-archive-title"><UiText>{"사업별 결과물"}</UiText></strong>
        <span><UiText>{`사업 ${digest.programCount}개, 프로젝트 ${digest.projectCount}건`}</UiText></span>
      </div>
      <div className={styles.uiTabs} role="tablist" aria-labelledby="landing-archive-title" onKeyDown={onKeyDown}>
        {digest.tabs.map((tab, index) => (
          <button
            key={tab.name}
            type="button"
            role="tab"
            id={`landing-tab-${index}`}
            aria-controls={`landing-panel-${index}`}
            aria-selected={index === selected}
            tabIndex={index === selected ? 0 : -1}
            className={styles.uiTab}
            onClick={() => setSelected(index)}
          >
            <UiText>{tab.name}</UiText><b>{tab.count}</b>
          </button>
        ))}
      </div>
      {digest.tabs.map((tab, index) => (
        <div
          key={tab.name}
          role="tabpanel"
          id={`landing-panel-${index}`}
          aria-labelledby={`landing-tab-${index}`}
          hidden={index !== selected}
        >
          <p className={styles.uiYear}>
            <span>{tab.year} <UiText>{tab.program}</UiText></span>
            <span><UiText>{`${tab.teams}개 팀`}</UiText></span>
          </p>
          <ul>
            {tab.rows.map((row) => (
              <li key={row.id} className={styles.uiRow}>
                <span className={styles.uiTitle}>{row.title}</span>
                {row.award ? <span className={styles.uiAward} data-top={row.award === "대상" || undefined}>{row.award}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
