import Image from "next/image";
import Link from "next/link";

import { DevelopmentRoleSignIn } from "@/modules/identity/ui/development-role-sign-in";
import { GoogleSignInButton } from "@/modules/identity/ui/google-sign-in-button";
import { UiNav } from "@/shared/i18n/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { Brand } from "@/shared/ui/brand";

import styles from "./sign-in-landing.module.css";

const MANUAL_URL = "https://aipms.notion.site/";

// 지난 해커톤과 캡스톤 결과물. OPUS 공개 자료에서 옮겨온 것이고 장식용이라 24칸을 채우려 앞쪽을 다시 쓴다.
const SHOWCASE_TILES = Array.from({ length: 36 }, (_, index) => index % 16 + 1);

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
      <section className={styles.hero}>
        <div aria-hidden="true" className={styles.mosaic}>
          {SHOWCASE_TILES.map((tile, index) => (
            <div key={`${tile}-${index}`} className={styles.tile}>
              <Image
                src={`/landing/showcase/${String(tile).padStart(2, "0")}.webp`}
                alt=""
                width={640}
                height={400}
                priority={index < 6}
              />
            </div>
          ))}
        </div>
        <div aria-hidden="true" className={styles.heroWash} />

        <div className={styles.heroInner}>
          <div className={styles.topBar}>
            <div className="mx-auto flex w-full max-w-[76rem] items-center justify-between gap-6 px-5 py-4 sm:px-8">
              <Brand href="/" inverse />
              <UiNav aria-label="페이지 안내" className="hidden items-center gap-7 text-sm md:flex">
                <a className={styles.navLink} href="#steps"><UiText>{"이용 절차"}</UiText></a>
                <a className={styles.navLink} href="#roles"><UiText>{"역할별 안내"}</UiText></a>
                <a className={styles.navLink} href={MANUAL_URL} target="_blank" rel="noreferrer">
                  <UiText>{"사용 매뉴얼"}</UiText>
                </a>
              </UiNav>
              <a className="button-primary" href="#sign-in"><UiText>{"로그인"}</UiText></a>
            </div>
          </div>

          <div className="mx-auto grid w-full max-w-[76rem] gap-12 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start lg:gap-16 lg:pb-28 lg:pt-24">
            <div>
              <h1 className={styles.title}>
                <UiText>{"프로젝트를 열고, 팀을 꾸리고, 결과를 남긴다"}</UiText>
              </h1>
              <p className={`${styles.lede} mt-6 text-base sm:text-lg`}>
                <UiText>
                  {"부산대학교 AI융합교육원의 프로젝트 관리 시스템입니다. 프로그램 참여부터 보고서 승인, 결과물 아카이브까지 한 화면에서 이어집니다."}
                </UiText>
              </p>
              <p className={`${styles.lede} mt-4 text-sm`}>
                <UiText>{"뒤에 보이는 것은 지난 해커톤과 캡스톤 디자인에서 실제로 제출된 결과물입니다."}</UiText>
              </p>
            </div>

            <section
              id="sign-in"
              aria-labelledby="sign-in-title"
              className={`${styles.card} w-full scroll-mt-8 p-6 sm:p-7`}
            >
              <h2 id="sign-in-title" className="text-2xl font-bold tracking-[-0.04em]">
                <UiText>{"로그인"}</UiText>
              </h2>
              <div className="mt-6">
                <GoogleSignInButton disabled={showDevelopmentLogin} />
              </div>
              <p className="mt-5 text-sm leading-6 text-[var(--muted)]">
                <strong className="font-semibold text-[var(--ink)]">@pusan.ac.kr</strong>{" "}
                <UiText>{"계정만 사용할 수 있습니다."}</UiText>
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                <UiText>{"외부 자문위원은 관리자가 보낸 초대 링크로 접속합니다."}</UiText>
              </p>
              {showDevelopmentLogin ? <DevelopmentRoleSignIn seedRequired={seedRequired} /> : null}
              <div className="mt-6 border-t border-[var(--line)] pt-5">
                <Link href="/privacy" className="text-sm text-[var(--muted)] underline underline-offset-4 hover:text-[var(--ink)]">
                  <UiText>{"개인정보 처리방침"}</UiText>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section id="steps" aria-labelledby="steps-title" className="scroll-mt-8 border-b border-[var(--line)] px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto w-full max-w-[76rem]">
          <h2 id="steps-title" className="text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
            <UiText>{"이용 절차"}</UiText>
          </h2>
          <ol className={`${styles.steps} mt-10`}>
            {STEPS.map((step, index) => (
              <li key={step.title} className={styles.step}>
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

      <section id="roles" aria-labelledby="roles-title" className="scroll-mt-8 px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto w-full max-w-[76rem]">
          <h2 id="roles-title" className="text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
            <UiText>{"역할별 안내"}</UiText>
          </h2>
          <div className={`${styles.roleHead} mt-10`} aria-hidden="true">
            <span><UiText>{"역할"}</UiText></span>
            <span><UiText>{"하는 일"}</UiText></span>
            <span><UiText>{"접속 방법"}</UiText></span>
          </div>
          <dl className="md:mt-0 mt-10">
            {ROLES.map((role) => (
              <div key={role.name} className={styles.roleRow}>
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

      <footer className="border-t border-[var(--line)] bg-[var(--workspace)] px-5 py-10 sm:px-8">
        <div className="mx-auto flex w-full max-w-[76rem] flex-wrap items-center gap-x-7 gap-y-3 text-sm text-[var(--muted)]">
          <a href={MANUAL_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-[var(--ink)]">
            <UiText>{"사용 매뉴얼"}</UiText>
          </a>
          <Link href="/feedback" className="underline underline-offset-4 hover:text-[var(--ink)]">
            <UiText>{"피드백 게시판"}</UiText>
          </Link>
          <Link href="/privacy" className="underline underline-offset-4 hover:text-[var(--ink)]">
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
