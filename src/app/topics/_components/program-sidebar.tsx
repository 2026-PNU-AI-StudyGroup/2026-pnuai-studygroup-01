"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

export type ProgramSidebarItem = {
  id: string;
  name: string;
  category: string;
  academicYear: number;
  status: "active" | "past";
  href: string;
};

function ProgramMark({ value }: { value: string }) {
  const variant = [...value].reduce((total, character) => total + character.charCodeAt(0), 0) % 3;
  const paths = [
    <path key="trophy" d="M8 5h8v3.5c0 3-1.6 5.2-4 5.2S8 11.5 8 8.5V5Zm0 2H5.5v1.3c0 2 1.2 3.2 3 3.2M16 7h2.5v1.3c0 2-1.2 3.2-3 3.2M12 14v3m-3 2h6" />,
    <path key="spark" d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Zm6 12 .7 2.3L21 18l-2.3.7L18 21l-.7-2.3L15 18l2.3-.7L18 15Z" />,
    <path key="cube" d="m12 3 7 4-7 4-7-4 7-4Zm-7 4v9l7 4 7-4V7m-7 4v9" />,
  ];
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-white text-[var(--primary)]">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.15rem] fill-none stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]">
        {paths[variant]}
      </svg>
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
              return (
                <li key={`${program.status}-${program.id}`}>
                  <Link
                    href={program.href}
                    aria-current={selected ? "page" : undefined}
                    tabIndex={open ? undefined : -1}
                    className={`relative flex min-h-[4.1rem] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      selected ? "bg-[var(--primary-subtle)] text-[var(--primary)] before:absolute before:-left-3 before:inset-y-0 before:w-0.5 before:bg-[var(--primary)]" : "hover:bg-[var(--surface-subtle)]"
                    }`}
                  >
                    <ProgramMark value={program.id} />
                    <span className="min-w-0">
                      <strong className="block truncate text-[0.8rem] font-bold"><UiText>{program.name}</UiText></strong>
                      <span className="mt-1 flex items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[0.62rem] font-bold ${
                          program.status === "active" ? "bg-[var(--success-subtle)] text-[var(--success)]" : "bg-[var(--surface-subtle)] text-[var(--muted)]"
                        }`}>
                          <UiText>{program.status === "active" ? "진행 중" : "종료"}</UiText>
                        </span>
                        <span className="truncate text-[0.64rem] font-semibold text-[var(--muted)]"><UiText>{program.category}</UiText></span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function ProgramSidebar({ items, selectedId, allHref }: {
  items: ProgramSidebarItem[];
  selectedId?: string;
  allHref: string;
}) {
  const groups = items.reduce((result, item) => {
    const key = item.academicYear;
    const group = result.get(key) ?? [];
    group.push(item);
    result.set(key, group);
    return result;
  }, new Map<number, ProgramSidebarItem[]>());
  const years = [...groups.keys()].sort((a, b) => b - a);
  const selectedYear = items.find((item) => item.id === selectedId)?.academicYear;
  const [openYear, setOpenYear] = useState<number | undefined>(selectedYear ?? years[0]);
  const [previousSelectedYear, setPreviousSelectedYear] = useState(selectedYear);

  if (selectedYear !== previousSelectedYear) {
    setPreviousSelectedYear(selectedYear);
    if (selectedYear !== undefined) {
      setOpenYear(selectedYear);
    }
  }

  return (
    <div className="px-4 py-5 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:px-3 lg:py-8">
      <div className="mb-4 flex items-center justify-between px-2">
        <h2 className="text-sm font-bold tracking-[-0.02em]"><UiText>{"프로그램"}</UiText></h2>
        <Link href={allHref} className="text-[0.7rem] font-bold text-[var(--primary)]"><UiText>{"전체 보기"}</UiText></Link>
      </div>

      <UiNav aria-label="프로그램 선택">
        <div className="space-y-2">
          {years.map((year) => {
            const programs = groups.get(year) ?? [];
            return (
              <YearProgramGroup
                key={year}
                year={year}
                programs={programs}
                selectedId={selectedId}
                open={openYear === year}
                onToggle={() => setOpenYear((current) => current === year ? undefined : year)}
              />
            );
          })}
        </div>

      </UiNav>
    </div>
  );
}
