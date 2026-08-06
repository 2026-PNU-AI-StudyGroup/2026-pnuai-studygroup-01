"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { ProgramIconKey } from "@/modules/project-program/domain/program-icon";
import { ResponsiveSectionNavigation } from "@/shared/ui/responsive-section-navigation";
import { ProgramIcon } from "@/shared/ui/program-icon";

export type ProgramSidebarItem = {
  id: string;
  name: string;
  category: string;
  icon: ProgramIconKey;
  startYear: number;
  status: "active" | "past";
  href: string;
};

function ProgramMark({ icon }: { icon: ProgramIconKey }) {
  return (
    <span aria-hidden="true" data-program-mark className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-white text-[var(--primary)]">
      <ProgramIcon icon={icon} className="size-[1.15rem]" />
    </span>
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
                        program.status === "active" ? "bg-[var(--success-subtle)] text-[var(--success)]" : "bg-[var(--surface-subtle)] text-[var(--muted)]"
                      }`}>
                        <UiText>{program.status === "active" ? "진행 중" : "종료"}</UiText>
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

  return (
    <div className="px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:px-3 lg:py-8">
      <ResponsiveSectionNavigation
        eyebrow={<UiText>{"프로그램"}</UiText>}
        label={<UiText>{selectedProgram?.name ?? "프로그램 없음"}</UiText>}
        meta={selectedProgram ? <UiText>{selectedProgram.status === "active" ? "진행 중" : "종료"}</UiText> : undefined}
      >
        <div className="mb-3 px-2">
          <strong className="text-xs font-black text-[var(--muted)]"><UiText>{"프로그램 선택"}</UiText></strong>
        </div>
        <UiNav aria-label="프로그램 선택 모바일">
          <div className="space-y-2">{yearGroups("mobile")}</div>
        </UiNav>
      </ResponsiveSectionNavigation>

      <div className="hidden lg:block">
        <div className="mb-4 px-2">
          <h2 className="text-sm font-black tracking-[-0.02em]"><UiText>{"프로그램"}</UiText></h2>
        </div>
        <UiNav aria-label="프로그램 선택">
          <div className="space-y-2">{yearGroups("desktop")}</div>
        </UiNav>
      </div>
    </div>
  );
}
