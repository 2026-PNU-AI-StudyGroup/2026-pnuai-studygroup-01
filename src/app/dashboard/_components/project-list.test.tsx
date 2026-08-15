import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectApplicationList } from "@/app/dashboard/_components/project-application-list";
import { ProjectDashboardHero } from "@/app/dashboard/_components/project-dashboard-hero";
import { ProjectDashboardSidebar } from "@/app/dashboard/_components/project-dashboard-sidebar";
import { ProjectList } from "@/app/dashboard/_components/project-list";

const team = {
  id: "team-1",
  name: "모두의 길",
  programName: "2026 캡스톤디자인",
  topicTitle: "실내 길찾기",
  status: "IN_PROGRESS" as const,
  memberCount: 4,
  taskCount: 4,
  completedTaskCount: 2,
  reportCount: 3,
  submittedReportCount: 1,
  tasks: [
    { id: "task-1", title: "현장 조사", status: "DONE" as const, completedAt: new Date("2026-07-11T00:00:00Z"), dueAt: new Date("2026-07-10T00:00:00Z"), assignees: [{ id: "student-1", name: "정하늘" }] },
    { id: "task-2", title: "경로 데이터 검증", status: "DONE" as const, completedAt: new Date("2026-07-19T00:00:00Z"), dueAt: new Date("2026-07-18T00:00:00Z"), assignees: [{ id: "student-2", name: "윤서준" }] },
    { id: "task-3", title: "프로토타입 테스트", status: "IN_PROGRESS" as const, completedAt: null, dueAt: new Date("2026-08-02T00:00:00Z"), assignees: [{ id: "student-3", name: "한지우" }] },
    { id: "task-4", title: "최종 발표", status: "TODO" as const, completedAt: null, dueAt: new Date("2026-08-20T00:00:00Z"), assignees: [] },
  ],
};

describe("내 프로젝트 통합 화면", () => {
  it("사용 빈도에 따라 진행 중 상태를 지원 상태보다 먼저 배치한다", () => {
    const { container } = render(<ProjectDashboardSidebar counts={{ all: 6, pending: 2, rejected: 1, active: 2, completed: 1 }} selectedView="pending" student />);

    const navigation = screen.getByRole("navigation", { name: "내 프로젝트 바로가기" });
    const links = navigation.querySelectorAll("a");

    expect(Array.from(links).map((link) => link.getAttribute("href"))).toEqual([
      "/dashboard",
      "/dashboard?view=active",
      "/dashboard?view=pending",
      "/dashboard?view=completed",
      "/dashboard?view=rejected",
    ]);
    expect(within(navigation).getByRole("link", { name: "검토 중 2개" })).toHaveAttribute("aria-current", "page");
    expect(container.querySelector("summary")).toHaveTextContent("내 프로젝트검토 중2개");
  });

  it("학생 프로젝트 화면을 지원부터 완료까지의 단일 흐름으로 설명한다", () => {
    render(<ProjectDashboardHero role="STUDENT" />);

    expect(screen.getByRole("heading", { name: "내 프로젝트" })).toBeInTheDocument();
    expect(screen.getByText("참여 프로젝트의 일정과 제출 현황을 확인합니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "새 프로젝트 찾기" })).toHaveAttribute("href", "/topics");
  });

  it("교수 프로젝트 화면을 별도 상단 탭 없이 운영 행동 중심으로 설명한다", () => {
    render(<ProjectDashboardHero role="PROFESSOR" />);

    expect(screen.getByRole("heading", { name: "프로젝트 운영" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "지원 검토" })).toHaveAttribute("href", "/professor/applications");
    expect(screen.getByRole("link", { name: "프로젝트 관리" })).toHaveAttribute("href", "/professor/topics");
  });

  it("진행 프로젝트 카드는 핵심 현황과 카드 전체 진입점을 제공한다", () => {
    render(<ProjectList role="STUDENT" teams={[team]} view="active" />);

    expect(screen.getByRole("heading", { name: "진행 중 프로젝트" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "모두의 길" })).toBeInTheDocument();
    expect(screen.getByText("2026 캡스톤디자인")).toBeInTheDocument();
    expect(screen.getByText("진행 중")).toHaveClass("bg-[var(--primary-subtle)]");
    expect(screen.getByText("보고서 제출률")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "모두의 길 보고서 제출률" })).toHaveAttribute("aria-valuenow", "33");
    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "1 / 3 보고서 제출")).toBeInTheDocument();
    expect(screen.getByText("프로토타입 테스트")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "모두의 길 프로젝트 열기" })).toHaveAttribute("href", "/projects/team-1");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("팀 대화")).not.toBeInTheDocument();
    expect(screen.queryByText("보고서")).not.toBeInTheDocument();
  });

  it("할 일이 없으면 다음 할 일 없음 상태를 표시한다", () => {
    render(<ProjectList role="STUDENT" teams={[{ ...team, taskCount: 0, completedTaskCount: 0, tasks: [] }]} />);

    expect(screen.getByText("등록된 할 일 없음")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "모두의 길 보고서 제출률" })).toHaveAttribute("aria-valuenow", "33");
    expect(screen.queryByText("0 / 0 할 일 완료")).not.toBeInTheDocument();
  });

  it("교수와 완료 프로젝트에는 역할과 상태에 맞는 진입 문구를 제공한다", () => {
    const { rerender } = render(<ProjectList role="PROFESSOR" teams={[team]} view="active" />);

    expect(screen.getByRole("link", { name: "모두의 길 프로젝트 열기" })).toHaveAttribute("href", "/projects/team-1");

    rerender(<ProjectList role="STUDENT" teams={[{ ...team, status: "COMPLETED" }]} view="completed" />);

    expect(screen.getByRole("heading", { name: "완료한 프로젝트" })).toBeInTheDocument();
    expect(screen.getByText("완료")).toHaveClass("bg-[var(--surface-subtle)]");
    expect(screen.getByRole("link", { name: "모두의 길 완료 프로젝트 열기" })).toHaveAttribute("href", "/projects/team-1");
    expect(screen.queryByText("진행 중 프로젝트")).not.toBeInTheDocument();
  });

  it("선택한 프로젝트 상태만 렌더링한다", () => {
    const closedTeam = { ...team, id: "team-closed", status: "COMPLETED" as const };
    const { rerender } = render(<ProjectList role="STUDENT" teams={[team, closedTeam]} view="active" />);

    expect(screen.getByRole("heading", { name: "모두의 길" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /완료 프로젝트 열기$/ })).not.toBeInTheDocument();

    rerender(<ProjectList role="STUDENT" teams={[team, closedTeam]} view="completed" />);

    expect(screen.getByRole("link", { name: "모두의 길 완료 프로젝트 열기" })).toHaveAttribute("href", "/projects/team-closed");
    expect(screen.queryByRole("link", { name: /^모두의 길 프로젝트 열기$/ })).not.toBeInTheDocument();
  });

  it("검토 중과 미선정을 서로 다른 프로젝트 상태로 보여준다", () => {
    const pendingApplication = {
      id: "application-1",
      topicId: "topic-1",
      topicTitle: "접근성 지도",
      topicStatus: "ACTIVE" as const,
      programName: "2026 캡스톤",
      programStatus: "OPEN" as const,
      status: "PENDING" as const,
      reviewComment: "",
      message: "",
      skills: [],
      desiredRole: "",
      availability: "",
      applicationKind: "INDIVIDUAL" as const,
      teamMembers: [],
      answers: [],
      createdAt: new Date("2026-07-20T00:00:00Z"),
      decidedAt: null,
    };
    const page = {
      items: [pendingApplication],
      page: 1,
      totalPages: 1,
      total: 1,
      counts: { PENDING: 1, ACCEPTED: 0, REJECTED: 0, WITHDRAWN: 0 },
    };
    const { rerender } = render(<ProjectApplicationList page={page} status="PENDING" />);

    expect(screen.getByRole("heading", { name: "검토 중" })).toBeInTheDocument();
    expect(screen.getByText("접근성 지도")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "접근성 지도 프로젝트 보기" })).toHaveAttribute("href", "/topics/topic-1");
    const pendingCard = screen.getByText("접근성 지도").closest("article");
    expect(pendingCard).not.toBeNull();
    expect(within(pendingCard!).getByText("검토 중")).toHaveClass("bg-[var(--primary-subtle)]");

    rerender(
      <ProjectApplicationList
        page={{
          ...page,
          items: [{ ...pendingApplication, status: "REJECTED", reviewComment: "정원이 마감되었습니다.", decidedAt: new Date("2026-07-21T00:00:00Z") }],
          counts: { PENDING: 0, ACCEPTED: 0, REJECTED: 1, WITHDRAWN: 0 },
        }}
        status="REJECTED"
      />,
    );

    expect(screen.getByRole("heading", { name: "미선정" })).toBeInTheDocument();
    const rejectedCard = screen.getByText("접근성 지도").closest("article");
    expect(rejectedCard).not.toBeNull();
    expect(within(rejectedCard!).getByText("미선정")).toHaveClass("bg-[var(--danger-subtle)]");
    expect(screen.getByText("정원이 마감되었습니다.")).toBeInTheDocument();
  });
});
