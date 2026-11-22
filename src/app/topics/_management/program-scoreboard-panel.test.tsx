import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// 서버 액션을 그대로 들이면 prisma 까지 딸려 와 DATABASE_URL 을 찾는다. 화면만 본다.
vi.mock("@/app/topics/_management/program-actions", () => ({ saveProgramTeamResultsAction: vi.fn() }));

import {
  ProgramScoreboardPanel,
  advisorColumnsOf,
  buildScoreboardCsv,
  combinedScore,
  divisionRanks,
  sortRows,
} from "@/app/topics/_management/program-scoreboard-panel";
import type { AdvisorScoreCell, ProgramScoreboardRow } from "@/modules/rubric/infrastructure/prisma-program-scoreboard-query";

function row(overrides: Partial<ProgramScoreboardRow> & { teamName: string }): ProgramScoreboardRow {
  return {
    teamId: overrides.teamName,
    projectId: `${overrides.teamName}-topic`,
    projectTitle: `${overrides.teamName} 프로젝트`,
    award: null,
    teamNumber: null,
    divisionName: null,
    divisionPosition: 0,
    staffTotal: null,
    staffProgress: { scored: 0, total: 1 },
    staffScorerNames: [],
    advisorScores: [],
    advisorAverage: null,
    advisorProgress: { complete: 0, assigned: 0 },
    maxPoints: 100,
    voteCount: 0,
    ...overrides,
  };
}

function cell(overrides: Partial<AdvisorScoreCell> & { advisorId: string }): AdvisorScoreCell {
  return { advisorName: "박위원", advisorEmail: "park@example.com", total: 0, scoredRubrics: 1, complete: true, ...overrides };
}

describe("집계표 줄 세우기", () => {
  const rows = [
    row({ teamName: "가팀", staffTotal: 80, advisorAverage: 10, voteCount: 1 }),
    row({ teamName: "나팀", staffTotal: 60, advisorAverage: 70, voteCount: 9 }),
    row({ teamName: "다팀", staffTotal: null, advisorAverage: null, voteCount: 5 }),
  ];

  it("환산 점수는 내부 심사와 자문 평균을 만점 대비 100점으로 바꿔 평균한다", () => {
    expect(combinedScore(rows[0]!)).toBe(45);
    expect(combinedScore(row({ teamName: "x", staffTotal: 120, maxPoints: 150 }))).toBe(80);
  });

  it("채점이 없으면 환산 점수는 0이 아니라 비어 있다", () => {
    expect(combinedScore(rows[2]!)).toBeNull();
  });

  it("기준을 바꾸면 순서가 바뀐다", () => {
    expect(sortRows(rows, "combined").map((entry) => entry.teamName)).toEqual(["나팀", "가팀", "다팀"]);
    expect(sortRows(rows, "staff").map((entry) => entry.teamName)).toEqual(["가팀", "나팀", "다팀"]);
    expect(sortRows(rows, "vote").map((entry) => entry.teamName)).toEqual(["나팀", "다팀", "가팀"]);
    expect(sortRows(rows, "team").map((entry) => entry.teamName)).toEqual(["가팀", "나팀", "다팀"]);
  });

  it("채점이 없는 팀은 0점이 아니라 맨 뒤로 간다", () => {
    const scoredZero = row({ teamName: "라팀", staffTotal: 0 });
    const ordered = sortRows([rows[2]!, scoredZero], "staff").map((entry) => entry.teamName);
    expect(ordered).toEqual(["라팀", "다팀"]);
  });

  it("분과끼리 묶고 순위는 분과마다 1등부터 센다. 미채점 팀은 순위가 없다", () => {
    const mixed = [
      row({ teamName: "A1", divisionName: "A", divisionPosition: 0, staffTotal: 50 }),
      row({ teamName: "B1", divisionName: "B", divisionPosition: 1, staffTotal: 140, maxPoints: 150 }),
      row({ teamName: "A2", divisionName: "A", divisionPosition: 0, staffTotal: 90 }),
      row({ teamName: "B2", divisionName: "B", divisionPosition: 1 }),
    ];
    const sorted = sortRows(mixed, "combined");
    expect(sorted.map((entry) => entry.teamName)).toEqual(["A2", "A1", "B1", "B2"]);
    expect(divisionRanks(sorted)).toEqual([1, 2, 1, null]);
  });

  it("같은 점수는 같은 순위다", () => {
    const tied = sortRows([row({ teamName: "가", staffTotal: 70 }), row({ teamName: "나", staffTotal: 70 }), row({ teamName: "다", staffTotal: 60 })], "combined");
    expect(divisionRanks(tied)).toEqual([1, 1, 3]);
  });

  it("이름이 같은 위원은 이메일 앞부분으로 구분한다", () => {
    const columns = advisorColumnsOf([row({
      teamName: "가팀",
      advisorScores: [
        cell({ advisorId: "a", advisorName: "김민수", advisorEmail: "minsu.kim@a.com" }),
        cell({ advisorId: "b", advisorName: "김민수", advisorEmail: "mkim@b.com" }),
        cell({ advisorId: "c", advisorName: "이영희", advisorEmail: "lee@c.com" }),
      ],
    })]);
    expect(columns.map(([, label]) => label)).toEqual(["김민수 (minsu.kim)", "김민수 (mkim)", "이영희"]);
  });

  it("팀이 있으면 표를 그리고 일부만 채점한 위원은 평균 제외로 표시한다", () => {
    const partial = row({
      teamName: "마팀",
      advisorScores: [cell({ advisorId: "adv-1", total: 45, complete: false })],
      advisorProgress: { complete: 0, assigned: 1 },
    });
    render(<ProgramScoreboardPanel programId="program-1" programName="캡스톤" rows={[...rows, partial]} />);

    expect(screen.getByRole("columnheader", { name: "순위" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: /가팀/ })).toBeInTheDocument();
    expect(screen.getByText("일부, 평균 제외")).toBeInTheDocument();
    expect(screen.getByText("완료 0/1명")).toBeInTheDocument();
  });

  it("열 이름을 누르면 그 열로 줄을 세우고 눌린 열을 표시한다", () => {
    render(<ProgramScoreboardPanel programId="program-1" programName="캡스톤" rows={rows} />);

    const teamOrder = () => screen.getAllByRole("rowheader").map((entry) => entry.textContent);
    expect(teamOrder()).toEqual(["나팀", "가팀", "다팀"]);

    fireEvent.click(screen.getByRole("button", { name: "득표" }));

    expect(teamOrder()).toEqual(["나팀", "다팀", "가팀"]);
    expect(screen.getByRole("columnheader", { name: "득표" })).toHaveAttribute("aria-sort", "descending");
    expect(screen.getByRole("columnheader", { name: "환산 점수" })).toHaveAttribute("aria-sort", "none");
  });

  it("CSV 는 BOM, 번호와 수상, 일부 채점 표시를 담고 쉼표가 든 값을 감싼다", () => {
    const entry = row({
      teamName: "마팀",
      teamNumber: 7,
      award: "대상",
      projectTitle: "AI, 그리고 교육",
      staffTotal: 70,
      staffScorerNames: ["김교수"],
      advisorScores: [cell({ advisorId: "adv-1", total: 45, complete: false })],
      advisorProgress: { complete: 0, assigned: 1 },
    });
    const csv = buildScoreboardCsv([entry], [["adv-1", "박위원"]]);

    expect(csv.startsWith("﻿순위,번호,팀,프로젝트,분과,내부 심사,채점자,박위원,자문 평균,자문 완료,만점,득표,환산 점수,수상\r\n")).toBe(true);
    expect(csv).toContain('1,7,마팀,"AI, 그리고 교육",미분과,70,김교수,45 (일부),,0/1,100,0,70.0,대상');
  });

  it("CSV 는 =, +, -, @ 로 시작하는 학생 입력을 수식으로 열지 못하게 막는다", () => {
    const csv = buildScoreboardCsv([row({ teamName: "=HYPERLINK(\"http://x\")", projectTitle: "@SUM(A1)" })], []);

    expect(csv).toContain("\"'=HYPERLINK(\"\"http://x\"\")\"");
    expect(csv).toContain("'@SUM(A1)");
  });

  it("팀이 없으면 빈 상태를 알린다", () => {
    render(<ProgramScoreboardPanel programId="program-1" programName="캡스톤" rows={[]} />);

    expect(screen.getByText("팀이 없습니다")).toBeInTheDocument();
  });
});
