"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { UiNav, UiSection } from "@/modules/translation/ui/localized-elements";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import type { ProgramIconKey } from "@/modules/project-program/domain/program-icon";
import { ResponsiveSectionNavigation } from "@/shared/ui/responsive-section-navigation";
import { ProgramIcon } from "@/shared/ui/program-icon";
import styles from "./program-sidebar.module.css";

export type ProgramSidebarItem = {
  id: string;
  name: string;
  category: string;
  icon: ProgramIconKey;
  startYear: number;
  status: "active" | "past";
  href: string;
  votingEndsAt?: Date | string;
};

function VotingProgramCarousel({
  programs,
  selectedId,
  activeIndex,
  onMove,
}: {
  programs: ProgramSidebarItem[];
  selectedId?: string;
  activeIndex: number;
  onMove: (direction: -1 | 1) => void;
}) {
  const carouselId = useId();
  const currentIndex = activeIndex % programs.length;
  const currentProgram = programs[currentIndex];

  return (
    <UiSection id={carouselId} aria-roledescription="carousel" aria-label="투표 진행 프로그램" className="relative overflow-hidden rounded-[var(--radius-panel)] border border-[var(--primary-hover)] bg-[var(--primary)] p-3.5 text-white">
      <span aria-hidden="true" className="absolute -right-7 -top-8 size-24 rounded-full border border-white/15" />
      <span aria-hidden="true" className="absolute -right-2 -top-2 size-12 rounded-full bg-white/10" />
      <div className="relative">
        <div className="flex min-h-6 items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-1 text-[0.62rem] font-bold tracking-[0.08em]">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-3.5 fill-none stroke-current stroke-[1.8]"><path d="M5 4.5h10M5 10h10M5 15.5h6" strokeLinecap="round" /><circle cx="3.5" cy="4.5" r=".65" fill="currentColor" /><circle cx="3.5" cy="10" r=".65" fill="currentColor" /><circle cx="3.5" cy="15.5" r=".65" fill="currentColor" /></svg>
            <UiText>{"투표 진행 중"}</UiText>
          </span>
          <p key={`deadline-${currentProgram.id}`} className={`${styles.destinationText} text-right text-[0.65rem] font-semibold text-white/85`}><UiText>{"마감"}</UiText> <UiDate value={currentProgram.votingEndsAt!} mode="dateTime" /></p>
        </div>
        <div key={currentProgram.id} className={`mt-3 ${styles.destinationText}`}>
          <div className="flex min-w-0 items-center gap-2.5">
            <span data-program-mark aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--surface)] text-[var(--primary)]">
              <ProgramIcon icon={currentProgram.icon} className="size-[1.15rem]" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold tracking-[-0.02em]"><UiText>{currentProgram.name}</UiText></h3>
              <p className="mt-0.5 truncate text-[0.68rem] font-semibold text-white/75"><UiText>{currentProgram.category}</UiText></p>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <Link href={currentProgram.href} aria-current={currentProgram.id === selectedId ? "page" : undefined} className="inline-flex min-h-9 w-full items-center justify-center rounded-[var(--radius-control)] bg-[var(--surface)] px-2 text-xs font-bold text-[var(--primary)] transition-colors hover:bg-[var(--primary-subtle)]">
            <UiText>{"투표하러 가기"}</UiText>
          </Link>
        </div>
      </div>
      {programs.length > 1 ? (
        <div className="relative mt-1.5 flex h-5 items-center justify-center gap-1">
          <button type="button" aria-controls={carouselId} onClick={() => onMove(-1)} className="grid size-5 cursor-pointer place-items-center text-white/75 transition-colors hover:text-white">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-3.5 fill-none stroke-current stroke-[1.8]"><path d="m12 4-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="sr-only"><UiText>{"이전 투표 프로그램"}</UiText></span>
          </button>
          <span className="text-[0.58rem] font-bold leading-none tabular-nums text-white/80">
            {currentIndex + 1} / {programs.length}
          </span>
          <button type="button" aria-controls={carouselId} onClick={() => onMove(1)} className="grid size-5 cursor-pointer place-items-center text-white/75 transition-colors hover:text-white">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-3.5 fill-none stroke-current stroke-[1.8]"><path d="m8 4 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="sr-only"><UiText>{"다음 투표 프로그램"}</UiText></span>
          </button>
        </div>
      ) : null}
    </UiSection>
  );
}

function programsByYearDesc(programs: ProgramSidebarItem[]) {
  const byYear = new Map<number, ProgramSidebarItem[]>();
  for (const program of programs) {
    const group = byYear.get(program.startYear) ?? [];
    group.push(program);
    byYear.set(program.startYear, group);
  }
  return [...byYear.keys()]
    .sort((a, b) => b - a)
    .map((year) => ({ year, programs: byYear.get(year)! }));
}

function CategoryProgramGroup({
  category,
  programs,
  selectedId,
  open,
  onToggle,
}: {
  category: string;
  programs: ProgramSidebarItem[];
  selectedId?: string;
  open: boolean;
  onToggle: () => void;
}) {
  const contentId = useId();

  return (
    <div className="border-b border-[var(--line)] pb-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={onToggle}
        className="flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 text-xs font-bold text-[var(--ink)] hover:bg-[var(--surface-subtle)]"
      >
        <span className="min-w-0 truncate text-left"><UiText>{category}</UiText></span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`size-4 shrink-0 fill-none stroke-[var(--muted)] stroke-[1.7] transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 8 4 4 4-4" />
        </svg>
      </button>
      <div
        id={contentId}
        aria-hidden={!open}
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={`space-y-2 pt-1 transition-opacity duration-150 motion-reduce:transition-none ${open ? "opacity-100 delay-75" : "opacity-0"}`}>
            {programsByYearDesc(programs).map(({ year, programs: yearPrograms }) => (
              <div key={year}>
                <p className="px-2.5 pb-1 pt-1 text-[0.62rem] font-bold tracking-[0.04em] text-[var(--muted)]">{year}</p>
                <ul className="space-y-1">
                  {yearPrograms.map((program) => {
                    const selected = program.id === selectedId;
                    const votingOpen = Boolean(program.votingEndsAt);
                    const rowClassName = `relative flex min-h-[3.1rem] items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-left transition-colors ${
                      selected ? "bg-[var(--primary-subtle)] text-[var(--primary)] before:absolute before:-left-3 before:inset-y-0 before:w-0.5 before:bg-[var(--primary)]" : "hover:bg-[var(--surface-subtle)]"
                    }`;
                    const status = votingOpen
                      ? { dot: "bg-[#2f6bed]", text: "text-[var(--primary)]", label: "투표 중" }
                      : program.status === "active"
                        ? { dot: "bg-[#16a34a]", text: "text-[var(--success)]", label: "진행 중" }
                        : { dot: "bg-[var(--muted)]", text: "text-[var(--muted)]", label: "종료" };
                    const rowContent = (
                      <>
                        <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${status.dot}`} />
                        <span className="min-w-0">
                          <strong className="block truncate text-[0.8rem] font-bold"><UiText>{program.name}</UiText></strong>
                          <span className="mt-0.5 flex items-center gap-1 text-[0.64rem]">
                            <span className={`font-bold ${status.text}`}><UiText>{status.label}</UiText></span>
                          </span>
                        </span>
                      </>
                    );
                    return (
                      <li key={`${program.status}-${program.id}`}>
                        {selected ? (
                          <div aria-current="page" className={rowClassName}>{rowContent}</div>
                        ) : (
                          <Link href={program.href} tabIndex={open ? undefined : -1} className={rowClassName}>{rowContent}</Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProgramSidebar({ items, selectedId }: {
  items: ProgramSidebarItem[];
  selectedId?: string;
}) {
  const votingPrograms = items.filter((item) => item.votingEndsAt);
  const votingProgramCount = votingPrograms.length;
  const groups = items.reduce((result, item) => {
    const key = item.category;
    const group = result.get(key) ?? [];
    group.push(item);
    result.set(key, group);
    return result;
  }, new Map<string, ProgramSidebarItem[]>());
  // 대분류(카테고리)를 최상위 그룹으로, 최근 연도가 있는 분류를 위로. 동률은 가나다순.
  const categories = [...groups.keys()].sort((a, b) => {
    const maxYear = (category: string) => Math.max(...groups.get(category)!.map((item) => item.startYear));
    return maxYear(b) - maxYear(a) || a.localeCompare(b, "ko");
  });
  const categoriesKey = categories.join(":");
  const selectedCategory = items.find((item) => item.id === selectedId)?.category;
  const selectedProgram = items.find((item) => item.id === selectedId);
  const [openCategory, setOpenCategory] = useState<string | undefined>(selectedCategory ?? categories[0]);
  const [activeVotingIndex, setActiveVotingIndex] = useState(0);
  const [votingTimerRevision, setVotingTimerRevision] = useState(0);
  const [previousSelectedCategory, setPreviousSelectedCategory] = useState(selectedCategory);
  const [previousCategoriesKey, setPreviousCategoriesKey] = useState(categoriesKey);

  if (selectedCategory !== previousSelectedCategory || categoriesKey !== previousCategoriesKey) {
    setPreviousSelectedCategory(selectedCategory);
    setPreviousCategoriesKey(categoriesKey);
    if (selectedCategory !== undefined) {
      setOpenCategory(selectedCategory);
    } else if ((openCategory !== undefined && !categories.includes(openCategory)) || (!previousCategoriesKey && categories.length)) {
      setOpenCategory(categories[0]);
    }
  }

  useEffect(() => {
    if (votingProgramCount < 2 || (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    const timer = window.setInterval(() => {
      setActiveVotingIndex((current) => (current + 1) % votingProgramCount);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [votingProgramCount, votingTimerRevision]);

  function moveVotingProgram(direction: -1 | 1) {
    setActiveVotingIndex((current) => (current + direction + votingProgramCount) % votingProgramCount);
    setVotingTimerRevision((current) => current + 1);
  }

  function categoryGroups(surface: "mobile" | "desktop") {
    return categories.map((category) => {
      const programs = groups.get(category) ?? [];
      return (
        <CategoryProgramGroup
          key={`${surface}-${category}`}
          category={category}
          programs={programs}
          selectedId={selectedId}
          open={openCategory === category}
          onToggle={() => setOpenCategory((current) => current === category ? undefined : category)}
        />
      );
    });
  }

  function programList(surface: "mobile" | "desktop") {
    return categories.length ? <div className="space-y-2">{categoryGroups(surface)}</div> : null;
  }

  const voteBox = votingPrograms.length ? (
    <VotingProgramCarousel programs={votingPrograms} selectedId={selectedId} activeIndex={activeVotingIndex} onMove={moveVotingProgram} />
  ) : null;

  return (
    <div className="flex flex-col px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:px-3 lg:py-8">
      <ResponsiveSectionNavigation
        eyebrow={<UiText>{"프로그램"}</UiText>}
        label={<UiText>{selectedProgram?.name ?? "프로그램 없음"}</UiText>}
        meta={selectedProgram ? <UiText>{selectedProgram.votingEndsAt ? "투표 중" : selectedProgram.status === "active" ? "진행 중" : "종료"}</UiText> : undefined}
      >
        <div className="mb-3 px-2">
          <strong className="text-xs font-bold text-[var(--muted)]"><UiText>{"프로그램 선택"}</UiText></strong>
        </div>
        <UiNav aria-label="프로그램 선택 모바일">
          <div className="space-y-4">
            {programList("mobile")}
            {voteBox}
          </div>
        </UiNav>
      </ResponsiveSectionNavigation>

      <div className="hidden min-h-0 flex-1 flex-col lg:flex">
        <div className="mb-4 shrink-0 px-2">
          <h2 className="text-sm font-bold tracking-[-0.02em]"><UiText>{"프로그램"}</UiText></h2>
        </div>
        <UiNav aria-label="프로그램 선택" className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {programList("desktop")}
          </div>
          {voteBox ? <div className="mt-4 shrink-0">{voteBox}</div> : null}
        </UiNav>
      </div>
    </div>
  );
}
