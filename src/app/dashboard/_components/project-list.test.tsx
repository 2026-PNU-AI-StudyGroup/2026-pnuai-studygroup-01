import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectDashboardHero } from "@/app/dashboard/_components/project-dashboard-hero";
import { ProjectList } from "@/app/dashboard/_components/project-list";
import styles from "@/app/dashboard/_components/project-list.module.css";

const team = {
  id: "team-1",
  name: "모두의 길",
  topicTitle: "실내 길찾기",
  status: "CONFIRMED" as const,
  memberCount: 4,
  milestoneCount: 4,
  completedMilestoneCount: 2,
  milestones: [
    { id: "milestone-1", title: "현장 조사", status: "DONE" as const, dueAt: new Date("2026-07-10T00:00:00Z"), assignees: [{ id: "student-1", name: "정하늘" }] },
    { id: "milestone-2", title: "경로 데이터 검증", status: "DONE" as const, dueAt: new Date("2026-07-18T00:00:00Z"), assignees: [{ id: "student-2", name: "윤서준" }] },
    { id: "milestone-3", title: "프로토타입 테스트", status: "IN_PROGRESS" as const, dueAt: new Date("2026-08-02T00:00:00Z"), assignees: [{ id: "student-3", name: "한지우" }] },
    { id: "milestone-4", title: "최종 발표", status: "TODO" as const, dueAt: new Date("2026-08-20T00:00:00Z"), assignees: [] },
  ],
};

describe("프로젝트 목록 역할별 작업", () => {
  it("학생 프로젝트 화면을 통계 카드 없이 작업 중심으로 보여준다", () => {
    render(<ProjectDashboardHero role="STUDENT" />);

    expect(screen.getByRole("heading", { name: "내 프로젝트" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "새 프로젝트 찾기" })).toHaveAttribute("href", "/topics");
    expect(screen.queryByText("전체 진행률")).not.toBeInTheDocument();
    expect(screen.queryByText("진행 프로젝트")).not.toBeInTheDocument();
  });

  it("교수에게 지도 의견과 보고서 관리 진입점을 제공한다", () => {
    render(<ProjectList role="PROFESSOR" teams={[team]} />);

    expect(screen.getByRole("link", { name: "지도 의견" })).toHaveAttribute("href", "/teams/team-1/discussion");
    expect(screen.getByRole("link", { name: "보고서 관리" })).toHaveAttribute("href", "/teams/team-1/reports");
    expect(screen.getByRole("button", { name: /프로토타입 테스트/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("한지우")).toHaveLength(2);
    expect(screen.queryByText("3단계")).not.toBeInTheDocument();
  });

  it("학생에게 단일 작업 공간 진입점을 제공한다", () => {
    render(<ProjectList role="STUDENT" teams={[team]} />);

    expect(screen.getByRole("link", { name: /프로젝트 개요/ })).toHaveAttribute("href", "/teams/team-1");
    expect(screen.queryByRole("link", { name: "지도 의견" })).not.toBeInTheDocument();
  });

  it("종료 프로젝트를 진행 중 작업처럼 표시하지 않는다", () => {
    render(<ProjectList role="STUDENT" teams={[{ ...team, status: "CLOSED", milestoneCount: 0, completedMilestoneCount: 0, milestones: [] }]} />);

    expect(screen.getByText("완료한 프로젝트")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /프로젝트 보기/ })).toHaveAttribute("href", "/teams/team-1");
    expect(screen.queryByText("진행 중 프로젝트")).not.toBeInTheDocument();
  });

  it("진행 중 프로젝트와 종료 프로젝트를 별도 섹션으로 구분한다", () => {
    render(<ProjectList role="ADMIN" teams={[team, { ...team, id: "team-closed", status: "CLOSED" }]} />);

    expect(screen.getByRole("heading", { name: "모두의 길" })).toBeInTheDocument();
    expect(screen.getByText("완료한 프로젝트")).toBeInTheDocument();
  });

  it("여러 프로젝트는 하나의 캔버스에서 전환한다", () => {
    render(<ProjectList role="STUDENT" teams={[team, { ...team, id: "team-2", name: "다음 팀" }]} />);

    expect(screen.getByRole("button", { name: "모두의 길" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "다음 팀" }));
    expect(screen.getByRole("button", { name: "다음 팀" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "다음 팀" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "모두의 길" })).not.toBeInTheDocument();
  });

  it("빈 작업 lane은 별도 카드 없이 평문으로 안내한다", () => {
    render(<ProjectList role="STUDENT" teams={[{ ...team, milestones: [team.milestones[2]] }]} />);

    const emptyLanes = screen.getAllByText("해당 작업 없음");
    expect(emptyLanes).toHaveLength(2);
    for (const lane of emptyLanes) {
      expect(lane.tagName).toBe("P");
      expect(lane).toHaveClass(styles.emptyLaneMessage);
      expect(lane.className).not.toContain("laneEmpty");
    }
  });
});
