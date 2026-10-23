import Link from "next/link";
import type { Metadata } from "next";

import { PublicArchiveCard } from "@/app/archive/_components/public-archive-card";
import { GRADUATION_PROJECT_LINKS } from "@/app/archive/_lib/graduation-project-links";
import { groupPublicArchive } from "@/app/archive/_lib/group-public-archive";
import { listProgramCategoryOrder } from "@/modules/project-program/infrastructure/prisma-program-category-order-repository";
import { PrismaTeamArchiveQueryRepository } from "@/modules/team/infrastructure/prisma-team-archive-query-repository";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiNav } from "@/shared/i18n/localized-elements";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { Brand } from "@/shared/ui/brand";
import { GithubIcon } from "@/shared/ui/github-icon";

// 졸업과제는 PMS 에 넣지 않아 대분류가 없다. 다른 사업과 같은 줄에 서도록 탭만 하나 따로 둔다.
const GRADUATION_TAB = "졸업과제";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("사업별 결과물");
}

// 현장평가 평가위원이 계정 없이 들어와 보는 화면이다. 개인정보 처리방침처럼 AppShell 없이 그린다.
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

  return (
    <div className="min-h-screen bg-[var(--workspace)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-5 sm:px-8">
        <Brand href="/" />
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-semibold leading-tight tracking-[-0.035em]">
          <UiText>{"사업별 결과물"}</UiText>
        </h1>
        <p className="mt-3 max-w-2xl text-[0.9375rem] leading-7 text-[var(--muted)]">
          <UiText>{"부산대학교 AI융합교육원이 운영한 사업의 결과물입니다. GitHub 버튼을 누르면 저장소로 이동합니다."}</UiText>
        </p>
        <p className="mt-2 text-sm tabular-nums text-[var(--muted)]">
          <UiText>{`사업 ${view.categories.length + 1}개, 프로젝트 ${view.totalProjects}건`}</UiText>
        </p>

        <UiNav aria-label="사업" className="mt-8 flex flex-wrap gap-2 border-b border-[var(--line)] pb-4">
          {view.categories.map((category) => {
            const selected = !showGraduation && category.name === view.selectedCategory;
            return (
              <Link
                key={category.name}
                href={`/archive?category=${encodeURIComponent(category.name)}`}
                aria-current={selected ? "page" : undefined}
                className={`${selected ? "button-primary" : "button-secondary"} gap-2`}
              >
                <UiText>{category.name}</UiText> <span className="tabular-nums">{category.count}</span>
              </Link>
            );
          })}
          <Link
            href={`/archive?category=${encodeURIComponent(GRADUATION_TAB)}`}
            aria-current={showGraduation ? "page" : undefined}
            className={showGraduation ? "button-primary" : "button-secondary"}
          >
            <UiText>{GRADUATION_TAB}</UiText>
          </Link>
        </UiNav>

        {showGraduation ? (
          <section aria-labelledby="archive-graduation" className="mt-10">
            <h2 id="archive-graduation" className="text-xl font-bold tracking-[-0.03em]">
              <UiText>{GRADUATION_TAB}</UiText>
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              <UiText>{"정보컴퓨터공학부 졸업과제는 연도별 GitHub 조직에서 볼 수 있습니다."}</UiText>
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {GRADUATION_PROJECT_LINKS.map((link) => (
                <li key={link.url}>
                  <a href={link.url} target="_blank" rel="noreferrer" className="button-secondary inline-flex items-center gap-2">
                    <GithubIcon className="size-4 shrink-0" />
                    <UiText>{`${link.year}년 졸업과제`}</UiText>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <div className="mt-10 lg:grid lg:grid-cols-[9rem_minmax(0,1fr)] lg:gap-10">
            {/* 한 사업에 여러 해가 쌓이면 스크롤이 길어진다. 연도로 바로 내려가는 길을 둔다. */}
            {view.years.length > 1 ? (
              <UiNav aria-label="연도" className="mb-8 lg:sticky lg:top-8 lg:mb-0 lg:self-start">
                <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
                  {view.years.map((year) => (
                    <li key={year.year}>
                      <a href={`#archive-year-${year.year}`} className="button-secondary gap-2 lg:w-full lg:justify-between">
                        <UiText>{`${year.year}년`}</UiText>
                        <span className="tabular-nums">{year.programs.reduce((sum, program) => sum + program.projects.length, 0)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </UiNav>
            ) : null}
            <div className="grid gap-12 lg:col-start-2">
              {view.years.map((year) => (
                <section key={year.year} aria-labelledby={`archive-year-${year.year}`} className="scroll-mt-8">
                  <h2 id={`archive-year-${year.year}`} className="text-xl font-bold tracking-[-0.03em]">
                    <UiText>{`${year.year}년`}</UiText>
                  </h2>
                  {year.programs.map((program) => (
                    <div key={program.id} className="mt-5">
                      <h3 className="text-sm font-semibold text-[var(--muted)]">
                        <UiText>{program.name}</UiText> <span className="tabular-nums">{program.projects.length}</span>
                      </h3>
                      <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {program.projects.map((project) => (
                          <li key={project.id}><PublicArchiveCard project={project} /></li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
