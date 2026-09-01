"use client";

import { useMemo, useState } from "react";

import type { ProgramScoreboardRow } from "@/modules/rubric/infrastructure/prisma-program-scoreboard-query";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiDiv } from "@/modules/translation/ui/localized-elements";
import { EmptyState } from "@/shared/ui/page-primitives";

type SortKey = "combined" | "staff" | "advisor" | "vote" | "team";

const SORT_LABEL: Record<SortKey, string> = {
  combined: "합계",
  staff: "내부 심사",
  advisor: "자문 평균",
  vote: "득표",
  team: "팀",
};

export function ProgramScoreboardPanel({ programName, rows }: {
  programName: string;
  rows: ProgramScoreboardRow[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("combined");
  const advisorColumns = useMemo(() => {
    const columns = new Map<string, string>();
    for (const row of rows) for (const score of row.advisorScores) columns.set(score.advisorId, score.advisorName);
    return [...columns.entries()].sort((left, right) => left[1].localeCompare(right[1], "ko"));
  }, [rows]);
  const ranked = useMemo(() => sortRows(rows, sortKey), [rows, sortKey]);

  if (rows.length === 0) {
    return <EmptyState variant="section" title="팀이 없습니다" description="팀이 확정되면 집계표가 채워집니다." />;
  }

  return (
    <div className="grid gap-4">
      <UiDiv role="group" aria-label={"집계 기준"} className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-[var(--muted)]"><UiText>{"줄 세우는 기준"}</UiText></span>
        <div className="inline-flex flex-wrap rounded-[var(--radius-control)] bg-[var(--surface-subtle)] p-1">
          {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={sortKey === key}
              onClick={() => setSortKey(key)}
              className={`min-h-9 rounded-lg px-3 text-xs font-bold transition-colors ${
                sortKey === key ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              <UiText>{SORT_LABEL[key]}</UiText>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => downloadCsv(programName, ranked, advisorColumns)} className="button-secondary ml-auto min-h-9 px-3 text-xs">
          <UiText>{"CSV 내려받기"}</UiText>
        </button>
      </UiDiv>

      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full min-w-max border-collapse text-sm">
          <caption className="px-4 py-3 text-left text-xs text-[var(--muted)]">
            <UiText>{"합계는 내부 심사 총점에 자문위원 평균을 더한 값입니다. 순위는 고른 기준을 따릅니다."}</UiText>
          </caption>
          <thead>
            <tr className="border-y border-[var(--line)] bg-[var(--surface-subtle)] text-left">
              <th scope="col" className="w-12 px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]"><UiText>{"순위"}</UiText></th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-[var(--muted)]"><UiText>{"팀"}</UiText></th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-[var(--muted)]"><UiText>{"프로젝트"}</UiText></th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-[var(--muted)]"><UiText>{"분과"}</UiText></th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]"><UiText>{"내부 심사"}</UiText></th>
              {advisorColumns.map(([advisorId, advisorName]) => (
                <th key={advisorId} scope="col" className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">{advisorName}</th>
              ))}
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]"><UiText>{"자문 평균"}</UiText></th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]"><UiText>{"득표"}</UiText></th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]"><UiText>{"합계"}</UiText></th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row, index) => {
              const scoreByAdvisor = new Map(row.advisorScores.map((score) => [score.advisorId, score.total]));
              return (
                <tr key={row.teamId} className="border-t border-[var(--line)] first:border-t-0">
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-[var(--muted)]">{index + 1}</td>
                  <th scope="row" className="px-4 py-3 text-left font-semibold text-[var(--ink)]">
                    {row.teamName}
                    {row.staffScorerNames.length ? (
                      <span className="mt-0.5 block text-xs font-normal text-[var(--muted)]">{row.staffScorerNames.join(", ")}</span>
                    ) : null}
                  </th>
                  <td className="max-w-[22rem] truncate px-4 py-3 text-[var(--muted)]" title={row.projectTitle}><UiText>{row.projectTitle}</UiText></td>
                  <td className="px-4 py-3 text-[var(--muted)]"><UiText>{row.divisionName ?? "미분과"}</UiText></td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.staffTotal ?? "–"}</td>
                  {advisorColumns.map(([advisorId]) => (
                    <td key={advisorId} className="px-4 py-3 text-right tabular-nums">{scoreByAdvisor.get(advisorId) ?? "–"}</td>
                  ))}
                  <td className="px-4 py-3 text-right tabular-nums">{row.advisorAverage === null ? "–" : row.advisorAverage.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.voteCount}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-[var(--primary)]">{combinedScore(row).toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function combinedScore(row: ProgramScoreboardRow): number {
  return (row.staffTotal ?? 0) + (row.advisorAverage ?? 0);
}

export function sortRows(rows: ProgramScoreboardRow[], key: SortKey): ProgramScoreboardRow[] {
  const byName = (left: ProgramScoreboardRow, right: ProgramScoreboardRow) => left.teamName.localeCompare(right.teamName, "ko");
  if (key === "team") return [...rows].sort(byName);
  const value = (row: ProgramScoreboardRow) => {
    if (key === "staff") return row.staffTotal ?? -1;
    if (key === "advisor") return row.advisorAverage ?? -1;
    if (key === "vote") return row.voteCount;
    return combinedScore(row);
  };
  return [...rows].sort((left, right) => value(right) - value(left) || byName(left, right));
}

function downloadCsv(programName: string, rows: ProgramScoreboardRow[], advisorColumns: Array<[string, string]>) {
  const header = ["순위", "팀", "프로젝트", "분과", "내부 심사", "채점자", ...advisorColumns.map(([, name]) => name), "자문 평균", "득표", "합계"];
  const lines = rows.map((row, index) => {
    const scoreByAdvisor = new Map(row.advisorScores.map((score) => [score.advisorId, score.total]));
    return [
      index + 1,
      row.teamName,
      row.projectTitle,
      row.divisionName ?? "미분과",
      row.staffTotal ?? "",
      row.staffScorerNames.join(" "),
      ...advisorColumns.map(([advisorId]) => scoreByAdvisor.get(advisorId) ?? ""),
      row.advisorAverage === null ? "" : row.advisorAverage.toFixed(1),
      row.voteCount,
      combinedScore(row).toFixed(1),
    ];
  });
  // 엑셀이 UTF-8 로 열도록 BOM 을 앞에 둔다. 없으면 한글이 깨진다.
  const csv = `﻿${[header, ...lines].map((cells) => cells.map(csvCell).join(",")).join("\r\n")}\r\n`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${programName}-집계표.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
