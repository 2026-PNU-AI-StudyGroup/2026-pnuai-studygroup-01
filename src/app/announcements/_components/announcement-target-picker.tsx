"use client";

import { useMemo, useState } from "react";

import { UiText } from "@/modules/translation/ui/i18n-provider";

type Program = { id: string; name: string };
type Team = { id: string; name: string; programId: string };

function Dot({ checked }: { checked: boolean }) {
  return (
    <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${checked ? "border-[var(--primary)]" : "border-[var(--field-border)]"}`}>
      {checked ? <span className="size-2 rounded-full bg-[var(--primary)]" /> : null}
    </span>
  );
}

// 공지 대상 선택. 프로그램을 접었다 펼쳐 하위 팀을 고른다. 전체/프로그램/팀 중 하나만 선택.
export function AnnouncementTargetPicker({ programs, teams, initialValue = "" }: {
  programs: Program[];
  teams: Team[];
  initialValue?: string;
}) {
  const teamsByProgram = useMemo(() => {
    const map = new Map<string, Team[]>();
    for (const team of teams) {
      const list = map.get(team.programId) ?? [];
      list.push(team);
      map.set(team.programId, list);
    }
    return map;
  }, [teams]);
  const [selected, setSelected] = useState(initialValue);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (initialValue.startsWith("team:")) {
      const team = teams.find((candidate) => candidate.id === initialValue.slice(5));
      if (team) return new Set([team.programId]);
    }
    return new Set();
  });
  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const rowClass = "flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-sm transition-colors hover:bg-[var(--surface-subtle)]";

  return (
    <div>
      <input type="hidden" name="target" value={selected} />
      <div role="radiogroup" aria-label="공지 대상" className="max-h-72 overflow-auto rounded-[var(--radius-control)] border border-[var(--field-border)] bg-[var(--surface)] py-1">
        <button type="button" role="radio" aria-checked={selected === ""} onClick={() => setSelected("")} className={rowClass}>
          <Dot checked={selected === ""} />
          <span className="font-semibold"><UiText>{"전체 공개"}</UiText></span>
        </button>
        {programs.map((program) => {
          const programTeams = teamsByProgram.get(program.id) ?? [];
          const open = expanded.has(program.id);
          const value = `program:${program.id}`;
          return (
            <div key={program.id} className="border-t border-[var(--line)]">
              <div className="flex items-center">
                {programTeams.length ? (
                  <button type="button" aria-label="하위 팀 보기" aria-expanded={open} onClick={() => toggle(program.id)} className="grid size-8 shrink-0 place-items-center text-[var(--muted)] hover:text-[var(--ink)]">
                    <svg aria-hidden="true" viewBox="0 0 20 20" className={`size-4 fill-none stroke-current stroke-[1.8] transition-transform ${open ? "rotate-90" : ""}`}><path d="m8 6 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                ) : <span className="size-8 shrink-0" />}
                <button type="button" role="radio" aria-checked={selected === value} onClick={() => setSelected(value)} className={`${rowClass} pl-0`}>
                  <Dot checked={selected === value} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{program.name}</span>
                  {programTeams.length ? <span className="shrink-0 text-xs text-[var(--muted)]">{programTeams.length}<UiText>{"팀"}</UiText></span> : null}
                </button>
              </div>
              {open ? programTeams.map((team) => {
                const teamValue = `team:${team.id}`;
                return (
                  <button key={team.id} type="button" role="radio" aria-checked={selected === teamValue} onClick={() => setSelected(teamValue)} className={`${rowClass} border-t border-[var(--line)] pl-11`}>
                    <Dot checked={selected === teamValue} />
                    <span className="min-w-0 flex-1 truncate">{team.name}</span>
                  </button>
                );
              }) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
