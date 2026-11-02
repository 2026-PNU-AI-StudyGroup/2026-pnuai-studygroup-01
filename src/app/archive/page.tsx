import Link from "next/link";
import type { Metadata } from "next";

import { LandingFooter, LandingWordmark, MANUAL_URL, SHOWCASE, ShowcaseFigure, chrome, landingPageClass } from "@/app/_components/landing-chrome";
import { Odometer } from "@/app/_components/odometer";
import { SmoothScroll } from "@/app/_components/smooth-scroll";
import { ArchivePanel, ArchiveRow, PublicArchiveRow } from "@/app/archive/_components/public-archive-row";
import { GRADUATION_PROJECT_LINKS } from "@/app/archive/_lib/graduation-project-links";
import { graduationTabIndex, groupPublicArchive } from "@/app/_components/landing-archive";
import { listProgramCategoryOrder } from "@/modules/project-program/infrastructure/prisma-program-category-order-repository";
import { PrismaTeamArchiveQueryRepository } from "@/modules/team/infrastructure/prisma-team-archive-query-repository";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiNav } from "@/shared/i18n/localized-elements";
import { prisma } from "@/shared/infrastructure/database/prisma";

import styles from "./_components/archive.module.css";

// 졸업과제는 PMS 에 넣지 않아 대분류가 없다. 다른 사업과 같은 줄에 서도록 탭만 하나 따로 둔다.
const GRADUATION_TAB = "졸업과제";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("사업별 결과물");
}

// 현장평가 평가위원이 계정 없이 들어와 보는 화면이다. 로그인 전 첫 화면과 같은 바탕(colour chapters)으로 그린다.
export default async function PublicArchivePage({ searchParams }: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedCategory = typeof params.category === "string" ? params.category : undefined;
  const [projects, categoryOrder] = await Promise.all([
    new PrismaTeamArchiveQueryRepository(prisma).listPublic(),
    listProgramCategoryOrder(prisma),
  ]);
  const graduationRequested = requestedCategory === GRADUATION_TAB;
  const view = groupPublicArchive(projects, categoryOrder, graduationRequested ? undefined : requestedCategory);
  // 공개된 프로젝트가 하나도 없으면 열 사업 탭이 없으니 졸업과제 탭을 연다.
  const showGraduation = graduationRequested || view.selectedCategory === null;
  const graduationAt = graduationTabIndex(view.categories);
  const tabs = [
    ...view.categories.slice(0, graduationAt).map((category) => ({ ...category, graduation: false })),
    { name: GRADUATION_TAB, count: null, graduation: true },
    ...view.categories.slice(graduationAt).map((category) => ({ ...category, graduation: false })),
  ];

  return (
    <div className={landingPageClass}>
      {/* 탭을 바꾸면 목록이 통째로 바뀐다. 다시 붙여 새 목록의 움직임을 잡는다. */}
      <SmoothScroll key={showGraduation ? GRADUATION_TAB : view.selectedCategory} />

      <header className={`${styles.head} ${chrome.wrap}`}>
        <div className={chrome.bar}>
          <LandingWordmark />
          <div className={styles.barEnd}>
            <UiNav aria-label="페이지 안내">
              <ul className={chrome.barLinks}>
                <li><a href={MANUAL_URL} target="_blank" rel="noreferrer"><UiText>{"사용 매뉴얼"}</UiText></a></li>
              </ul>
            </UiNav>
            <Link className={`${chrome.button} ${styles.barButton}`} href="/#sign-in"><UiText>{"로그인"}</UiText></Link>
          </div>
        </div>
        <div className={`${chrome.grid} ${styles.headBody}`}>
          <div className={styles.headCopy}>
            <h1 className={chrome.display} data-reveal="0"><UiText>{"사업별 결과물"}</UiText></h1>
            <p data-reveal="1">
              <UiText>{"부산대학교 AI융합교육원이 운영한 사업의 결과물입니다. 줄을 누르면 GitHub 저장소가 새 창으로 열립니다."}</UiText>
            </p>
          </div>
          <dl className={styles.headNums} data-reveal="2">
            <div><dt><UiText>{"사업"}</UiText></dt><dd><Odometer value={view.categories.length + 1} /><small><UiText>{"개"}</UiText></small></dd></div>
            <div><dt><UiText>{"프로젝트"}</UiText></dt><dd><Odometer value={view.totalProjects} /><small><UiText>{"건"}</UiText></small></dd></div>
          </dl>
        </div>
        {/* 상을 받은 표지 몇 장. 목록 위에서 이 사업들이 무엇을 만들었는지 먼저 보인다. */}
        <div className={styles.strip}>
          {SHOWCASE.slice(0, 5).map((tile, index) => <ShowcaseFigure key={tile.src} tile={tile} order={index} sizes="(max-width: 760px) 50vw, 20vw" />)}
        </div>
      </header>

      <main className={`${styles.main} ${chrome.wrap}`}>
        <UiNav aria-label="사업" className={styles.tabs}>
          <ul>
            {tabs.map((tab) => {
              const selected = tab.graduation ? showGraduation : !showGraduation && tab.name === view.selectedCategory;
              return (
                <li key={tab.name}>
                  <Link href={`/archive?category=${encodeURIComponent(tab.name)}`} aria-current={selected ? "page" : undefined}>
                    <UiText>{tab.name}</UiText>
                    {tab.count === null ? null : <b><Odometer value={tab.count} /></b>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </UiNav>

        {showGraduation ? (
          <section className={styles.graduation} aria-labelledby="graduation-title">
            <h2 id="graduation-title" className={styles.year} data-reveal="0"><UiText>{GRADUATION_TAB}</UiText></h2>
            <p className={styles.note} data-reveal="1">
              <UiText>{"정보컴퓨터공학부 졸업과제는 연도별 GitHub 조직에서 볼 수 있습니다."}</UiText>
            </p>
            <ul className={styles.rows}>
              {GRADUATION_PROJECT_LINKS.map((link) => (
                <li key={link.url}>
                  <ArchiveRow
                    href={link.url}
                    lead={<UiText>{`${link.year}년`}</UiText>}
                    title={<UiText>{`${link.year}년 졸업과제`}</UiText>}
                    summary={link.url.replace(/^https?:\/\//, "")}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <div className={styles.body}>
            {/* 한 사업에 여러 해가 쌓이면 스크롤이 길어진다. 연도로 바로 내려가는 길을 둔다. */}
            {view.years.length > 1 ? (
              <UiNav aria-label="연도" className={styles.yearNav}>
                <ul>
                  {view.years.map((year) => (
                    <li key={year.year}>
                      <a href={`#archive-year-${year.year}`}>
                        <UiText>{`${year.year}년`}</UiText>
                        <span>{year.programs.reduce((sum, program) => sum + program.projects.length, 0)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </UiNav>
            ) : null}
            <div className={styles.years}>
              {view.years.map((year) => (
                <section key={year.year} id={`archive-year-${year.year}`} aria-labelledby={`archive-year-title-${year.year}`} className={styles.yearGroup}>
                  <h2 id={`archive-year-title-${year.year}`} className={styles.year} data-reveal="0">{year.year}</h2>
                  {year.programs.map((program) => (
                    <ArchivePanel key={program.id} id={`archive-program-${program.id}`} name={<UiText>{program.name}</UiText>} count={program.projects.length}>
                      {program.projects.map((project) => (
                        <PublicArchiveRow key={project.id} project={project} />
                      ))}
                    </ArchivePanel>
                  ))}
                </section>
              ))}
            </div>
          </div>
        )}
      </main>

      <LandingFooter signInHref="/#sign-in" />
    </div>
  );
}
