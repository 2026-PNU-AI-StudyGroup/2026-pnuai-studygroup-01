"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { UiNav } from "@/modules/translation/ui/localized-elements";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import type { ProgramIconKey } from "@/modules/project-program/domain/program-icon";
import { ResponsiveSectionNavigation } from "@/shared/ui/responsive-section-navigation";
import { ProgramIcon } from "@/shared/ui/program-icon";
import styles from "@/app/topics/_components/program-sidebar.module.css";

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

function ProgramMark({ icon }: { icon: ProgramIconKey }) {
  return (
    <span aria-hidden="true" data-program-mark className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-white text-[var(--primary)]">
      <ProgramIcon icon={icon} className="size-[1.15rem]" />
    </span>
  );
}

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
  const selected = programs.some((program) => program.id === selectedId);
  const currentProgram = programs[currentIndex];

  return (
    <section id={carouselId} aria-roledescription="carousel" aria-label="투표 진행 프로그램" className={`relative overflow-hidden rounded-xl border p-3.5 text-white ${selected ? "border-[var(--primary)] bg-[var(--primary)] shadow-[var(--shadow-admin-panel)]" : "border-[#244cc4] bg-[#2F5BEA]"}`}>
      <span aria-hidden="true" className="absolute -right-7 -top-8 size-24 rounded-full border border-white/15" />
      <span aria-hidden="true" className="absolute -right-2 -top-2 size-12 rounded-full bg-white/10" />
      <div className="relative">
        <div className="flex min-h-6 items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-1 text-[0.62rem] font-black tracking-[0.08em]">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-3.5 fill-none stroke-current stroke-[1.8]"><path d="M5 4.5h10M5 10h10M5 15.5h6" strokeLinecap="round" /><circle cx="3.5" cy="4.5" r=".65" fill="currentColor" /><circle cx="3.5" cy="10" r=".65" fill="currentColor" /><circle cx="3.5" cy="15.5" r=".65" fill="currentColor" /></svg>
            <UiText>{"투표 진행 중"}</UiText>
          </span>
          <p key={`deadline-${currentProgram.id}`} className={`${styles.destinationText} text-right text-[0.65rem] font-semibold text-white/85`}><UiText>{"마감"}</UiText> <UiDate value={currentProgram.votingEndsAt!} mode="dateTime" /></p>
        </div>
        <div key={currentProgram.id} className={`mt-3 ${styles.destinationText}`}>
          <div className="flex min-w-0 items-center gap-2.5">
            <span data-program-mark aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-[var(--primary)]">
              <ProgramIcon icon={currentProgram.icon} className="size-[1.15rem]" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black tracking-[-0.02em]"><UiText>{currentProgram.name}</UiText></h3>
              <p className="mt-0.5 truncate text-[0.68rem] font-semibold text-white/75"><UiText>{currentProgram.category}</UiText></p>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <Link href={currentProgram.href} aria-current={currentProgram.id === selectedId ? "page" : undefined} className="inline-flex min-h-9 w-full items-center justify-center rounded-lg bg-white px-2 text-xs font-black text-[var(--primary)] transition-colors hover:bg-[#edf2ff]">
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
    </section>
  );
}

function YearProgramGroup({
  year,
  programs,
  selectedId,
  open,
  onToggle,
}: {
  year: number;
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
        className="flex min-h-10 w-full cursor-pointer items-center justify-between rounded-lg px-2 text-xs font-bold text-[var(--ink)] hover:bg-[var(--surface-subtle)]"
      >
        <span>{year}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`size-4 fill-none stroke-[var(--muted)] stroke-[1.7] transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
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
          <ul className={`space-y-1 pt-1 transition-opacity duration-150 motion-reduce:transition-none ${open ? "opacity-100 delay-75" : "opacity-0"}`}>
            {programs.map((program) => {
              const selected = program.id === selectedId;
              const votingOpen = Boolean(program.votingEndsAt);
              const rowClassName = `relative flex min-h-[4.1rem] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                selected ? "bg-[var(--primary-subtle)] text-[var(--primary)] before:absolute before:-left-3 before:inset-y-0 before:w-0.5 before:bg-[var(--primary)]" : "hover:bg-[var(--surface-subtle)]"
              }`;
              const rowContent = (
                <>
                  <ProgramMark icon={program.icon} />
                  <span className="min-w-0">
                    <strong className="block truncate text-[0.8rem] font-black"><UiText>{program.name}</UiText></strong>
                    <span className="mt-1 flex items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[0.62rem] font-black ${
                        votingOpen ? "bg-[var(--primary-subtle)] text-[var(--primary)]" : program.status === "active" ? "bg-[var(--success-subtle)] text-[var(--success)]" : "bg-[var(--surface-subtle)] text-[var(--muted)]"
                      }`}>
                        <UiText>{votingOpen ? "투표 중" : program.status === "active" ? "진행 중" : "종료"}</UiText>
                      </span>
                      <span className="truncate text-[0.64rem] font-semibold text-[var(--muted)]"><UiText>{program.category}</UiText></span>
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
    const key = item.startYear;
    const group = result.get(key) ?? [];
    group.push(item);
    result.set(key, group);
    return result;
  }, new Map<number, ProgramSidebarItem[]>());
  const years = [...groups.keys()].sort((a, b) => b - a);
  const yearsKey = years.join(":");
  const selectedYear = items.find((item) => item.id === selectedId)?.startYear;
  const selectedProgram = items.find((item) => item.id === selectedId);
  const [openYear, setOpenYear] = useState<number | undefined>(selectedYear ?? years[0]);
  const [activeVotingIndex, setActiveVotingIndex] = useState(0);
  const [votingTimerRevision, setVotingTimerRevision] = useState(0);
  const [previousSelectedYear, setPreviousSelectedYear] = useState(selectedYear);
  const [previousYearsKey, setPreviousYearsKey] = useState(yearsKey);

  if (selectedYear !== previousSelectedYear || yearsKey !== previousYearsKey) {
    setPreviousSelectedYear(selectedYear);
    setPreviousYearsKey(yearsKey);
    if (selectedYear !== undefined) {
      setOpenYear(selectedYear);
    } else if ((openYear !== undefined && !years.includes(openYear)) || (!previousYearsKey && years.length)) {
      setOpenYear(years[0]);
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

  function yearGroups(surface: "mobile" | "desktop") {
    return years.map((year) => {
      const programs = groups.get(year) ?? [];
      return (
        <YearProgramGroup
          key={`${surface}-${year}`}
          year={year}
          programs={programs}
          selectedId={selectedId}
          open={openYear === year}
          onToggle={() => setOpenYear((current) => current === year ? undefined : year)}
        />
      );
    });
  }

  function navigationContent(surface: "mobile" | "desktop") {
    return (
      <div className="space-y-4">
        {votingPrograms.length ? (
          <VotingProgramCarousel programs={votingPrograms} selectedId={selectedId} activeIndex={activeVotingIndex} onMove={moveVotingProgram} />
        ) : null}
        {years.length ? <div className="space-y-2">{yearGroups(surface)}</div> : null}
      </div>
    );
  }

  return (
    <div className="px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:px-3 lg:py-8">
      <ResponsiveSectionNavigation
        eyebrow={<UiText>{"프로그램"}</UiText>}
        label={<UiText>{selectedProgram?.name ?? "프로그램 없음"}</UiText>}
        meta={selectedProgram ? <UiText>{selectedProgram.votingEndsAt ? "투표 중" : selectedProgram.status === "active" ? "진행 중" : "종료"}</UiText> : undefined}
      >
        <div className="mb-3 px-2">
          <strong className="text-xs font-black text-[var(--muted)]"><UiText>{"프로그램 선택"}</UiText></strong>
        </div>
        <UiNav aria-label="프로그램 선택 모바일">
          {navigationContent("mobile")}
        </UiNav>
      </ResponsiveSectionNavigation>

      <div className="hidden lg:block">
        <div className="mb-4 px-2">
          <h2 className="text-sm font-black tracking-[-0.02em]"><UiText>{"프로그램"}</UiText></h2>
        </div>
        <UiNav aria-label="프로그램 선택">
          {navigationContent("desktop")}
        </UiNav>
      </div>
    </div>
  );
}
