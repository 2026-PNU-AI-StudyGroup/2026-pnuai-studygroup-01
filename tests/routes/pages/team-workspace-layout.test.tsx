import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import TeamWorkspaceLayout from "@/app/teams/[teamId]/layout";

const { loadTeamWorkspace } = vi.hoisted(() => ({
  loadTeamWorkspace: vi.fn(),
}));

vi.mock("@/app/teams/[teamId]/_lib/team-workspace-data", () => ({
  loadTeamWorkspace,
}));
vi.mock("@/app/teams/[teamId]/_actions/team-workspace-actions", () => ({
  confirmTeamAction: vi.fn(),
}));
vi.mock("@/app/_components/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/app/teams/[teamId]/_components/team-workspace-navigation", () => ({
  TeamWorkspaceNavigation: ({ advisorEnabled }: { advisorEnabled: boolean }) => (
    <nav aria-label="프로젝트 공간" data-advisor-enabled={String(advisorEnabled)} />
  ),
}));
vi.mock("@/app/teams/[teamId]/_components/close-team-form", () => ({
  CloseTeamForm: () => null,
}));
vi.mock("@/shared/ui/confirm-submit-button", () => ({
  ConfirmSubmitButton: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

const actor = {
  id: "student-1",
  name: "정하늘",
  email: "student@pusan.ac.kr",
  role: "STUDENT" as const,
};

const workspace = {
  id: "team-1",
  topicId: "topic-1",
  name: "모두의 길",
  topicTitle: "실내 길찾기",
  status: "CONFIRMED" as const,
  memberCount: 1,
  milestoneCount: 0,
  completedMilestoneCount: 0,
  reportCount: 0,
  submittedReportCount: 0,
  milestones: [],
  professorName: "김도윤",
  advisorEnabled: true,
  canClose: false,
  access: {
    isPrimaryAdvisor: false,
    isAssistant: false,
    isTeamMember: true,
    canSupervise: false,
    canContribute: true,
  },
  schedule: {
    recruitmentStartsAt: new Date("2026-01-01T00:00:00Z"),
    recruitmentEndsAt: new Date("2026-02-01T00:00:00Z"),
    executionStartsAt: new Date("2026-03-01T00:00:00Z"),
    executionEndsAt: new Date("2026-10-01T00:00:00Z"),
    submissionStartsAt: new Date("2026-09-01T00:00:00Z"),
    submissionEndsAt: new Date("2026-12-01T00:00:00Z"),
  },
  members: [{ id: "student-1", name: "정하늘", email: "student@pusan.ac.kr" }],
  discussionPosts: [],
  discussionPage: 1,
  discussionTotalPages: 1,
  discussionTotal: 0,
};

describe("TeamWorkspaceLayout", () => {
  it("보고서 일정이 없으면 0/0 진행률 대신 명시적 상태를 보여준다", async () => {
    loadTeamWorkspace.mockResolvedValue({ actor, workspace });

    render(await TeamWorkspaceLayout({
      children: <div>프로젝트 본문</div>,
      params: Promise.resolve({ teamId: "team-1" }),
    }));

    expect(screen.getByText("보고서 일정이 없습니다")).toBeInTheDocument();
    expect(screen.queryByText("보고서 제출 0/0")).not.toBeInTheDocument();
    expect(screen.getByText("프로젝트 본문").parentElement).toHaveClass("max-w-6xl");
    expect(screen.getByRole("navigation", { name: "프로젝트 공간" })).toHaveAttribute("data-advisor-enabled", "true");
  });

  it("보고서 일정이 있으면 제출 진행률을 유지한다", async () => {
    loadTeamWorkspace.mockResolvedValue({
      actor,
      workspace: { ...workspace, reportCount: 2, submittedReportCount: 1 },
    });

    render(await TeamWorkspaceLayout({
      children: <div>프로젝트 본문</div>,
      params: Promise.resolve({ teamId: "team-1" }),
    }));

    expect(screen.getByText("보고서 제출 1/2")).toBeInTheDocument();
    expect(screen.queryByText("보고서 일정이 없습니다")).not.toBeInTheDocument();
  });
});
