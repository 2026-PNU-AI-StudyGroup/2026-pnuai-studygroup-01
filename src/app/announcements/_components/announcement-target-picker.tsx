"use client";

import { useMemo, useState } from "react";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useI18n } from "@/shared/i18n/i18n-provider";

type Program = { id: string; name: string };
type Team = { id: string; name: string; programId: string };

function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0 fill-none stroke-[var(--muted)] stroke-[1.5] [stroke-linejoin:round]">
      {open
        ? <path d="M2.5 6.5 3.7 5h3l1.5 1.5H16v1H4.3L2.8 13.5H2.5zM4.3 8.5H17l-1.6 6H2.7z" />
        : <path d="M2.8 5.8A.8.8 0 0 1 3.6 5h3l1.5 1.5h7.3a.8.8 0 0 1 .8.8v6.9a.8.8 0 0 1-.8.8H3.6a.8.8 0 0 1-.8-.8z" />}
    </svg>
  );
}

function Dot({ checked }: { checked: boolean }) {
  return (
    <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${checked ? "border-[var(--primary)]" : "border-[var(--field-border)]"}`}>
      {checked ? <span className="size-2 rounded-full bg-[var(--primary)]" /> : null}
    </span>
  );
}

// 파일 시스템 트리형 공지 대상 선택. 프로그램=폴더(펼치면 하위 팀), 팀=리프. 전체/프로그램/팀 중 하나만 선택.
export function AnnouncementTargetPicker({ programs, teams, value, onValueChange }: {
  programs: Program[];
  teams: Team[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const teamsByProgram = useMemo(() => {
    const map = new Map<string, Team[]>();
    for (const team of teams) {
      const list = map.get(team.programId) ?? [];
      list.push(team);
      map.set(team.programId, list);
    }
    return map;
  }, [teams]);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (value.startsWith("program:")) return new Set([value.slice(8)]);
    if (value.startsWith("team:")) {
      const team = teams.find((candidate) => candidate.id === value.slice(5));
      if (team) return new Set([team.programId]);
    }
    return new Set();
  });
  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const leafClass = (checked: boolean) => `flex min-h-10 w-full items-center gap-2 rounded-[var(--radius-control)] px-2 text-left text-sm transition-colors ${checked ? "bg-[var(--primary-subtle)] font-semibold text-[var(--primary)]" : "text-[var(--ink)] hover:bg-[var(--surface-subtle)]"}`;

  return (
    <div>
      <input type="hidden" name="target" value={value} />
      <div role="radiogroup" aria-label={t("공지 대상")} className="max-h-80 overflow-auto rounded-[var(--radius-control)] border border-[var(--field-border)] bg-[var(--surface)] p-1.5">
        <button type="button" role="radio" aria-checked={value === ""} onClick={() => onValueChange("")} className={leafClass(value === "")}>
          <Dot checked={value === ""} />
          <span><UiText>{"전체 공개"}</UiText></span>
        </button>
        {programs.map((program) => {
          const programTeams = teamsByProgram.get(program.id) ?? [];
          const open = expanded.has(program.id);
          const programValue = `program:${program.id}`;
          return (
            <div key={program.id}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => toggle(program.id)}
                className="flex min-h-10 w-full items-center gap-1.5 rounded-[var(--radius-control)] px-2 text-left text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--surface-subtle)]"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" className={`size-3.5 shrink-0 fill-none stroke-[var(--muted)] stroke-[1.8] transition-transform [stroke-linecap:round] [stroke-linejoin:round] ${open ? "rotate-90" : ""}`}><path d="m8 5 4 5-4 5" /></svg>
                <FolderIcon open={open} />
                <span className="min-w-0 flex-1 truncate">{program.name}</span>
                <span className="shrink-0 rounded-full bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[0.6875rem] font-bold tabular-nums text-[var(--muted)]">{programTeams.length}</span>
              </button>
              {open ? (
                <div className="ml-[1.05rem] border-l border-[var(--line)] pl-2">
                  <button type="button" role="radio" aria-checked={value === programValue} onClick={() => onValueChange(programValue)} className={leafClass(value === programValue)}>
                    <Dot checked={value === programValue} />
                    <span className="italic"><UiText>{"이 프로그램 전체"}</UiText></span>
                  </button>
                  {programTeams.map((team) => {
                    const teamValue = `team:${team.id}`;
                    return (
                      <button key={team.id} type="button" role="radio" aria-checked={value === teamValue} onClick={() => onValueChange(teamValue)} className={leafClass(value === teamValue)}>
                        <Dot checked={value === teamValue} />
                        <span className="min-w-0 flex-1 truncate">{team.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
