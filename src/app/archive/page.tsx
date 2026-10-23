import Link from "next/link";
import type { Metadata } from "next";

import { ArchivePanel, ArchiveRow, PublicArchiveRow } from "@/app/archive/_components/public-archive-row";
import { GRADUATION_PROJECT_LINKS } from "@/app/archive/_lib/graduation-project-links";
import { groupPublicArchive } from "@/app/archive/_lib/group-public-archive";
import { listProgramCategoryOrder } from "@/modules/project-program/infrastructure/prisma-program-category-order-repository";
import { PrismaTeamArchiveQueryRepository } from "@/modules/team/infrastructure/prisma-team-archive-query-repository";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiNav } from "@/shared/i18n/localized-elements";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { Brand } from "@/shared/ui/brand";

// 졸업과제는 PMS 에 넣지 않아 대분류가 없다. 다른 사업과 같은 줄에 서도록 탭만 하나 따로 둔다.
const GRADUATION_TAB = "졸업과제";

const tabClass = (selected: boolean) =>
  `inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-1 pb-3 pt-1 text-[0.9375rem] font-semibold transition-colors ${
    selected
      ? "border-[var(--primary)] text-[var(--ink)]"
      : "border-transparent text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
  }`;

const countClass = (selected: boolean) =>
  `rounded-full px-2 py-0.5 text-xs tabular-nums ${
    selected ? "bg-[var(--primary-subtle)] text-[var(--accent-ink)]" : "bg-[var(--surface-subtle)] text-[var(--muted)]"
  }`;

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
      <header className="border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-5 py-3 sm:px-8">
          <Brand href="/" />
          <span className="text-sm font-semibold text-[var(--ink)]"><UiText>{"부산대학교 AI융합교육원"}</UiText></span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-8 sm:px-8 sm:pt-10">
        <h1 className="text-[clamp(1.625rem,2.6vw,2rem)] font-bold leading-tight tracking-[-0.035em] [text-wrap:balance]">
          <UiText>{"사업별 결과물"}</UiText>
        </h1>
        <p className="mt-2 max-w-[44rem] text-[0.9375rem] leading-7 text-[var(--muted)]">
          <UiText>{"부산대학교 AI융합교육원이 운영한 사업의 결과물입니다. 줄을 누르면 GitHub 저장소가 새 창으로 열립니다."}</UiText>
          {" "}
          <span className="whitespace-nowrap tabular-nums"><UiText>{`사업 ${view.categories.length + 1}개, 프로젝트 ${view.totalProjects}건`}</UiText></span>
        </p>

        <UiNav aria-label="사업" className="mt-7">
          {/* 바닥선을 안쪽 그림자로 그려 선택 탭의 밑줄이 그 위에 겹친다. 좁은 화면에서는 옆으로 민다. */}
          <ul className="flex gap-6 overflow-x-auto shadow-[inset_0_-1px_0_var(--line)] [scrollbar-width:none]">
            {view.categories.map((category) => {
              const selected = !showGraduation && category.name === view.selectedCategory;
              return (
                <li key={category.name} className="flex shrink-0">
                  <Link
                    href={`/archive?category=${encodeURIComponent(category.name)}`}
                    aria-current={selected ? "page" : undefined}
                    className={tabClass(selected)}
                  >
                    <UiText>{category.name}</UiText>
                    <span className={countClass(selected)}>{category.count}</span>
                  </Link>
                </li>
              );
            })}
            <li className="flex shrink-0">
              <Link
                href={`/archive?category=${encodeURIComponent(GRADUATION_TAB)}`}
                aria-current={showGraduation ? "page" : undefined}
                className={tabClass(showGraduation)}
              >
                <UiText>{GRADUATION_TAB}</UiText>
              </Link>
            </li>
          </ul>
        </UiNav>

        {showGraduation ? (
          <section className="mt-8">
            <p className="mb-3 text-sm text-[var(--muted)]">
              <UiText>{"정보컴퓨터공학부 졸업과제는 연도별 GitHub 조직에서 볼 수 있습니다."}</UiText>
            </p>
            <ArchivePanel name={<UiText>{GRADUATION_TAB}</UiText>}>
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
            </ArchivePanel>
          </section>
        ) : (
          <div className="mt-8 lg:grid lg:grid-cols-[8.5rem_minmax(0,1fr)] lg:gap-10">
            {/* 한 사업에 여러 해가 쌓이면 스크롤이 길어진다. 연도로 바로 내려가는 길을 둔다. */}
            {view.years.length > 1 ? (
              <UiNav aria-label="연도" className="mb-8 lg:sticky lg:top-8 lg:mb-0 lg:self-start">
                <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-0.5">
                  {view.years.map((year) => (
                    <li key={year.year}>
                      <a
                        href={`#archive-year-${year.year}`}
                        className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-[var(--surface-subtle)] lg:border-transparent lg:bg-transparent lg:py-2"
                      >
                        <UiText>{`${year.year}년`}</UiText>
                        <span className="text-xs font-medium tabular-nums text-[var(--muted)]">
                          {year.programs.reduce((sum, program) => sum + program.projects.length, 0)}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </UiNav>
            ) : null}
            <div className="grid min-w-0 grid-cols-1 gap-6 lg:col-start-2">
              {view.years.flatMap((year) => year.programs.map((program, index) => (
                // 연도 목록이 가리키는 자리는 그 해의 첫 대회다.
                <section key={program.id} id={index === 0 ? `archive-year-${year.year}` : undefined} className="scroll-mt-8">
                  <ArchivePanel year={year.year} name={<UiText>{program.name}</UiText>} count={program.projects.length}>
                    {program.projects.map((project) => (
                      <PublicArchiveRow key={project.id} project={project} />
                    ))}
                  </ArchivePanel>
                </section>
              )))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
