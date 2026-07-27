import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  AdminProjectOverview,
  summarizeProjectProgress,
} from "@/app/dashboard/_components/admin-project-overview";
import type { AdminProjectOverviewProgram } from "@/modules/team/application/list-admin-project-overview";

const programs: AdminProjectOverviewProgram[] = [
  {
    id: "program-1",
    name: "2026 캡스톤",
    category: "캡스톤",
    academicYear: 2026,
    term: "FIRST",
    status: "OPEN",
    advisorEnabled: true,
    projects: [
      { id: "team-1", name: "시작 전 팀", topicTitle: "주제 A", professorName: "김교수", advisorEnabled: true, status: "FORMING", memberCount: 3, reportCount: 2, submittedReportCount: 0, overdueReportCount: 1 },
      { id: "team-2", name: "진행 팀", topicTitle: "주제 B", professorName: "이교수", advisorEnabled: true, status: "CONFIRMED", memberCount: 4, reportCount: 3, submittedReportCount: 1, overdueReportCount: 0 },
    ],
  },
  {
    id: "program-2",
    name: "AI 경진대회",
    category: "경진대회",
    academicYear: 2026,
    term: "SECOND",
    status: "DRAFT",
    advisorEnabled: false,
    projects: [],
  },
  {
    id: "program-3",
    name: "지난 캡스톤",
    category: "캡스톤",
    academicYear: 2025,
    term: "FIRST",
    status: "CLOSED",
    advisorEnabled: true,
    projects: [
      { id: "team-3", name: "완료 팀", topicTitle: "주제 C", professorName: "박교수", advisorEnabled: true, status: "CLOSED", memberCount: 5, reportCount: 2, submittedReportCount: 2, overdueReportCount: 0 },
    ],
  },
];

describe("관리자 프로젝트 현황", () => {
  it("진행률 구간별 프로젝트 수와 평균을 계산한다", () => {
    expect(summarizeProjectProgress([...programs[0].projects, ...programs[2].projects])).toEqual({
      total: 3,
      notStarted: 1,
      early: 0,
      middle: 1,
      late: 0,
      finalizing: 0,
      completed: 1,
      overdue: 1,
      averageProgress: 44,
    });
  });

  it("프로그램별로 프로젝트와 진행률 통계를 보여준다", () => {
    const { container } = render(<AdminProjectOverview programs={programs} />);

    expect(screen.getByRole("complementary", { name: "프로젝트 현황 탐색" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "진행 중" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "종료" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /AI 경진대회/ })).toHaveAttribute(
      "href",
      "/dashboard?programId=program-2",
    );
    expect(screen.getByRole("heading", { name: "2026 캡스톤" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "진행 팀 보고서 제출률" })).toHaveAttribute("aria-valuenow", "33");
    expect(screen.getAllByText("제출 기한 초과").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "프로젝트 열기" })[0]).toHaveAttribute("href", "/teams/team-1");
    expect(screen.queryByText("전체 보기")).not.toBeInTheDocument();
    const programLink = Array.from(container.querySelectorAll('nav[aria-label="프로그램 선택"] a'))
      .find((link) => link.getAttribute("href")?.includes("programId=program-1"));
    expect(programLink).toHaveAttribute("aria-current", "page");
  });

  it("종료 그룹에서 선택한 프로그램의 프로젝트만 보여준다", () => {
    render(<AdminProjectOverview programs={programs} selectedProgramId="program-3" />);

    expect(screen.getByRole("heading", { name: "지난 캡스톤" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "완료 팀 보고서 제출률" })).toHaveAttribute("aria-valuenow", "100");
    expect(screen.queryByText("진행 팀")).not.toBeInTheDocument();
  });

  it("지도교수가 없는 프로그램의 프로젝트에는 지도교수 정보를 표시하지 않는다", () => {
    const advisorlessProgram: AdminProjectOverviewProgram = {
      ...programs[1],
      status: "OPEN",
      projects: [
        { id: "team-4", name: "운영 팀", topicTitle: "주제 D", professorName: "숨김 관리자", advisorEnabled: false, status: "CONFIRMED", memberCount: 3, reportCount: 1, submittedReportCount: 0, overdueReportCount: 0 },
      ],
    };

    render(<AdminProjectOverview programs={[advisorlessProgram]} />);

    expect(screen.queryByText("지도교수")).not.toBeInTheDocument();
    expect(screen.queryByText("숨김 관리자")).not.toBeInTheDocument();
    expect(screen.getByText("3명")).toBeInTheDocument();
  });

  it("사이드바에서 선택한 프로그램의 프로젝트와 통계만 보여준다", () => {
    const programsWithTwoActive = [
      programs[0],
      {
        ...programs[1],
        projects: [
          { id: "team-4", name: "다른 프로그램 팀", topicTitle: "주제 D", professorName: "최교수", advisorEnabled: false, status: "CONFIRMED" as const, memberCount: 3, reportCount: 2, submittedReportCount: 1, overdueReportCount: 0 },
        ],
      },
      programs[2],
    ];
    const { container } = render(
      <AdminProjectOverview programs={programsWithTwoActive} selectedProgramId="program-1" />,
    );

    const selectedProgramLink = Array.from(container.querySelectorAll('nav[aria-label="프로그램 선택"] a'))
      .find((link) => link.getAttribute("href")?.includes("programId=program-1"));
    expect(selectedProgramLink).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { name: "시작 전 팀" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "다른 프로그램 팀" })).not.toBeInTheDocument();
    expect(screen.getByText((_, element) => (
      element?.tagName === "STRONG"
      && element.textContent?.includes("프로젝트 2개")
    ))).toBeInTheDocument();
  });

  it("알 수 없는 프로그램은 첫 진행 중 프로그램으로 정규화한다", () => {
    const { container } = render(
      <AdminProjectOverview programs={programs} selectedProgramId="unknown" />,
    );
    const selectedProgramLink = Array.from(container.querySelectorAll('nav[aria-label="프로그램 선택"] a'))
      .find((link) => link.getAttribute("aria-current") === "page");

    expect(selectedProgramLink).toHaveAttribute("href", "/dashboard?programId=program-1");
  });
});
