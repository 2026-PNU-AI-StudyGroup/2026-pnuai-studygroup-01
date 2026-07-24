import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectDashboardHero, ProjectList } from "@/app/dashboard/_components/project-list";

const team = {
  id: "team-1",
  name: "모두의 길",
  topicTitle: "실내 길찾기",
  status: "CONFIRMED" as const,
  memberCount: 4,
  milestoneCount: 4,
  completedMilestoneCount: 2,
};

describe("프로젝트 목록 역할별 작업", () => {
  it("학생 프로젝트 현황을 실제 집계값과 함께 보여준다", () => {
    render(<ProjectDashboardHero role="STUDENT" teams={[team, { ...team, id: "team-closed", status: "CLOSED" }]} />);

    expect(screen.getByRole("heading", { name: "내 프로젝트" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "새 프로젝트 찾기" })).toHaveAttribute("href", "/topics");
    expect(screen.getByText("전체 진행률")).toBeInTheDocument();
    expect(screen.getByText("50", { exact: false })).toBeInTheDocument();
  });

  it("교수에게 지도 의견과 보고서 관리 진입점을 제공한다", () => {
    render(<ProjectList role="PROFESSOR" teams={[team]} />);

    expect(screen.getByRole("link", { name: "지도 의견" })).toHaveAttribute("href", "/teams/team-1/discussion");
    expect(screen.getByRole("link", { name: "보고서 관리" })).toHaveAttribute("href", "/teams/team-1/reports");
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("학생에게 단일 작업 공간 진입점을 제공한다", () => {
    render(<ProjectList role="STUDENT" teams={[team]} />);

    expect(screen.getByRole("link", { name: /작업 이어가기/ })).toHaveAttribute("href", "/teams/team-1");
    expect(screen.queryByRole("link", { name: "지도 의견" })).not.toBeInTheDocument();
  });

  it("종료 프로젝트를 진행 중 작업처럼 표시하지 않는다", () => {
    render(<ProjectList role="STUDENT" teams={[{ ...team, status: "CLOSED", milestoneCount: 0, completedMilestoneCount: 0 }]} />);

    expect(screen.getByRole("heading", { name: "완료한 프로젝트" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /프로젝트 보기/ })).toHaveAttribute("href", "/teams/team-1");
    expect(screen.getByText("완료")).toBeInTheDocument();
    expect(screen.queryByText("마일스톤 0/0")).not.toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("진행 중 프로젝트와 종료 프로젝트를 별도 섹션으로 구분한다", () => {
    render(<ProjectList role="ADMIN" teams={[team, { ...team, id: "team-closed", status: "CLOSED" }]} />);

    expect(screen.getByRole("heading", { name: "진행 중 프로젝트" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "완료한 프로젝트" })).toBeInTheDocument();
  });
});
