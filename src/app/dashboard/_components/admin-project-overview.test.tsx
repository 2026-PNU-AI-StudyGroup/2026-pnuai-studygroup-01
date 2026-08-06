import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  AdminProjectOverview,
  sortAdminProjects,
  summarizeProjectProgress,
} from "@/app/dashboard/_components/admin-project-overview";
import type { AdminProjectOverviewProgram } from "@/modules/team/application/list-admin-project-overview";

const programs: AdminProjectOverviewProgram[] = [
  {
    id: "program-1",
    name: "2026 캡스톤",
    icon: "GRADUATION_CAP",
    category: "캡스톤",
    startYear: 2026,
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
    icon: "TROPHY",
    category: "경진대회",
    startYear: 2026,
    status: "DRAFT",
    advisorEnabled: false,
    projects: [],
  },
  {
    id: "program-3",
    name: "지난 캡스톤",
    icon: "GRADUATION_CAP",
    category: "캡스톤",
    startYear: 2025,
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
      withoutReportSchedule: 0,
      averageProgress: 44,
    });
  });

  it("프로그램별로 프로젝트와 진행률 통계를 보여준다", () => {
    const { container } = render(<AdminProjectOverview programs={programs} />);

    expect(screen.getByRole("complementary", { name: "프로젝트 현황 선택" })).toBeInTheDocument();
    const programNavigation = screen.getByRole("navigation", { name: "프로그램 선택" });
    expect(within(programNavigation).getByRole("heading", { name: "진행 중" })).toBeInTheDocument();
    expect(within(programNavigation).getByRole("heading", { name: "종료" })).toBeInTheDocument();
    expect(within(programNavigation).getByRole("link", { name: /AI 경진대회/ })).toHaveAttribute(
      "href",
      "/dashboard?programId=program-2",
    );
    expect(screen.getByRole("heading", { name: "2026 캡스톤" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "시작 전 팀" }).parentElement).toHaveTextContent("구성 중");
    expect(screen.getByRole("heading", { name: "진행 팀" }).parentElement).toHaveTextContent("진행 중");
    expect(screen.getByRole("progressbar", { name: "진행 팀 보고서 제출률" })).toHaveAttribute("aria-valuenow", "33");
    const progressRow = screen.getByRole("heading", { name: "진행 팀" }).closest("li");
    expect(progressRow).not.toBeNull();
    expect(within(progressRow!).getAllByText("33%")).toHaveLength(1);
    expect(within(progressRow!).getAllByText("진행 팀 보고서 제출률")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "시작 전 팀" }).parentElement).toHaveTextContent("제출 기한 초과");
    expect(screen.getAllByRole("link", { name: "프로젝트 열기" })[0]).toHaveAttribute("href", "/teams/team-1");
    expect(screen.queryByText("전체 보기")).not.toBeInTheDocument();
    const programLink = Array.from(container.querySelectorAll('nav[aria-label="프로그램 선택"] a'))
      .find((link) => link.getAttribute("href")?.includes("programId=program-1"));
    expect(programLink).toHaveAttribute("aria-current", "page");
    const progressNavigation = screen.getByRole("navigation", { name: "프로젝트 진행 구간" });
    expect(within(progressNavigation).getByRole("link", { name: "전체 2개" })).toHaveAttribute("aria-current", "page");
    expect(within(progressNavigation).getByRole("link", { name: "기한 초과 1개" })).toHaveAttribute(
      "href",
      "/dashboard?programId=program-1&progress=overdue",
    );
  });

  it("프로젝트가 없는 프로그램에는 보고서 진행 통계를 만들지 않는다", () => {
    render(<AdminProjectOverview programs={[programs[1]]} />);

    const section = screen.getByRole("heading", { name: "AI 경진대회" }).closest("section");
    expect(section).not.toBeNull();
    expect(within(section!).getByText(/프로젝트 0개/)).toBeInTheDocument();
    expect(within(section!).getByText("이 프로그램에는 아직 운영 중인 프로젝트가 없습니다.")).toBeInTheDocument();
    expect(within(section!).queryByText("보고서 일정이 없습니다")).not.toBeInTheDocument();
    expect(within(section!).queryByText("착수 전 · 0%")).not.toBeInTheDocument();
  });

  it("종료 그룹에서 선택한 프로그램의 프로젝트만 보여준다", () => {
    render(<AdminProjectOverview programs={programs} selectedProgramId="program-3" />);

    expect(screen.getByRole("heading", { name: "지난 캡스톤" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "완료 팀" }).parentElement).toHaveTextContent("완료");
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

  it("보고서 일정이 없는 프로젝트는 진행률 구간과 평균에서 제외하고 상태를 명시한다", () => {
    const projectWithoutReportSchedule = {
      id: "team-no-reports",
      name: "일정 없는 팀",
      topicTitle: "주제 E",
      professorName: "김교수",
      advisorEnabled: true,
      status: "CONFIRMED" as const,
      memberCount: 3,
      reportCount: 0,
      submittedReportCount: 0,
      overdueReportCount: 0,
    };
    expect(summarizeProjectProgress([projectWithoutReportSchedule])).toEqual({
      total: 1,
      notStarted: 0,
      early: 0,
      middle: 0,
      late: 0,
      finalizing: 0,
      completed: 0,
      overdue: 0,
      withoutReportSchedule: 1,
      averageProgress: null,
    });

    render(<AdminProjectOverview programs={[{
      ...programs[0],
      projects: [projectWithoutReportSchedule],
    }]} />);

    const row = screen.getByRole("heading", { name: "일정 없는 팀" }).closest("li");
    expect(row).not.toBeNull();
    expect(within(row!).getByText("보고서 일정이 없습니다")).toBeInTheDocument();
    expect(within(row!).queryByRole("progressbar")).not.toBeInTheDocument();
    expect(within(row!).queryByText("0 / 0 보고서 제출")).not.toBeInTheDocument();
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

  it("일정이 있는 프로젝트를 진행률 순으로 정렬하고 일정 없는 프로젝트는 뒤로 보낸다", () => {
    const items = [
      { id: "unscheduled", name: "일정 없음", topicTitle: "주제", professorName: "교수", advisorEnabled: true, status: "CONFIRMED" as const, memberCount: 3, reportCount: 0, submittedReportCount: 0, overdueReportCount: 0 },
      { id: "middle", name: "중반", topicTitle: "주제", professorName: "교수", advisorEnabled: true, status: "CONFIRMED" as const, memberCount: 3, reportCount: 4, submittedReportCount: 2, overdueReportCount: 0 },
      { id: "overdue", name: "기한 초과 착수 전", topicTitle: "주제", professorName: "교수", advisorEnabled: true, status: "CONFIRMED" as const, memberCount: 3, reportCount: 4, submittedReportCount: 0, overdueReportCount: 1 },
      { id: "not-started", name: "일반 착수 전", topicTitle: "주제", professorName: "교수", advisorEnabled: true, status: "CONFIRMED" as const, memberCount: 3, reportCount: 4, submittedReportCount: 0, overdueReportCount: 0 },
    ];

    expect(sortAdminProjects(items).map(({ id }) => id)).toEqual([
      "overdue",
      "not-started",
      "middle",
      "unscheduled",
    ]);
  });

  it("선택한 진행 구간만 보여주고 필터 변경 시 페이지를 초기화한다", () => {
    render(<AdminProjectOverview programs={programs} selectedProgress="overdue" requestedPage={4} />);

    const progressNavigation = screen.getByRole("navigation", { name: "프로젝트 진행 구간" });
    expect(within(progressNavigation).getByRole("link", { name: "기한 초과 1개" })).toHaveAttribute("aria-current", "page");
    expect(within(progressNavigation).getByRole("link", { name: "전체 2개" })).toHaveAttribute(
      "href",
      "/dashboard?programId=program-1",
    );
    expect(screen.getByRole("heading", { name: "시작 전 팀" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "진행 팀" })).not.toBeInTheDocument();
  });

  it("프로젝트를 20개씩 나누고 범위를 벗어난 페이지를 마지막 페이지로 정규화한다", () => {
    const manyProjects = Array.from({ length: 41 }, (_, index) => ({
      id: `team-${index + 1}`,
      name: `팀 ${String(index + 1).padStart(2, "0")}`,
      topicTitle: "주제",
      professorName: "김교수",
      advisorEnabled: true,
      status: "CONFIRMED" as const,
      memberCount: 4,
      reportCount: 4,
      submittedReportCount: index % 4,
      overdueReportCount: 0,
    }));
    render(<AdminProjectOverview programs={[{ ...programs[0], projects: manyProjects }]} requestedPage={99} />);

    const pagination = screen.getByRole("navigation", { name: "관리자 프로젝트 현황 페이지" });
    expect(pagination).toHaveTextContent("3 / 3 페이지");
    expect(screen.getAllByRole("link", { name: "프로젝트 열기" })).toHaveLength(1);
    expect(within(pagination).getByRole("link", { name: "이전" })).toHaveAttribute(
      "href",
      "/dashboard?programId=program-1&page=2",
    );
  });
});
