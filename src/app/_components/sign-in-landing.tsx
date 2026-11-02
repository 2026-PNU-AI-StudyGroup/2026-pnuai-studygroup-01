import Image from "next/image";
import Link from "next/link";

import type { PublicArchiveDigest } from "@/app/_components/landing-archive";
import { DevelopmentRoleSignIn } from "@/modules/identity/ui/development-role-sign-in";
import { GoogleSignInButton } from "@/modules/identity/ui/google-sign-in-button";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiNav } from "@/shared/i18n/localized-elements";

import { LandingArchiveTabs } from "./landing-archive-tabs";
import { LandingFooter, LandingWordmark, MANUAL_URL, SHOWCASE, ShowcaseFigure, chrome, landingPageClass } from "./landing-chrome";
import { LandingNotices } from "./landing-notices";
import { Odometer } from "./odometer";
import { SmoothScroll } from "./smooth-scroll";

import styles from "./sign-in-landing.module.css";

const STEPS = [
  {
    title: "구글 로그인",
    body: "@pusan.ac.kr 계정으로 들어옵니다. 다른 도메인 계정은 가입되지 않습니다.",
  },
  {
    title: "동의와 온보딩",
    body: "개인정보 수집과 이용에 동의하고, 학생은 학과와 학번을 입력합니다.",
  },
  {
    title: "프로그램 참여",
    body: "공개된 주제에 지원하거나, 이미 꾸린 팀으로 주제를 제안합니다.",
  },
  {
    title: "결과물 제출",
    body: "보고서를 제출하고 승인을 받으면 결과물이 아카이브에 남습니다.",
  },
];

const SCREENS = [
  {
    src: "/landing/screens/my-projects-dashboard.webp",
    alt: "학생 내 프로젝트와 할 일 화면",
    title: "내 일정과 제출률이 카드에 있다",
    body: "지원 상태와 진행 중인 프로젝트를 구분해 보여주고, 카드에서 다가오는 할 일과 보고서 제출률을 확인한 뒤 작업 공간으로 넘어갑니다.",
    width: 1600,
    height: 533,
  },
  {
    src: "/landing/screens/program-overview.webp",
    alt: "관리자가 보는 프로그램 운영 화면",
    title: "프로그램 하나가 한 화면에 들어온다",
    body: "공지와 팀 구성, 보고서 제출 현황과 제출물을 프로그램 단위로 모아 봅니다. 투표를 켠 프로그램은 득표 현황도 같은 자리에서 확인합니다.",
    width: 1600,
    height: 1000,
  },
];

const FEATURES = [
  { name: "프로그램 운영", body: "시작일과 종료일을 정해 프로그램을 개설하고, 공개와 마감을 관리합니다." },
  { name: "주제와 지원", body: "교수가 주제와 정원을 등록하고, 학생 지원을 검토해 팀을 확정합니다." },
  { name: "팀 작업공간", body: "할 일과 담당자, 팀과 지도교수 대화, 진행 현황을 한자리에서 다룹니다." },
  { name: "보고서와 승인", body: "요구사항과 기한을 정해 버전으로 제출받고, 승인하거나 수정을 요청합니다." },
  { name: "결과물 아카이브", body: "승인된 결과물이 연도별로 남아 다음 프로젝트의 참고 자료가 됩니다." },
  { name: "투표와 채점", body: "프로그램 단위 투표와 채점표 기반 평가를 함께 운영합니다." },
];

const ROLES = [
  { name: "학생", work: "주제를 찾아 지원하고, 팀을 꾸리고, 보고서와 결과물을 제출합니다.", access: "구글 로그인" },
  { name: "교수", work: "주제를 등록하고 지원을 검토해 팀을 확정하며, 보고서를 승인합니다.", access: "구글 로그인" },
  { name: "관리자", work: "프로그램을 개설하고 운영 일정과 투표, 사용자 권한을 관리합니다.", access: "구글 로그인" },
  { name: "외부 자문위원", work: "배정된 팀의 제출물을 열람하고 채점표와 피드백을 작성합니다.", access: "초대 링크" },
];

// 결과물 벽의 줄 나눔. 한 줄에 서너 장, 줄마다 높이가 다르다.
const WALL = [SHOWCASE.slice(0, 3), SHOWCASE.slice(3, 7), SHOWCASE.slice(7, 11), SHOWCASE.slice(11)];

export function SignInLanding({
  showDevelopmentLogin,
  seedRequired,
  archive,
}: {
  showDevelopmentLogin: boolean;
  seedRequired: boolean;
  archive: PublicArchiveDigest | null;
}) {
  return (
    <div className={landingPageClass}>
      <LandingNotices />
      <SmoothScroll />

      <header className={styles.hero} id="top">
        <div className={`${chrome.bar} ${styles.heroBar}`}>
          <LandingWordmark />
          <UiNav aria-label="페이지 안내">
            <ul className={chrome.barLinks}>
              <li><a href="#work"><UiText>{"결과물"}</UiText></a></li>
              <li><a href="#steps"><UiText>{"이용 절차"}</UiText></a></li>
              <li><a href="#features"><UiText>{"주요 기능"}</UiText></a></li>
              <li><a href="#roles"><UiText>{"역할별 안내"}</UiText></a></li>
              <li><a href={MANUAL_URL} target="_blank" rel="noreferrer"><UiText>{"사용 매뉴얼"}</UiText></a></li>
            </ul>
          </UiNav>
        </div>

        <div className={`${styles.heroCopy} ${chrome.wrap} ${chrome.grid}`} data-speed="0.14">
          <h1 className={chrome.display}>
            <UiText>{"프로젝트를 열고"}</UiText><br /><UiText>{"결과를 남깁니다"}</UiText>
          </h1>
          <p className={styles.heroLede}>
            <UiText>{"AIPMS는 부산대학교 AI융합교육원의 프로젝트 관리 시스템입니다. 등록, 팀 구성, 보고서, 심사와 투표, 결과물 공개가 한 곳에서 이어집니다."}</UiText>
          </p>
          <section id="sign-in" aria-labelledby="sign-in-title" className={styles.signIn}>
            {/* 화면에는 안 보이지만 읽기 프로그램에는 들린다. 제목만 훑는 사람에게 로그인 자리를 알려 준다. */}
            <h2 id="sign-in-title" className="sr-only"><UiText>{"로그인"}</UiText></h2>
            <div className={styles.google}>
              <GoogleSignInButton disabled={showDevelopmentLogin} />
            </div>
            <p className={styles.signInNote}>
              <strong>@pusan.ac.kr</strong> <UiText>{"계정만 사용할 수 있습니다."}</UiText>{" "}
              <UiText>{"교직원은 웹메일 로그인 화면이 나오면 그대로 로그인하면 됩니다."}</UiText>
            </p>
            <Link className={chrome.textLink} href="/archive"><UiText>{"사업별 결과물 보기"}</UiText></Link>
            {showDevelopmentLogin ? (
              // 로컬 개발 전용 도구라 제 모양 그대로 둔다.
              <div className={styles.devLogin} data-ui="">
                <DevelopmentRoleSignIn seedRequired={seedRequired} />
              </div>
            ) : null}
          </section>
        </div>

        <div className={styles.stage}>
          <div className={styles.stageInner}>
            {/* 들어올 때의 움직임(stageInner)과 스크롤 시차(이 칸)를 다른 요소에 둔다. 한 요소에 두면 애니메이션이 시차를 덮는다. */}
            <div data-speed="-0.08">
              {archive && archive.tabs.length > 0 ? (
                <LandingArchiveTabs digest={archive} />
              ) : (
                <Image className={styles.stageShot} src="/landing/screens/program-overview.webp" alt="관리자가 보는 프로그램 운영 화면" width={1600} height={1000} priority sizes="620px" />
              )}
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className={`${styles.work} ${chrome.wrap}`} id="work" aria-labelledby="work-title">
          <div className={styles.workHead}>
            <h2 className={chrome.display} id="work-title" data-reveal="0"><UiText>{"결과물"}</UiText></h2>
            <Link className={chrome.textLink} href="/archive" data-reveal="1"><UiText>{"사업별 결과물 전체 보기"}</UiText></Link>
          </div>
          <div className={styles.wall}>
            {WALL.map((row) => (
              <div key={row[0].src} className={styles.wallRow}>
                {row.map((tile, index) => <ShowcaseFigure key={tile.src} tile={tile} order={index} sizes="(max-width: 760px) 100vw, 40vw" />)}
              </div>
            ))}
            {/* 확정된 해커톤 팀 표지를 서버가 한 장으로 굽는다. 새 표지가 오르면 저절로 바뀐다. */}
            <figure className={`${chrome.tile} ${styles.band}`} data-reveal="0">
              <div className={chrome.frame}>
                <Image data-drift="" src="/api/landing/showcase-wall" alt="최근 확정된 해커톤 팀 표지 모음" width={2760} height={1168} sizes="100vw" unoptimized />
              </div>
              <figcaption><span><UiText>{"최근 확정된 해커톤 팀 표지"}</UiText></span></figcaption>
            </figure>
          </div>
        </section>

        <section className={`${styles.steps} ${chrome.wrap}`} id="steps" aria-labelledby="steps-title">
          <div className={styles.stepsHead}>
            <h2 className={chrome.display} id="steps-title" data-reveal="0"><UiText>{"이용 절차"}</UiText></h2>
            <p data-reveal="1">
              <UiText>{"네 단계면 프로젝트가 시작됩니다. 학교 계정으로 들어와 동의를 한 번 거치면 그다음부터는 프로그램마다 반복하지 않습니다."}</UiText>
            </p>
          </div>
          <ol className={styles.stepList}>
            {STEPS.map((step, index) => (
              <li key={step.title} data-reveal={index}>
                <h3><UiText>{step.title}</UiText></h3>
                <p><UiText>{step.body}</UiText></p>
              </li>
            ))}
          </ol>
        </section>

        <section className={`${styles.screens} ${chrome.wrap}`} id="screens" aria-labelledby="screens-title">
          <div className={chrome.grid}>
            <div className={styles.screensHead}>
              <h2 className={chrome.display} id="screens-title" data-reveal="0"><UiText>{"실제 화면"}</UiText></h2>
              <p data-reveal="1"><UiText>{"지금 쓰고 있는 화면 그대로입니다. 화면에 보이는 프로젝트는 예시 데이터입니다."}</UiText></p>
            </div>
            {SCREENS.map((screen, index) => (
              <div key={screen.src} className={styles.screen}>
                <div className={styles.screenTile} data-speed={index === 0 ? "0.06" : "0.14"}>
                  <Image src={screen.src} alt={screen.alt} width={screen.width} height={screen.height} sizes="(max-width: 760px) 100vw, 50vw" data-drift={index === 1 ? "" : undefined} />
                </div>
                <div className={styles.screenText} data-reveal={index + 1}>
                  <h3><UiText>{screen.title}</UiText></h3>
                  <p><UiText>{screen.body}</UiText></p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {archive ? (
          <section className={`${styles.stats} ${chrome.wrap}`} id="numbers" aria-labelledby="numbers-title">
            <div className={chrome.grid}>
              <h2 id="numbers-title" data-reveal="0"><UiText>{"끝난 사업은 결과물로 남습니다"}</UiText></h2>
              <div className={styles.statsFigure} data-reveal="1">
                <p className={styles.figure} data-speed="0.1">
                  <Odometer value={archive.projectCount} /><sup><UiText>{"건"}</UiText></sup>
                </p>
                <p><UiText>{"로그인 없이 볼 수 있는 프로젝트입니다. 팀과 주제, 수상과 GitHub 저장소가 함께 남습니다."}</UiText></p>
              </div>
              <div className={styles.statsSide} data-reveal="2">
                <dl className={styles.nums}>
                  <div><dt><UiText>{"사업"}</UiText></dt><dd><Odometer value={archive.programCount} /><small><UiText>{"개"}</UiText></small></dd></div>
                  <div><dt><UiText>{"수상"}</UiText></dt><dd><Odometer value={archive.awardCount} /><small><UiText>{"팀"}</UiText></small></dd></div>
                  <div><dt><UiText>{"GitHub 저장소"}</UiText></dt><dd><Odometer value={archive.repositoryCount} /><small><UiText>{"개"}</UiText></small></dd></div>
                </dl>
                <Link className={chrome.textLink} href="/archive"><UiText>{"사업별 결과물 보기"}</UiText></Link>
              </div>
            </div>
          </section>
        ) : null}

        <section className={`${styles.features} ${chrome.wrap}`} id="features" aria-labelledby="features-title">
          <div className={styles.featuresHead}>
            <h2 className={chrome.display} id="features-title" data-reveal="0"><UiText>{"주요 기능"}</UiText></h2>
            <p data-reveal="1"><UiText>{"해커톤과 캡스톤 디자인, AI 부스터를 하나의 정해진 유형에 맞추지 않고 같은 시스템에서 운영합니다."}</UiText></p>
          </div>
          <dl className={styles.featureList}>
            {FEATURES.map((feature, index) => (
              <div key={feature.name} data-reveal={index % 3}>
                <dt><UiText>{feature.name}</UiText></dt>
                <dd><UiText>{feature.body}</UiText></dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={`${styles.roles} ${chrome.wrap}`} id="roles" aria-labelledby="roles-title">
          <h2 className={chrome.display} id="roles-title" data-reveal="0"><UiText>{"역할별 안내"}</UiText></h2>
          <dl className={styles.roleList}>
            {ROLES.map((role) => (
              <div key={role.name} data-reveal="0">
                <dt><UiText>{role.name}</UiText></dt>
                <dd><UiText>{role.work}</UiText></dd>
                <dd className={styles.access} data-invite={role.access === "초대 링크" || undefined}><UiText>{role.access}</UiText></dd>
              </div>
            ))}
          </dl>
        </section>

        <a className={`${styles.cta} ${chrome.wrap}`} href="#sign-in">
          <span className={styles.ctaNote}><UiText>{"부산대학교 구성원이면 지금 들어올 수 있습니다"}</UiText></span>
          <svg className={styles.ctaArrow} viewBox="0 0 48 48" aria-hidden="true"><path d="M12 36 36 12M16 12h20v20" fill="none" stroke="currentColor" strokeWidth="4" /></svg>
          <span className={styles.ctaWord}><span data-rise=""><UiText>{"로그인"}</UiText></span></span>
        </a>
      </main>

      <LandingFooter signInHref="#sign-in" />
    </div>
  );
}
