import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TeamOverviewPage from "@/app/teams/[teamId]/page";

const { loadTeamWorkspace } = vi.hoisted(() => ({
  loadTeamWorkspace: vi.fn(),
}));

vi.mock("@/app/teams/[teamId]/_lib/team-workspace-data", () => ({
  loadTeamWorkspace,
}));

vi.mock("@/modules/translation/infrastructure/localized-metadata", () => ({
  getLocalizedMetadata: vi.fn(),
}));

const workspace = {
  id: "team-1",
  topicId: "topic-1",
  name: "모두의 길",
  topicTitle: "실내 길찾기",
  status: "CONFIRMED" as const,
  memberCount: 1,
  taskCount: 0,
  completedTaskCount: 0,
  reportCount: 0,
  submittedReportCount: 0,
  tasks: [],
  professorName: "",
  advisorEnabled: false,
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
    programRecruitmentEndsAt: new Date("2026-02-01T00:00:00Z"),
    executionStartsAt: new Date("2026-03-01T00:00:00Z"),
    executionEndsAt: new Date("2026-10-01T00:00:00Z"),
    submissionStartsAt: new Date("2026-09-01T00:00:00Z"),
    submissionEndsAt: new Date("2026-12-01T00:00:00Z"),
  },
  assistants: [],
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
      interests: ["접근성", "교육"],
      skills: ["TypeScript", "Figma"],
      desiredRole: "프론트엔드 개발",
      availability: "평일 저녁",
      bio: "사용자 문제를 해결하고 싶습니다.",
    },
  }],
  discussionPosts: [],
  discussionPage: 1,
  discussionTotalPages: 1,
  discussionTotal: 0,
};

describe("TeamOverviewPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-04T00:00:00.000Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("사이드 내비와 구성원 사이드바를 본문에서 반복하지 않고 일정과 다음 행동만 요약한다", async () => {
    loadTeamWorkspace.mockResolvedValue({ workspace });

    render(await TeamOverviewPage({ params: Promise.resolve({ teamId: "team-1" }) }));

    expect(screen.getByRole("heading", { name: "프로그램 일정" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "팀원 1명" })).not.toBeInTheDocument();
    expect(screen.queryByText("student@pusan.ac.kr")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "프로젝트 작업" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /회의·검토 요청/ })).not.toBeInTheDocument();
    expect(screen.queryByText("프로젝트 관리자에게 요청하고 답변 확인")).not.toBeInTheDocument();
  });

  it("배정된 조교도 지속 노출되는 구성원 사이드바에만 표시한다", async () => {
    loadTeamWorkspace.mockResolvedValue({
      workspace: {
        ...workspace,
        assistants: [{ id: "assistant-1", name: "박조교", email: "assistant@pusan.ac.kr" }],
      },
    });

    render(await TeamOverviewPage({ params: Promise.resolve({ teamId: "team-1" }) }));

    expect(screen.queryByRole("heading", { name: "조교 1명" })).not.toBeInTheDocument();
    expect(screen.queryByText("박조교")).not.toBeInTheDocument();
    expect(screen.queryByText("assistant@pusan.ac.kr")).not.toBeInTheDocument();
  });

  it("감독자 헤더에는 사이드바와 중복되는 상태 대신 조교 관리 행동만 둔다", async () => {
    loadTeamWorkspace.mockResolvedValue({
      workspace: {
        ...workspace,
        advisorEnabled: true,
        access: {
          ...workspace.access,
          isPrimaryAdvisor: true,
          isTeamMember: false,
          canSupervise: true,
          canContribute: false,
        },
      },
    });

    render(await TeamOverviewPage({ params: Promise.resolve({ teamId: "team-1" }) }));

    expect(screen.getByRole("link", { name: "조교 관리" })).toHaveAttribute(
      "href",
      "/professor/topics/topic-1/assistants",
    );
    expect(screen.queryByText("프로젝트 운영 중")).not.toBeInTheDocument();
  });

  it("감독자에게도 팀 대화와 보고서 목적지를 본문에서 반복하지 않는다", async () => {
    loadTeamWorkspace.mockResolvedValue({
      workspace: {
        ...workspace,
        advisorEnabled: true,
        access: {
          ...workspace.access,
          isPrimaryAdvisor: true,
          isTeamMember: false,
          canSupervise: true,
          canContribute: false,
        },
      },
    });

    render(await TeamOverviewPage({ params: Promise.resolve({ teamId: "team-1" }) }));

    expect(screen.queryByRole("link", { name: "지도 의견 남기기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "보고서 관리" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "조교 관리" })).toHaveAttribute("href", "/professor/topics/topic-1/assistants");
  });

  it("기한이 지난 활성 할 일을 상태와 담당자, 이동 링크가 있는 다음 행동으로 보여준다", async () => {
    loadTeamWorkspace.mockResolvedValue({
      workspace: {
        ...workspace,
        taskCount: 3,
        completedTaskCount: 1,
        tasks: [
          {
            id: "done",
            title: "완료한 조사",
            dueAt: new Date("2026-07-20T00:00:00.000Z"),
            status: "DONE" as const,
            assignees: [{ id: "student-1", name: "정하늘" }],
          },
          {
            id: "future-progress",
            title: "프로토타입 검증",
            dueAt: new Date("2026-08-20T00:00:00.000Z"),
            status: "IN_PROGRESS" as const,
            assignees: [{ id: "student-1", name: "정하늘" }],
          },
          {
            id: "overdue-todo",
            title: "지연된 데이터 정리",
            dueAt: new Date("2026-08-01T00:00:00.000Z"),
            status: "TODO" as const,
            assignees: [{ id: "student-2", name: "윤서준" }],
          },
        ],
      },
    });

    render(await TeamOverviewPage({ params: Promise.resolve({ teamId: "team-1" }) }));

    expect(screen.getByRole("heading", { name: "지연된 데이터 정리" })).toBeInTheDocument();
    expect(screen.getByText("기한 초과")).toBeInTheDocument();
    expect(screen.getByText("윤서준")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "할 일 확인" })).toHaveAttribute("href", "/teams/team-1/tasks");
  });
});
