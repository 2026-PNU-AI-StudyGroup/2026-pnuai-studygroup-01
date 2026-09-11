"use client";

import { useActionState, useMemo, useState } from "react";

import { saveProgramTeamResultsAction } from "@/app/topics/_management/program-actions";
import { initialProgramActionState } from "@/app/topics/_management/program-form-state";
import type { ProgramScoreboardRow } from "@/modules/rubric/infrastructure/prisma-program-scoreboard-query";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { EmptyState } from "@/shared/ui/page-primitives";
import { TextInput } from "@/shared/ui/form-system";

type SortKey = "combined" | "staff" | "advisor" | "vote" | "team";

export function ProgramScoreboardPanel({ programId, programName, rows }: {
  programId: string;
  programName: string;
  rows: ProgramScoreboardRow[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("combined");
  const [resultState, saveResults, savingResults] = useActionState(saveProgramTeamResultsAction, initialProgramActionState);
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
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-[var(--muted)]"><UiText>{"열 이름을 눌러 줄을 세웁니다. 합계는 내부 심사 총점에 자문위원 평균을 더한 값입니다."}</UiText></p>
        <button type="button" onClick={() => downloadCsv(programName, ranked, advisorColumns)} className="button-secondary ml-auto min-h-9 px-3 text-xs">
          <UiText>{"CSV 내려받기"}</UiText>
        </button>
      </div>

      {/* 상은 이 표를 보고 정한다. 입력칸을 같은 표에 두면 팀 이름을 옮겨 적을 일이 없다. */}
      <form action={saveResults}>
      <input type="hidden" name="programId" value={programId} />
      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-subtle)] text-left">
              <th scope="col" className="w-12 px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]"><UiText>{"순위"}</UiText></th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-[var(--muted)]"><UiText>{"번호"}</UiText></th>
              <SortHeader label="팀" columnKey="team" sortKey={sortKey} onSort={setSortKey} />
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-[var(--muted)]"><UiText>{"프로젝트"}</UiText></th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-[var(--muted)]"><UiText>{"분과"}</UiText></th>
              <SortHeader label="내부 심사" columnKey="staff" sortKey={sortKey} onSort={setSortKey} align="right" />
              {advisorColumns.map(([advisorId, advisorName]) => (
                <th key={advisorId} scope="col" className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">{advisorName}</th>
              ))}
              <SortHeader label="자문 평균" columnKey="advisor" sortKey={sortKey} onSort={setSortKey} align="right" />
              <SortHeader label="득표" columnKey="vote" sortKey={sortKey} onSort={setSortKey} align="right" />
              <SortHeader label="합계" columnKey="combined" sortKey={sortKey} onSort={setSortKey} align="right" />
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-[var(--muted)]"><UiText>{"수상"}</UiText></th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row, index) => {
              const scoreByAdvisor = new Map(row.advisorScores.map((score) => [score.advisorId, score.total]));
              return (
                <tr key={row.teamId} className="border-t border-[var(--line)] first:border-t-0">
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-[var(--muted)]">{index + 1}</td>
                  <td className="px-4 py-2">
                    <TextInput
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={9999}
                      name={`number:${row.teamId}`}
                      defaultValue={row.teamNumber ?? ""}
                      aria-label={`${row.teamName} 팀 번호`}
                      className="w-20 text-right tabular-nums"
                    />
                  </td>
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
                  <td className="px-4 py-2">
                    <TextInput
                      name={`award:${row.teamId}`}
                      defaultValue={row.award ?? ""}
                      maxLength={60}
                      placeholder="예: 대상"
                      aria-label={`${row.teamName} 수상 내역`}
                      className="min-w-40"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="text-xs text-[var(--muted)]">
          <UiText>{"번호는 지난 프로젝트 목록의 차례가 됩니다. 상 이름은 그대로 배지에 찍히고, 한 팀이 둘 받으면 가운뎃점으로 잇습니다. 인기상은 득표에서 자동으로 붙으므로 적지 않습니다."}</UiText>
        </p>
        {resultState.message ? (
          <p role={resultState.status === "error" ? "alert" : "status"} aria-live="polite" className={`text-xs ${resultState.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
            {resultState.message}
          </p>
        ) : null}
        <button type="submit" className="button-primary ml-auto min-h-9 px-3 text-xs" disabled={savingResults}>
          <UiText>{savingResults ? "저장 중" : "번호·수상 저장"}</UiText>
        </button>
      </div>
      </form>
    </div>
  );
}

/**
 * 줄 세우기는 열 이름 자체가 단추다.
 *
 * 따로 기준 고르는 단추 줄을 두었더니 눌러도 표가 그대로인 열(값이 다 비어 있는 열)에서
 * 아무 일도 안 일어난 것처럼 보였다. 열에 화살표를 붙이면 무엇으로 세웠는지가 표 안에서
 * 바로 보이고, 엑셀에서 하던 동작과도 같다.
 */
function SortHeader({ label, columnKey, sortKey, onSort, align = "left" }: {
  label: string;
  columnKey: SortKey;
  sortKey: SortKey;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sortKey === columnKey;
  return (
    <th
      scope="col"
      aria-sort={active ? (columnKey === "team" ? "ascending" : "descending") : "none"}
      className={`px-4 py-3 text-xs font-semibold ${align === "right" ? "text-right" : "text-left"} ${active ? "text-[var(--primary)]" : "text-[var(--muted)]"}`}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex min-h-8 items-center gap-1 font-semibold hover:text-[var(--ink)] ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        <UiText>{label}</UiText>
        <svg aria-hidden="true" viewBox="0 0 12 12" className={`size-3 shrink-0 fill-current ${active ? "" : "opacity-25"}`}>
          {active && columnKey === "team" ? <path d="M6 2 10 8H2z" /> : <path d="M6 10 2 4h8z" />}
        </svg>
      </button>
    </th>
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

export function buildScoreboardCsv(rows: ProgramScoreboardRow[], advisorColumns: Array<[string, string]>): string {
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
  return `﻿${[header, ...lines].map((cells) => cells.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

function downloadCsv(programName: string, rows: ProgramScoreboardRow[], advisorColumns: Array<[string, string]>) {
  const url = URL.createObjectURL(new Blob([buildScoreboardCsv(rows, advisorColumns)], { type: "text/csv;charset=utf-8" }));
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
