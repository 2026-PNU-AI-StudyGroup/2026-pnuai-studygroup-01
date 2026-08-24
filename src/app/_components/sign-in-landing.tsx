import Image from "next/image";
import Link from "next/link";

import { DevelopmentRoleSignIn } from "@/modules/identity/ui/development-role-sign-in";
import { GoogleSignInButton } from "@/modules/identity/ui/google-sign-in-button";
import { LandingNotices } from "@/app/_components/landing-notices";
import { UiLink, UiNav } from "@/shared/i18n/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import { SmoothScroll } from "./smooth-scroll";

import styles from "./sign-in-landing.module.css";

const MANUAL_URL = "https://aipms.notion.site/";

// 배경 벽은 CSS 반복 배경 한 장으로 처리한다. public/landing/showcase-wall.webp 참고.

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
    src: "/landing/screens/program-overview.webp",
    alt: "관리자가 보는 프로그램 운영 화면",
    title: "프로그램 하나가 한 화면에 들어온다",
    body: "공지와 팀 구성, 보고서 제출 현황과 제출물을 프로그램 단위로 모아 봅니다. 투표를 켠 프로그램은 득표 현황도 같은 자리에서 확인합니다.",
    width: 1600,
    height: 1000,
  },
  {
    src: "/landing/screens/my-projects-dashboard.webp",
    alt: "학생 내 프로젝트와 할 일 화면",
    title: "내 일정과 제출률이 카드에 있다",
    body: "지원 상태와 진행 중인 프로젝트를 구분해 보여주고, 카드에서 다가오는 할 일과 보고서 제출률을 확인한 뒤 작업 공간으로 넘어갑니다.",
    width: 1600,
    height: 533,
  },
];

const FEATURES = [
  {
    name: "프로그램 운영",
    body: "시작일과 종료일을 정해 프로그램을 개설하고, 공개와 마감을 관리합니다.",
  },
  {
    name: "주제와 지원",
    body: "교수가 주제와 정원을 등록하고, 학생 지원을 검토해 팀을 확정합니다.",
  },
  {
    name: "팀 작업공간",
    body: "할 일과 담당자, 팀과 지도교수 대화, 진행 현황을 한자리에서 다룹니다.",
  },
  {
    name: "보고서와 승인",
    body: "요구사항과 기한을 정해 버전으로 제출받고, 승인하거나 수정을 요청합니다.",
  },
  {
    name: "결과물 아카이브",
    body: "승인된 결과물이 연도별로 남아 다음 프로젝트의 참고 자료가 됩니다.",
  },
  {
    name: "투표와 채점",
    body: "프로그램 단위 투표와 채점표 기반 평가를 함께 운영합니다.",
  },
];

const FAMILY_SITES = [
  { name: "AI융합교육원", host: "swedu.pusan.ac.kr", href: "https://swedu.pusan.ac.kr/swedu/index.do" },
  { name: "PLATO", host: "plato.pusan.ac.kr", href: "https://plato.pusan.ac.kr" },
  { name: "코드플레이스", host: "code.pusan.ac.kr", href: "https://code.pusan.ac.kr" },
  { name: "피클", host: "pickle.pusan.ac.kr", href: "https://pickle.pusan.ac.kr" },
  { name: "AI역량지원시스템", host: "swcss.pusan.ac.kr", href: "https://swcss.pusan.ac.kr" },
  { name: "공식 유튜브", host: "youtube.com/@pnuswedu", href: "https://www.youtube.com/@pnuswedu" },
  { name: "인프런", host: "inflearn.com/@pnuswedu", href: "https://www.inflearn.com/users/1370319/@pnuswedu" },
];

const ROLES = [
  {
    name: "학생",
    work: "주제를 찾아 지원하고, 팀을 꾸리고, 보고서와 결과물을 제출합니다.",
    access: "구글 로그인",
    highlighted: false,
  },
  {
    name: "교수",
    work: "주제를 등록하고 지원을 검토해 팀을 확정하며, 보고서를 승인합니다.",
    access: "구글 로그인",
    highlighted: false,
  },
  {
    name: "관리자",
    work: "프로그램을 개설하고 운영 일정과 투표, 사용자 권한을 관리합니다.",
    access: "구글 로그인",
    highlighted: false,
  },
  {
    name: "외부 자문위원",
    work: "배정된 팀의 제출물을 열람하고 채점표와 피드백을 작성합니다.",
    access: "초대 링크",
    highlighted: true,
  },
];

export function SignInLanding({
  showDevelopmentLogin,
  seedRequired,
}: {
  showDevelopmentLogin: boolean;
  seedRequired: boolean;
}) {
  return (
    <div className={`${styles.page} min-h-screen bg-[var(--surface)] text-[var(--ink)]`}>
      <LandingNotices />
      <SmoothScroll />

      <section className={styles.hero}>
        <div aria-hidden="true" className={styles.mosaic}>
          <div className={styles.mosaicLayer} />
        </div>
        <div aria-hidden="true" className={styles.heroWash} />

        <div className={styles.heroInner}>
          <div className={styles.topBar}>
            <div className="mx-auto flex w-full max-w-[76rem] items-center justify-between gap-6 px-5 py-4 sm:px-8">
              <UiLink
                href="/"
                aria-label="부산대학교 학과 프로젝트 관리 홈"
                className={styles.institute}
              >
                <span aria-hidden="true" className={styles.instituteMark} />
              </UiLink>
              <UiNav aria-label="페이지 안내" className="hidden items-center gap-7 text-sm md:flex">
                <a className={styles.navLink} href="#steps"><UiText>{"이용 절차"}</UiText></a>
                <a className={styles.navLink} href="#screens"><UiText>{"실제 화면"}</UiText></a>
                <a className={styles.navLink} href="#features"><UiText>{"주요 기능"}</UiText></a>
                <a className={styles.navLink} href="#roles"><UiText>{"역할별 안내"}</UiText></a>
                <a className={styles.navLink} href={MANUAL_URL} target="_blank" rel="noreferrer">
                  <UiText>{"사용 매뉴얼"}</UiText>
                </a>
              </UiNav>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[76rem] px-5 pb-24 pt-20 sm:px-8 lg:pb-32 lg:pt-28">
            <h1 className={styles.title}>
              <UiText>{"프로젝트를 열고, 팀을 꾸리고, 결과를 남긴다"}</UiText>
            </h1>
            <p className={`${styles.lede} mt-7 text-base sm:text-lg`}>
              <UiText>
                {"부산대학교 AI융합교육원의 프로젝트 관리 시스템입니다. 프로그램 참여부터 보고서 승인, 결과물 아카이브까지 한 화면에서 이어집니다."}
              </UiText>
            </p>

            <div className={`${styles.heroDivider} mt-9`} />

            <section id="sign-in" aria-labelledby="sign-in-title" className="mt-9 scroll-mt-8">
              {/* 화면에는 안 보이지만 스크린 리더에는 들린다. 제목만 훑어 페이지 구조를 파악하는
                  사람에게 로그인 구역이 어디인지 알려 준다. 디자인은 그대로 둔다. */}
              <h2 id="sign-in-title" className="sr-only">
                <UiText>{"로그인"}</UiText>
              </h2>
              <div className={styles.signInAction}>
                <GoogleSignInButton disabled={showDevelopmentLogin} />
              </div>
              <p className={`${styles.signInNote} mt-5 text-sm`}>
                <strong>@pusan.ac.kr</strong> <UiText>{"계정만 사용할 수 있습니다."}</UiText>
              </p>
              <p className={`${styles.signInNote} mt-2 text-sm`}>
                <UiText>{"교직원 계정은 Google Workspace를 쓰지 않으면 로그인 중에 부산대학교 웹메일 화면으로 넘어갑니다. 그 화면에서 그대로 로그인하면 됩니다."}</UiText>
              </p>
              <p className={`${styles.signInNote} mt-2 text-sm`}>
                <UiText>{"외부 자문위원은 관리자가 보낸 초대 링크로 접속합니다."}</UiText>
              </p>
              {showDevelopmentLogin ? (
                <div className="mt-7 max-w-[26rem] rounded-[var(--radius-panel)] bg-[var(--surface)] p-5 text-[var(--ink)]">
                  <DevelopmentRoleSignIn seedRequired={seedRequired} />
                </div>
              ) : null}
            </section>

            <p className={`${styles.lede} mt-12 text-sm`}>
              <UiText>{"뒤에 보이는 것은 지난 해커톤과 캡스톤 디자인에서 실제로 제출된 결과물입니다."}</UiText>
            </p>
          </div>
        </div>
      </section>

      <section id="steps" aria-labelledby="steps-title" className={`scroll-mt-8 border-b border-[var(--line)] px-5 py-16 sm:px-8 lg:py-24`}>
        <div className="mx-auto w-full max-w-[76rem]">
          <h2 id="steps-title" className={`${styles.rise} text-2xl font-bold tracking-[-0.04em] sm:text-3xl`}>
            <UiText>{"이용 절차"}</UiText>
          </h2>
          <p className={`${styles.sectionLede} ${styles.rise} mt-4 text-base`}>
            <UiText>{"네 단계면 프로젝트가 시작됩니다. 학교 계정으로 들어와 동의를 한 번 거치면 그다음부터는 프로그램마다 반복하지 않습니다."}</UiText>
          </p>
          <ol className={`${styles.steps} mt-10`}>
            {STEPS.map((step, index) => (
              <li key={step.title} className={styles.rise}>
                <span className={styles.stepIndex}>{String(index + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 text-base font-semibold">
                  <UiText>{step.title}</UiText>
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  <UiText>{step.body}</UiText>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="screens" aria-labelledby="screens-title" className={`scroll-mt-8 border-b border-[var(--line)] px-5 py-16 sm:px-8 lg:py-24`}>
        <div className="mx-auto w-full max-w-[76rem]">
          <h2 id="screens-title" className={`${styles.rise} text-2xl font-bold tracking-[-0.04em] sm:text-3xl`}>
            <UiText>{"실제 화면"}</UiText>
          </h2>
          <p className={`${styles.sectionLede} ${styles.rise} mt-4 text-base`}>
            <UiText>{"지금 쓰고 있는 화면 그대로입니다. 화면에 보이는 프로젝트는 예시 데이터입니다."}</UiText>
          </p>
          <div className="mt-12 grid gap-16 lg:gap-24">
            {SCREENS.map((screen, index) => (
              <div
                key={screen.src}
                className={`${styles.screenRow} ${index % 2 === 1 ? styles.screenRowFlip : ""} ${styles.rise}`}
              >
                <div className={styles.screenShot}>
                  <Image src={screen.src} alt={screen.alt} width={screen.width} height={screen.height} sizes="(min-width: 60rem) 55vw, 100vw" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-[-0.03em]">
                    <UiText>{screen.title}</UiText>
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                    <UiText>{screen.body}</UiText>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" aria-labelledby="features-title" className={`scroll-mt-8 border-b border-[var(--line)] px-5 py-16 sm:px-8 lg:py-24`}>
        <div className="mx-auto w-full max-w-[76rem]">
          <h2 id="features-title" className={`${styles.rise} text-2xl font-bold tracking-[-0.04em] sm:text-3xl`}>
            <UiText>{"주요 기능"}</UiText>
          </h2>
          <p className={`${styles.sectionLede} ${styles.rise} mt-4 text-base`}>
            <UiText>{"해커톤과 캡스톤 디자인, AI 부스터를 하나의 정해진 유형에 맞추지 않고 같은 시스템에서 운영합니다."}</UiText>
          </p>
          <dl className="mt-10">
            {FEATURES.map((feature) => (
              <div key={feature.name} className={`${styles.featureRow} ${styles.rise}`}>
                <dt className="text-base font-semibold">
                  <UiText>{feature.name}</UiText>
                </dt>
                <dd className="text-sm leading-7 text-[var(--muted)]">
                  <UiText>{feature.body}</UiText>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="roles" aria-labelledby="roles-title" className={`scroll-mt-8 px-5 py-16 sm:px-8 lg:py-24`}>
        <div className="mx-auto w-full max-w-[76rem]">
          <h2 id="roles-title" className={`${styles.rise} text-2xl font-bold tracking-[-0.04em] sm:text-3xl`}>
            <UiText>{"역할별 안내"}</UiText>
          </h2>
          <div className={`${styles.roleHead} ${styles.rise} mt-10`} aria-hidden="true">
            <span><UiText>{"역할"}</UiText></span>
            <span><UiText>{"하는 일"}</UiText></span>
            <span><UiText>{"접속 방법"}</UiText></span>
          </div>
          <dl className="mt-10 md:mt-0">
            {ROLES.map((role) => (
              <div key={role.name} className={`${styles.roleRow} ${styles.rise}`}>
                <dt className="text-base font-semibold">
                  <UiText>{role.name}</UiText>
                </dt>
                <dd className="text-sm leading-6 text-[var(--muted)]">
                  <UiText>{role.work}</UiText>
                </dd>
                <dd className={role.highlighted ? styles.accessTagAccent : styles.accessTag}>
                  <UiText>{role.access}</UiText>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="family-title" className={`${styles.familyBand} px-5 pb-14 pt-16 sm:px-8`}>
        <div className="mx-auto w-full max-w-[76rem]">
          <h2 id="family-title" className={`${styles.familyBandTitle} text-sm font-semibold`}>
            <UiText>{"패밀리 사이트"}</UiText>
          </h2>
          <ul className={`${styles.familyGrid} mt-5`}>
            {FAMILY_SITES.map((site) => (
              <li key={site.href}>
                <a className={styles.familyCard} href={site.href} target="_blank" rel="noreferrer">
                  <span aria-hidden="true" className={styles.familyDash} />
                  <span className={styles.familyName}><UiText>{site.name}</UiText></span>
                  <span className={styles.familyHost}>{site.host}</span>
                  <span className={styles.familyGo}>
                    <UiText>{"바로가기"}</UiText> <span aria-hidden="true" className={styles.familyArrow}>&rarr;</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="closing-title"
        className={`${styles.closing} px-5 py-20 sm:px-8 lg:py-28`}
      >
        <div className="mx-auto w-full max-w-[76rem]">
          <h2 id="closing-title" className={styles.closingTitle}>
            <UiText>{"부산대학교 구성원이면 지금 들어올 수 있습니다"}</UiText>
          </h2>
          <p className={`${styles.signInNote} mt-5 text-base`}>
            <UiText>{"처음이라면 사용 매뉴얼을 함께 보세요. 막히는 곳이 있으면 피드백 게시판으로 알려 주세요."}</UiText>
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a className="button-primary" href="#sign-in"><UiText>{"로그인하러 가기"}</UiText></a>
            <a
              className="button-secondary"
              href={MANUAL_URL}
              target="_blank"
              rel="noreferrer"
            >
              <UiText>{"사용 매뉴얼"}</UiText>
            </a>
          </div>
        </div>
      </section>

      <footer className={`${styles.footerDark} px-5 py-9 sm:px-8`}>
        <div className="mx-auto flex w-full max-w-[76rem] flex-wrap items-center gap-x-7 gap-y-3 text-sm">
          <a href={MANUAL_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4">
            <UiText>{"사용 매뉴얼"}</UiText>
          </a>
          <Link href="/feedback" className="underline underline-offset-4">
            <UiText>{"피드백 게시판"}</UiText>
          </Link>
          <Link href="/privacy" className="underline underline-offset-4">
            <UiText>{"개인정보 처리방침"}</UiText>
          </Link>
          <span className="ms-auto">
            <UiText>{"부산대학교 AI융합교육원"}</UiText>
          </span>
        </div>
      </footer>
    </div>
  );
}
