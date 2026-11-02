import { render, screen } from "@testing-library/react";
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
vi.mock("@/app/projects/[projectId]/_actions/team-project-info-actions", () => ({
  updateTeamProjectInfoAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/_components/app-shell", () => ({
  AppShell: ({ children, panel }: { children: ReactNode; panel?: ReactNode }) => <>{panel}{children}</>,
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
  programName: "2026 캡스톤디자인",
  topicTitle: "실내 길찾기",
  topicDescription: "누구나 이동할 수 있는 길을 안내합니다.",
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
  it("메뉴 칸에는 사업과 프로젝트 이름, 프로젝트 메뉴만 둔다", async () => {
    loadActiveTeamWorkspace.mockResolvedValue({ actor, workspace });

    render(await TeamWorkspaceLayout({ children: <p>프로젝트 본문</p>, params: Promise.resolve({ projectId: "topic-1" }) }));

    const title = screen.getByText("실내 길찾기");
    expect(title.previousElementSibling).toHaveTextContent("2026 캡스톤디자인");
    expect(screen.getByRole("link", { name: "프로젝트 목록으로 돌아가기" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("navigation", { name: "프로젝트 메뉴" })).toHaveAttribute("data-advisor-enabled", "true");
    expect(screen.getByText("프로젝트 본문").parentElement).toHaveClass("max-w-6xl");
  });

  it("상태, 수정, 보고서 진행, 명단은 개요 화면으로 옮겨 메뉴 칸에 되풀이하지 않는다", async () => {
    loadActiveTeamWorkspace.mockResolvedValue({ actor, workspace: { ...workspace, reportCount: 2, submittedReportCount: 1 } });

    render(await TeamWorkspaceLayout({ children: <p>프로젝트 본문</p>, params: Promise.resolve({ projectId: "topic-1" }) }));

    expect(screen.queryByRole("button", { name: "프로젝트 정보 수정" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "방문자 화면 보기" })).not.toBeInTheDocument();
    expect(screen.queryByText("보고서 제출 1/2")).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "프로젝트 팀원" })).not.toBeInTheDocument();
    expect(screen.queryByText("모두의 길")).not.toBeInTheDocument();
  });
});
