"use client";

import { useActionState, useMemo, useState, useTransition } from "react";

import { saveProgramTeamResultsAction, saveScoreboardWeightAction } from "@/app/topics/_management/program-actions";
import { initialProgramActionState } from "@/app/topics/_management/program-form-state";
import type { ProgramScoreboardRow } from "@/modules/rubric/infrastructure/prisma-program-scoreboard-query";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { cardClass, CardHead, Missing } from "@/modules/project-program/ui/work-screen";
import { TextInput } from "@/shared/ui/form-system";

type SortKey = "combined" | "staff" | "advisor" | "vote" | "team";

export function ProgramScoreboardPanel({ programId, programName, rows, staffWeight = 50 }: {
  programId: string;
  programName: string;
  rows: ProgramScoreboardRow[];
  /** 환산 점수에서 내부 심사 비율(%). 나머지는 자문위원 평균이다. */
  staffWeight?: number;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("combined");
  const [resultState, saveResults, savingResults] = useActionState(saveProgramTeamResultsAction, initialProgramActionState);
  const advisorColumns = useMemo(() => advisorColumnsOf(rows), [rows]);
  const ranked = useMemo(() => sortRows(rows, sortKey, staffWeight), [rows, sortKey, staffWeight]);
  const ranks = useMemo(() => divisionRanks(ranked, staffWeight), [ranked, staffWeight]);

  // 화면의 질문은 "누가 몇 점인가"다. 표 한 장이 카드 전체이고, 열 이름이 정렬 단추다.
  return (
    <section aria-labelledby="scoreboard-title" className={cardClass}>
      <CardHead
        id="scoreboard-title"
        title={<UiText>{"심사 집계"}</UiText>}
        count={<>{rows.length}<UiText>{"팀"}</UiText></>}
        action={rows.length ? (
          <button type="button" onClick={() => downloadCsv(programName, ranked, advisorColumns, staffWeight)} className="button-secondary button-compact min-h-8 px-3 font-medium">
            <UiText>{"CSV 내려받기"}</UiText>
          </button>
        ) : undefined}
      />
      <p className="px-5 pb-3 text-xs text-[var(--muted)]"><UiText>{"내부 채점표, 자문위원 점수, 득표를 한 표로 모읍니다. 열 이름을 눌러 줄을 세웁니다. 환산 점수는 내부 심사와 자문 평균을 각각 만점 대비 100점으로 바꿔 아래 비율로 섞은 값입니다. 채점표를 모두 채점한 점수만 들어가고, 한쪽이 아직 없으면 있는 쪽만으로 냅니다. 득표는 넣지 않습니다. 순위는 분과마다 따로 매깁니다."}</UiText></p>
      <WeightForm programId={programId} staffWeight={staffWeight} />
      {rows.length === 0 ? (
        <div role="status" className="border-t border-[var(--line)] px-5 py-4 text-[0.8125rem]"><p className="font-medium text-[var(--ink)]"><UiText>{"팀이 없습니다"}</UiText></p><p className="mt-0.5 text-[var(--muted)]"><UiText>{"팀이 확정되면 집계표가 채워집니다."}</UiText></p></div>
      ) : <>

      {/* 상은 이 표를 보고 정한다. 입력칸을 같은 표에 두면 팀 이름을 옮겨 적을 일이 없다. */}
      {/* grid·flex 자식은 min-width 가 auto 라 표 너비만큼 늘어난다. 그러면 표 안이 아니라
          페이지가 가로로 밀려 오른쪽 끝 칸이 화면 밖으로 나간다. min-w-0 을 줘야 표가 제자리에서 구른다. */}
      <form action={saveResults} className="min-w-0">
      <input type="hidden" name="programId" value={programId} />
      <div className="min-w-0 overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-[0.8125rem]">
          <thead>
            <tr className="border-t border-[var(--line)] text-left">
              <th scope="col" className="w-12 py-2 pl-5 pr-3 text-right text-xs font-normal text-[var(--muted)]"><UiText>{"순위"}</UiText></th>
              {/* 순위의 근거가 가로 스크롤 밖으로 밀리지 않게 환산 점수를 순위 바로 옆에 둔다. */}
              <SortHeader label="환산 점수" columnKey="combined" sortKey={sortKey} onSort={setSortKey} align="right" />
              <th scope="col" className="px-3 py-2 text-xs font-normal text-[var(--muted)]"><UiText>{"팀 번호"}</UiText></th>
              <SortHeader label="팀" columnKey="team" sortKey={sortKey} onSort={setSortKey} />
              <th scope="col" className="px-3 py-2 text-xs font-normal text-[var(--muted)]"><UiText>{"프로젝트"}</UiText></th>
              <th scope="col" className="px-3 py-2 text-xs font-normal text-[var(--muted)]"><UiText>{"분과"}</UiText></th>
              <SortHeader label="내부 심사" columnKey="staff" sortKey={sortKey} onSort={setSortKey} align="right" />
              {advisorColumns.map(([advisorId, advisorLabel]) => (
                <th key={advisorId} scope="col" className="px-3 py-2 text-right text-xs font-normal text-[var(--muted)]">{advisorLabel}</th>
              ))}
              <SortHeader label="자문 평균" columnKey="advisor" sortKey={sortKey} onSort={setSortKey} align="right" />
              <SortHeader label="득표" columnKey="vote" sortKey={sortKey} onSort={setSortKey} align="right" />
              {/* 표가 넓어 수상 칸이 가로 스크롤 밖으로 밀린다. 오른쪽에 붙여 늘 보이게 한다. */}
              <th scope="col" className="sticky right-0 border-l border-[var(--line)] bg-[var(--surface)] py-2 pl-3 pr-5 text-xs font-normal text-[var(--muted)]"><UiText>{"수상"}</UiText></th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row, index) => {
              const scoreByAdvisor = new Map(row.advisorScores.map((score) => [score.advisorId, score]));
              const combined = combinedScore(row, staffWeight);
              return (
                <tr key={row.teamId} className="border-t border-[var(--line)]">
                  <td className="py-2 pl-5 pr-3 text-right tabular-nums text-[var(--muted)]">{ranks[index] ?? <Missing />}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-[var(--accent-ink)]">{combined === null ? <Missing /> : combined.toFixed(1)}</td>
                  <td className="px-3 py-1.5">
                    <TextInput
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={9999}
                      name={`number:${row.teamId}`}
                      defaultValue={row.teamNumber ?? ""}
                      placeholder="예: 1"
                      aria-label={`${row.teamName} 팀 번호`}
                      className="h-8 min-h-8 w-20 py-0 text-right text-[0.8125rem] tabular-nums"
                    />
                  </td>
                  <th scope="row" className="px-3 py-2 text-left text-sm font-medium text-[var(--ink)]">
                    {row.teamName}
                    {row.staffScorerNames.length ? (
                      <span className="mt-0.5 block text-xs font-normal text-[var(--muted)]">{row.staffScorerNames.join(", ")}</span>
                    ) : null}
                  </th>
                  <td className="max-w-[22rem] truncate px-3 py-2 text-[var(--muted)]" title={row.projectTitle}><UiText>{row.projectTitle}</UiText></td>
                  <td className="px-3 py-2 text-[var(--muted)]"><UiText>{row.divisionName ?? "미분과"}</UiText></td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.staffTotal ?? <Missing />}
                    {row.staffTotal === null && row.staffProgress.scored > 0 ? <Progress text={`${row.staffProgress.scored}/${row.staffProgress.total} 채점`} /> : null}
                  </td>
                  {advisorColumns.map(([advisorId]) => {
                    const cell = scoreByAdvisor.get(advisorId);
                    return (
                      <td key={advisorId} className="px-3 py-2 text-right tabular-nums">
                        {!cell || cell.scoredRubrics === 0 ? <Missing /> : cell.complete ? cell.total : <span className="text-[var(--muted)]">{cell.total}<Progress text="일부, 평균 제외" /></span>}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.advisorAverage === null ? <Missing /> : row.advisorAverage.toFixed(1)}
                    {row.advisorProgress.assigned ? <Progress text={`완료 ${row.advisorProgress.complete}/${row.advisorProgress.assigned}명`} /> : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.voteCount}</td>
                  <td className="sticky right-0 border-l border-[var(--line)] bg-[var(--surface)] py-1.5 pl-3 pr-5">
                    <TextInput
                      name={`award:${row.teamId}`}
                      defaultValue={row.award ?? ""}
                      maxLength={60}
                      placeholder="예: 대상"
                      aria-label={`${row.teamName} 수상 내역`}
                      className="h-8 min-h-8 w-36 py-0 text-[0.8125rem]"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)] px-5 py-3">
        <p className="min-w-0 flex-1 text-xs text-[var(--muted)]">
          <UiText>{"팀 번호는 행사에서 부르는 번호(발표 순서, 부스 번호)이고 비워 둬도 됩니다. 적으면 지난 프로젝트 목록이 이 순서로 정렬됩니다. 상 이름은 그대로 배지에 찍히고, 한 팀이 둘 받으면 가운뎃점으로 잇습니다. 인기상은 득표에서 자동으로 붙으므로 적지 않습니다."}</UiText>
        </p>
        {resultState.message ? (
          <p role={resultState.status === "error" ? "alert" : "status"} aria-live="polite" className={`text-xs ${resultState.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
            {resultState.message}
          </p>
        ) : null}
        <button type="submit" className="button-primary button-compact min-h-8 px-3 font-medium" disabled={savingResults}>
          <UiText>{savingResults ? "저장 중" : "팀 번호와 수상 저장"}</UiText>
        </button>
      </div>
      </form>
      </>}
    </section>
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
      className={`px-3 py-1 text-xs font-normal ${align === "right" ? "text-right" : "text-left"} ${active ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex min-h-8 items-center gap-1 hover:text-[var(--ink)] ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        <UiText>{label}</UiText>
        <svg aria-hidden="true" viewBox="0 0 12 12" className={`size-3 shrink-0 fill-current ${active ? "" : "opacity-25"}`}>
          {active && columnKey === "team" ? <path d="M6 2 10 8H2z" /> : <path d="M6 10 2 4h8z" />}
        </svg>
      </button>
    </th>
  );
}

/** 같은 이름의 위원이 둘이면 열 제목이 같아 구분할 수 없다. 그때만 이메일 앞부분을 붙인다. */
export function advisorColumnsOf(rows: ProgramScoreboardRow[]): Array<[string, string]> {
  const people = new Map<string, { name: string; email: string }>();
  for (const row of rows) for (const score of row.advisorScores) people.set(score.advisorId, { name: score.advisorName, email: score.advisorEmail });
  const nameCount = new Map<string, number>();
  for (const { name } of people.values()) nameCount.set(name, (nameCount.get(name) ?? 0) + 1);
  return [...people.entries()]
    .map(([advisorId, { name, email }]): [string, string] => [advisorId, (nameCount.get(name) ?? 0) > 1 ? `${name} (${email.split("@")[0]})` : name])
    .sort((left, right) => left[1].localeCompare(right[1], "ko"));
}

/**
 * 100점 만점 환산 점수. 분과마다 채점표가 달라 만점이 다르므로 원점수를 더하면 만점이 큰 분과가
 * 늘 위에 선다. 내부 심사와 자문 평균을 각각 만점 대비 비율로 바꿔 평균한다.
 * 다 채점한 점수가 하나도 없으면 null 이다. 0점과 미채점을 구분해야 한다.
 */
export function combinedScore(row: ProgramScoreboardRow, staffWeight = 50): number | null {
  if (row.maxPoints <= 0) return null;
  // 비율이 0 인 쪽은 아예 넣지 않는다. 한쪽 점수가 아직 없으면 있는 쪽 비율만으로 나눈다.
  const parts = ([[row.staffTotal, staffWeight], [row.advisorAverage, 100 - staffWeight]] as const)
    .filter((part): part is readonly [number, number] => part[0] !== null && part[1] > 0);
  const weight = parts.reduce((sum, [, partWeight]) => sum + partWeight, 0);
  if (weight === 0) return null;
  return parts.reduce((sum, [value, partWeight]) => sum + (value / row.maxPoints) * 100 * partWeight, 0) / weight;
}

/** 분과끼리 묶은 뒤 그 안에서 고른 기준으로 줄을 세운다. 분과가 다르면 채점표가 달라 한 줄로 비교하지 않는다. */
export function sortRows(rows: ProgramScoreboardRow[], key: SortKey, staffWeight = 50): ProgramScoreboardRow[] {
  const byName = (left: ProgramScoreboardRow, right: ProgramScoreboardRow) => left.teamName.localeCompare(right.teamName, "ko");
  const byDivision = (left: ProgramScoreboardRow, right: ProgramScoreboardRow) =>
    left.divisionPosition - right.divisionPosition || (left.divisionName ?? "").localeCompare(right.divisionName ?? "", "ko");
  if (key === "team") return [...rows].sort((left, right) => byDivision(left, right) || byName(left, right));
  const value = (row: ProgramScoreboardRow) => {
    if (key === "staff") return row.staffTotal ?? -1;
    if (key === "advisor") return row.advisorAverage ?? -1;
    if (key === "vote") return row.voteCount;
    return combinedScore(row, staffWeight) ?? -1;
  };
  return [...rows].sort((left, right) => byDivision(left, right) || value(right) - value(left) || byName(left, right));
}

/** 분과마다 1등부터 다시 센다. 환산 점수가 없는 팀은 순위를 비운다. 같은 점수는 같은 순위다. */
export function divisionRanks(sorted: ProgramScoreboardRow[], staffWeight = 50): Array<number | null> {
  const ranks: Array<number | null> = [];
  let division: string | null | undefined;
  let position = 0;
  let previous: number | null = null;
  let previousRank = 0;
  for (const row of sorted) {
    if (row.divisionName !== division) {
      division = row.divisionName;
      position = 0;
      previous = null;
    }
    const score = combinedScore(row, staffWeight);
    if (score === null) {
      ranks.push(null);
      continue;
    }
    position += 1;
    previousRank = previous !== null && Math.abs(previous - score) < 1e-9 ? previousRank : position;
    previous = score;
    ranks.push(previousRank);
  }
  return ranks;
}

export function buildScoreboardCsv(rows: ProgramScoreboardRow[], advisorColumns: Array<[string, string]>, staffWeight = 50): string {
  const ranks = divisionRanks(rows, staffWeight);
  const header = ["순위", "번호", "팀", "프로젝트", "분과", "내부 심사", "채점자", ...advisorColumns.map(([, label]) => label), "자문 평균", "자문 완료", "만점", "득표", `환산 점수 (내부 ${staffWeight}%, 자문 ${100 - staffWeight}%)`, "수상"];
  const lines = rows.map((row, index) => {
    const scoreByAdvisor = new Map(row.advisorScores.map((score) => [score.advisorId, score]));
    const combined = combinedScore(row, staffWeight);
    return [
      ranks[index] ?? "",
      row.teamNumber ?? "",
      row.teamName,
      row.projectTitle,
      row.divisionName ?? "미분과",
      row.staffTotal ?? "",
      row.staffScorerNames.join(" "),
      ...advisorColumns.map(([advisorId]) => {
        const cell = scoreByAdvisor.get(advisorId);
        if (!cell || cell.scoredRubrics === 0) return "";
        return cell.complete ? cell.total : `${cell.total} (일부)`;
      }),
      row.advisorAverage === null ? "" : row.advisorAverage.toFixed(1),
      row.advisorProgress.assigned ? `${row.advisorProgress.complete}/${row.advisorProgress.assigned}` : "",
      row.maxPoints,
      row.voteCount,
      combined === null ? "" : combined.toFixed(1),
      row.award ?? "",
    ];
  });
  // 엑셀이 UTF-8 로 열도록 BOM 을 앞에 둔다. 없으면 한글이 깨진다.
  return `\uFEFF${[header, ...lines].map((cells) => cells.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

function downloadCsv(programName: string, rows: ProgramScoreboardRow[], advisorColumns: Array<[string, string]>, staffWeight: number) {
  const url = URL.createObjectURL(new Blob([buildScoreboardCsv(rows, advisorColumns, staffWeight)], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${programName}-집계표.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number): string {
  // 팀 이름과 프로젝트명은 학생이 짓는다. =, +, -, @ 로 시작하면 엑셀이 수식으로 실행하므로 ' 를 앞에 붙인다.
  const raw = String(value);
  const text = typeof value === "string" && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function Progress({ text }: { text: string }) {
  return <span className="mt-0.5 block text-[0.6875rem] font-normal text-[var(--muted)]"><UiText>{text}</UiText></span>;
}

/**
 * 환산 비율. 내부 심사 비율만 받고 자문위원은 나머지다. 외부 심사만 하는 해커톤은 내부 0 으로 둔다.
 * form action 으로 보내면 React 가 끝난 뒤 폼을 처음 렌더 값으로 되돌려 입력이 예전 값으로 돌아간다.
 * onSubmit 으로 보낸다.
 */
function WeightForm({ programId, staffWeight }: { programId: string; staffWeight: number }) {
  const [value, setValue] = useState(String(staffWeight));
  const [state, action, pending] = useActionState(saveScoreboardWeightAction, initialProgramActionState);
  const [, startSubmit] = useTransition();
  const parsed = Number(value);
  const valid = value.trim() !== "" && Number.isInteger(parsed) && parsed >= 0 && parsed <= 100;
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startSubmit(() => action(formData));
  }
  return (
    <form onSubmit={submit} aria-busy={pending} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--line)] px-5 py-3 text-[0.8125rem]">
      <input type="hidden" name="programId" value={programId} />
      <label htmlFor="scoreboard-staff-weight" className="font-medium text-[var(--ink)]"><UiText>{"환산 비율"}</UiText></label>
      <span className="flex items-center gap-1.5 text-[var(--muted)]">
        <UiText>{"내부 심사"}</UiText>
        <TextInput
          id="scoreboard-staff-weight"
          name="staffWeight"
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          step={1}
          required
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-8 min-h-8 w-20 py-0 text-right text-[0.8125rem] tabular-nums"
        />
        <span>%</span>
      </span>
      <span className="tabular-nums text-[var(--muted)]"><UiText>{valid ? `자문위원 ${100 - parsed}%` : "0부터 100 사이"}</UiText></span>
      <button type="submit" className="button-secondary button-compact min-h-8 px-3 font-medium" disabled={pending || !valid || parsed === staffWeight}>
        <UiText>{pending ? "저장 중" : "비율 저장"}</UiText>
      </button>
      {state.message ? (
        <span role={state.status === "error" ? "alert" : "status"} className={`text-xs ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></span>
      ) : null}
    </form>
  );
}
