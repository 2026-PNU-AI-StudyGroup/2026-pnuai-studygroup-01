import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgramScoreboardPanel, buildScoreboardCsv, combinedScore, sortRows } from "@/app/topics/_management/program-scoreboard-panel";
import type { ProgramScoreboardRow } from "@/modules/rubric/infrastructure/prisma-program-scoreboard-query";

function row(overrides: Partial<ProgramScoreboardRow> & { teamName: string }): ProgramScoreboardRow {
  return {
    teamId: overrides.teamName,
    projectId: `${overrides.teamName}-topic`,
    projectTitle: `${overrides.teamName} 프로젝트`,
    divisionName: null,
    divisionPosition: 0,
    staffTotal: null,
    staffScorerNames: [],
    advisorScores: [],
    advisorAverage: null,
    voteCount: 0,
    ...overrides,
  };
}

describe("집계표 줄 세우기", () => {
  const rows = [
    row({ teamName: "가팀", staffTotal: 80, advisorAverage: 10, voteCount: 1 }),
    row({ teamName: "나팀", staffTotal: 60, advisorAverage: 35, voteCount: 9 }),
    row({ teamName: "다팀", staffTotal: null, advisorAverage: null, voteCount: 5 }),
  ];

  it("합계는 내부 심사 총점에 자문 평균을 더한다", () => {
    expect(combinedScore(rows[0]!)).toBe(90);
    expect(combinedScore(rows[2]!)).toBe(0);
  });

  it("기준을 바꾸면 순서가 바뀐다", () => {
    expect(sortRows(rows, "combined").map((entry) => entry.teamName)).toEqual(["나팀", "가팀", "다팀"]);
    expect(sortRows(rows, "staff").map((entry) => entry.teamName)).toEqual(["가팀", "나팀", "다팀"]);
    expect(sortRows(rows, "vote").map((entry) => entry.teamName)).toEqual(["나팀", "다팀", "가팀"]);
    expect(sortRows(rows, "team").map((entry) => entry.teamName)).toEqual(["가팀", "나팀", "다팀"]);
  });

  it("채점이 없는 팀은 0점이 아니라 맨 뒤로 간다", () => {
    // 미채점을 0으로 보면 0점을 받은 팀과 구별되지 않는다.
    const scoredZero = row({ teamName: "라팀", staffTotal: 0 });
    const ordered = sortRows([rows[2]!, scoredZero], "staff").map((entry) => entry.teamName);
    expect(ordered).toEqual(["라팀", "다팀"]);
  });

  it("팀이 있으면 표를 그린다", () => {
    render(<ProgramScoreboardPanel programName="캡스톤" rows={rows} />);

    expect(screen.getByRole("columnheader", { name: "순위" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: /가팀/ })).toBeInTheDocument();
  });

  it("열 이름을 누르면 그 열로 줄을 세우고 눌린 열을 표시한다", () => {
    render(<ProgramScoreboardPanel programName="캡스톤" rows={rows} />);

    const teamOrder = () => screen.getAllByRole("rowheader").map((cell) => cell.textContent);
    expect(teamOrder()).toEqual(["나팀", "가팀", "다팀"]);

    fireEvent.click(screen.getByRole("button", { name: "득표" }));

    expect(teamOrder()).toEqual(["나팀", "다팀", "가팀"]);
    // 값이 모두 같아 순서가 안 바뀌는 열도 있다. 눌렸다는 표시가 열에 남아야 한다.
    expect(screen.getByRole("columnheader", { name: "득표" })).toHaveAttribute("aria-sort", "descending");
    expect(screen.getByRole("columnheader", { name: "합계" })).toHaveAttribute("aria-sort", "none");
  });

  it("CSV 는 엑셀이 읽도록 BOM 을 앞에 두고 쉼표가 든 값을 감싼다", () => {
    const commaTitle = row({ teamName: "마팀", projectTitle: "AI, 그리고 교육", staffTotal: 70, staffScorerNames: ["김교수"] });
    const csv = buildScoreboardCsv([commaTitle], [["adv-1", "박위원"]]);

    expect(csv.startsWith("﻿순위,팀,프로젝트,분과,내부 심사,채점자,박위원,자문 평균,득표,합계\r\n")).toBe(true);
    expect(csv).toContain('1,마팀,"AI, 그리고 교육",미분과,70,김교수,,,0,70.0');
  });

  it("팀이 없으면 빈 상태를 알린다", () => {
    render(<ProgramScoreboardPanel programName="캡스톤" rows={[]} />);

    expect(screen.getByText("팀이 없습니다")).toBeInTheDocument();
  });
});
