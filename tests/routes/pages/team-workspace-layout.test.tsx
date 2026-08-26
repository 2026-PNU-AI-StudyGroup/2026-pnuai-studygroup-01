import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import TeamWorkspaceLayout from "@/app/projects/[projectId]/layout";

const { loadActiveTeamWorkspace } = vi.hoisted(() => ({
  loadActiveTeamWorkspace: vi.fn(),
}));

vi.mock("@/app/projects/[projectId]/_lib/team-workspace-data", () => ({
  loadActiveTeamWorkspace,
}));
vi.mock("@/app/projects/[projectId]/_actions/team-workspace-actions", () => ({
  confirmTeamAction: vi.fn(),
}));
vi.mock("@/app/projects/[projectId]/_actions/project-team-membership-actions", () => ({
  projectTeamMembershipAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/_components/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/app/projects/[projectId]/_components/team-workspace-navigation", () => ({
  TeamWorkspaceNavigation: ({ advisorEnabled }: { advisorEnabled: boolean }) => (
    <nav aria-label="프로젝트 메뉴" data-advisor-enabled={String(advisorEnabled)} />
  ),
}));
vi.mock("@/app/projects/[projectId]/_components/close-team-form", () => ({
  CloseTeamForm: () => null,
}));
vi.mock("@/shared/ui/confirm-submit-button", () => ({
  ConfirmSubmitButton: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));
vi.mock("@/shared/ui/person-avatar", () => ({
  PersonAvatar: ({ userId, updatedAt }: { userId: string; updatedAt: Date | null | undefined }) => (
    <span data-testid={`person-avatar-${userId}`} data-updated-at={updatedAt?.toISOString()} />
  ),
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
  status: "IN_PROGRESS" as const,
  memberCount: 1,
  taskCount: 0,
  completedTaskCount: 0,
  reportCount: 0,
  submittedReportCount: 0,
  tasks: [],
  professorName: "김도윤",
  professor: {
    id: "professor-1",
    name: "김도윤",
    profileImage: { updatedAt: new Date("2026-08-07T00:00:00Z") },
  },
  advisorEnabled: true,
  canClose: false,
  access: {
    isPrimaryAdvisor: false,
    isAssistant: false,
    isTeamMember: true,
    isTeamLeader: false,
    canSupervise: false,
    canContribute: true,
  },
  schedule: {
    recruitmentStartsAt: new Date("2026-01-01T00:00:00Z"),
    programRecruitmentEndsAt: new Date("2026-02-01T00:00:00Z"),
    executionStartsAt: new Date("2026-03-01T00:00:00Z"),
    executionEndsAt: new Date("2026-10-01T00:00:00Z"),
    submissionStartsAt: new Date("2026-09-01T00:00:00Z"),
    submissionEndsAt: new Date("2026-12-01T00:00:00Z"),
  },
  assistants: [{
    id: "assistant-1",
    name: "박조교",
    email: "assistant@pusan.ac.kr",
    profileImage: { updatedAt: new Date("2026-08-07T01:00:00Z") },
  }],
  members: [{
    id: "student-1",
    name: "정하늘",
    email: "student@pusan.ac.kr",
    department: "정보컴퓨터공학부",
    studentNumber: "202612345",
    grade: 3,
    phoneNumber: "010-1234-5678",
    contactEmail: "sky@example.com",
    profile: {
      phone: "010-9999-8888",
      kakao: "haneul_id",
      github: "https://github.com/haneul",
      instagram: "https://instagram.com/haneul",
    },
  }],
  discussionPosts: [],
  discussionPage: 1,
  discussionTotalPages: 1,
  discussionTotal: 0,
};

describe("TeamWorkspaceLayout", () => {
  it("보고서 일정이 없으면 0/0 진행률 대신 명시적 상태를 보여준다", async () => {
    loadActiveTeamWorkspace.mockResolvedValue({ actor, workspace });

    render(await TeamWorkspaceLayout({
      children: <div>프로젝트 본문</div>,
      params: Promise.resolve({ projectId: "team-1" }),
    }));

    expect(screen.getByText("보고서 일정이 없습니다")).toBeInTheDocument();
    expect(screen.queryByText("보고서 제출 0/0")).not.toBeInTheDocument();
    expect(screen.getByText("프로젝트 본문").parentElement).toHaveClass("max-w-6xl");
    expect(screen.getByRole("navigation", { name: "프로젝트 메뉴" })).toHaveAttribute("data-advisor-enabled", "true");
  });

  it("보고서 일정이 있으면 제출 진행률을 유지한다", async () => {
    loadActiveTeamWorkspace.mockResolvedValue({
      actor,
      workspace: { ...workspace, reportCount: 2, submittedReportCount: 1 },
    });

    render(await TeamWorkspaceLayout({
      children: <div>프로젝트 본문</div>,
      params: Promise.resolve({ projectId: "team-1" }),
    }));

    expect(screen.getByText("보고서 제출 1/2")).toBeInTheDocument();
    expect(screen.queryByText("보고서 일정이 없습니다")).not.toBeInTheDocument();
  });

  it("사이드바에 지도교수, 배정된 조교와 팀원 목록을 표시한다", async () => {
    loadActiveTeamWorkspace.mockResolvedValue({ actor, workspace });

    render(await TeamWorkspaceLayout({
      children: <div>프로젝트 본문</div>,
      params: Promise.resolve({ projectId: "team-1" }),
    }));

    expect(screen.getAllByText("김도윤").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("list", { name: "프로젝트 조교" })[0]).toHaveTextContent("박조교");
    expect(screen.getAllByRole("list", { name: "프로젝트 팀원" })[0]).toHaveTextContent("정하늘");
    expect(screen.getAllByTestId("person-avatar-professor-1")[0]).toHaveAttribute("data-updated-at", "2026-08-07T00:00:00.000Z");
    expect(screen.getAllByTestId("person-avatar-assistant-1")[0]).toHaveAttribute("data-updated-at", "2026-08-07T01:00:00.000Z");
  });

  it("사이드바는 명단만 보여 주고 팀 관리로 보낸다", async () => {
    loadActiveTeamWorkspace.mockResolvedValue({ actor, workspace });

    render(await TeamWorkspaceLayout({
      children: <div>프로젝트 본문</div>,
      params: Promise.resolve({ projectId: "team-1" }),
    }));

    // 사람을 들이고 빼고 연락처를 보는 일은 팀 관리 탭으로 옮겼다. 좁은 사이드바에
    // 손잡이를 몰아넣으면 이름이 밀려 읽기 어렵다.
    expect(screen.queryByRole("button", { name: "정하늘 상세 정보" })).toBeNull();
    expect(screen.getAllByRole("link", { name: "팀 관리로 이동" })[0])
      .toHaveAttribute("href", "/projects/topic-1/team");
  });
});
