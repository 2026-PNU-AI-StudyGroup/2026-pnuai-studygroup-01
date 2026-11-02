import { League_Spartan } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiNav } from "@/shared/i18n/localized-elements";

import styles from "./landing-chrome.module.css";

// 로고와 숫자에만 쓰는 글꼴. 공개 화면에서만 내려받는다.
const displayFont = League_Spartan({ subsets: ["latin"], weight: "700", variable: "--font-landing-display", display: "swap" });

export const MANUAL_URL = "https://aipms.notion.site/";

/** 공개 화면 맨 바깥에 붙인다. 색 토큰과 글꼴이 이 안에서만 산다. */
export const landingPageClass = `${styles.page} ${displayFont.variable}`;

export { styles as chrome };

const FAMILY_SITES = [
  { name: "AI융합교육원", host: "swedu.pusan.ac.kr", href: "https://swedu.pusan.ac.kr/swedu/index.do" },
  { name: "PLATO", host: "plato.pusan.ac.kr", href: "https://plato.pusan.ac.kr" },
  { name: "코드플레이스", host: "code.pusan.ac.kr", href: "https://code.pusan.ac.kr" },
  { name: "피클", host: "pickle.pusan.ac.kr", href: "https://pickle.pusan.ac.kr" },
  { name: "AI역량지원시스템", host: "swcss.pusan.ac.kr", href: "https://swcss.pusan.ac.kr" },
  { name: "공식 유튜브", host: "youtube.com/@pnuswedu", href: "https://www.youtube.com/@pnuswedu" },
  { name: "인프런", host: "inflearn.com/@pnuswedu", href: "https://www.inflearn.com/users/1370319/@pnuswedu" },
];

export type ShowcaseTile = { src: string; name: string; award?: string; event: string; r: number };

/*
  팀이 AIPMS 에 올린 표지. 상과 사업은 공개 아카이브와 맞춰 두었다(2026-11-02 확인).
  r 은 한 줄 안에서 차지하는 폭의 비율이다. 16번(Project S)은 표지에 학번이 보여 뺐다.
*/
export const SHOWCASE: ShowcaseTile[] = [
  { src: "/landing/showcase/10.webp", name: "Moti", award: "대상", event: "해커톤", r: 1.9 },
  { src: "/landing/showcase/07.webp", name: "온기", award: "최우수상", event: "해커톤", r: 1.3 },
  { src: "/landing/showcase/13.webp", name: "ExitMate", award: "최우수상", event: "해커톤", r: 1.6 },
  { src: "/landing/showcase/11.webp", name: "Spotple", award: "우수상", event: "해커톤", r: 1.5 },
  { src: "/landing/showcase/06.webp", name: "Some's Up", award: "우수상", event: "해커톤", r: 1.6 },
  { src: "/landing/showcase/05.webp", name: "SimLog", award: "장려상", event: "해커톤", r: 1.2 },
  { src: "/landing/showcase/02.webp", name: "ForinK", award: "장려상", event: "해커톤", r: 1.7 },
  { src: "/landing/showcase/08.webp", name: "JobMate", award: "장려상", event: "해커톤", r: 1.4 },
  { src: "/landing/showcase/14.webp", name: "Detox Agent", event: "AI 부스터", r: 2 },
  { src: "/landing/showcase/01.webp", name: "ResQ", event: "해커톤", r: 1.3 },
  { src: "/landing/showcase/03.webp", name: "Tudy", event: "해커톤", r: 1.5 },
  { src: "/landing/showcase/12.webp", name: "루티", event: "해커톤", r: 1.6 },
  { src: "/landing/showcase/04.webp", name: "머니로그", event: "해커톤", r: 1.2 },
  { src: "/landing/showcase/09.webp", name: "채소채소", event: "해커톤", r: 1.5 },
  { src: "/landing/showcase/15.webp", name: "TradeMate", event: "AI 부스터", r: 1.8 },
];

/** 표지 한 장. 그림은 틀 안에서 스크롤에 따라 흐르고(data-drift), 칸은 들어올 때 차례로 올라온다. */
export function ShowcaseFigure({ tile, order, sizes }: { tile: ShowcaseTile; order: number; sizes: string }) {
  return (
    <figure className={styles.tile} style={{ "--r": tile.r } as CSSProperties} data-reveal={order}>
      <div className={styles.frame}>
        <Image data-drift="" src={tile.src} alt={`${tile.name} 표지`} width={640} height={400} sizes={sizes} />
      </div>
      <figcaption>
        <span><UiText>{tile.name}</UiText>{tile.award ? <>, <UiText>{tile.award}</UiText></> : null}</span>
        <span><UiText>{tile.event}</UiText> 2025</span>
      </figcaption>
    </figure>
  );
}

export function LandingWordmark() {
  return (
    <Link href="/" className={styles.wordmark}>
      AIPMS<span><UiText>{"부산대학교 AI융합교육원"}</UiText></span>
    </Link>
  );
}

/** 공개 화면의 끝. 로그인 자리가 첫 화면에 있어 다른 화면에서는 주소째 넘긴다. */
export function LandingFooter({ signInHref }: { signInHref: string }) {
  return (
    <footer className={`${styles.footer} ${styles.wrap}`}>
      <UiNav aria-label="바닥 메뉴" className={styles.footerNav}>
        <div>
          <h2><UiText>{"안내"}</UiText></h2>
          <ul>
            <li><Link href="/archive"><UiText>{"사업별 결과물"}</UiText></Link></li>
            <li><a href={MANUAL_URL} target="_blank" rel="noreferrer"><UiText>{"사용 매뉴얼"}</UiText></a></li>
            <li><Link href="/feedback"><UiText>{"피드백 게시판"}</UiText></Link></li>
            <li><Link href="/privacy"><UiText>{"개인정보 처리방침"}</UiText></Link></li>
          </ul>
        </div>
        <div className={styles.family}>
          <h2><UiText>{"패밀리 사이트"}</UiText></h2>
          <ul>
            {FAMILY_SITES.map((site) => (
              <li key={site.href}>
                <a href={site.href} target="_blank" rel="noreferrer">
                  <UiText>{site.name}</UiText><span>{site.host}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </UiNav>
      <div className={styles.footerLast}>
        <a className={styles.button} href={signInHref}><UiText>{"로그인"}</UiText></a>
        <span><UiText>{"부산대학교 AI융합교육원"}</UiText></span>
      </div>
      {/* 이름이 화면 바닥에서 막대처럼 솟아 페이지를 닫는다. */}
      <p className={styles.mark} role="img" aria-label="AIPMS" data-blocks="">
        {["A", "I", "P", "M", "S"].map((letter) => <span key={letter}>{letter}</span>)}
      </p>
    </footer>
  );
}
