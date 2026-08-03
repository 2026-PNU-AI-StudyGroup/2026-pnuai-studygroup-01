import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ProjectGuidanceRequestsPage from "@/app/teams/[teamId]/requests/page";

const { findPage, loadTeamWorkspace } = vi.hoisted(() => ({
  findPage: vi.fn(),
  loadTeamWorkspace: vi.fn(),
}));

vi.mock("@/app/teams/[teamId]/_lib/team-workspace-data", () => ({
  loadTeamWorkspace,
}));

vi.mock("@/app/_components/translated-text", () => ({
  TranslatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

vi.mock("@/modules/project-guidance-request/infrastructure/prisma-project-guidance-request-repository", () => ({
  PrismaProjectGuidanceRequestRepository: class {
    findPage = findPage;
  },
}));

vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {} }));

vi.mock("@/app/teams/[teamId]/_components/project-guidance-request-forms", () => ({
  ProjectGuidanceRequestForm: () => <div data-testid="request-form">요청 작성 양식</div>,
  ProjectGuidanceResponseForm: () => <div data-testid="response-form">답변 양식</div>,
  CancelProjectGuidanceRequestForm: () => <button>요청 취소</button>,
}));

const student = {
  id: "student-1",
  name: "정하늘",
  email: "student@pusan.ac.kr",
  role: "STUDENT" as const,
};

const workspace = {
  id: "70000000-0000-4000-8000-000000000001",
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
  members: [],
  discussionPosts: [],
  discussionPage: 1,
  discussionTotalPages: 1,
  discussionTotal: 0,
};

const routeProps = {
  params: Promise.resolve({ teamId: workspace.id }),
  searchParams: Promise.resolve({}),
};

describe("ProjectGuidanceRequestsPage", () => {
  it("운영 중인 학생 팀원에게 작성 양식과 명시적 0건 상태를 보여준다", async () => {
    loadTeamWorkspace.mockResolvedValue({ actor: student, workspace });
    findPage.mockResolvedValue({
      items: [],
      page: 1,
      totalPages: 1,
      total: 0,
      pendingTotal: 0,
    });

    render(await ProjectGuidanceRequestsPage(routeProps));

    expect(screen.getByRole("heading", { name: "미팅·검토 요청" })).toBeInTheDocument();
    expect(screen.getByTestId("request-form")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "아직 등록된 요청이 없습니다" })).toBeInTheDocument();
  });

  it("지도교수에게 학생의 대기 요청과 답변 양식을 보여준다", async () => {
    loadTeamWorkspace.mockResolvedValue({
      actor: { ...student, id: "professor-1", role: "PROFESSOR" },
      workspace: {
        ...workspace,
        access: {
          isPrimaryAdvisor: true,
          isAssistant: false,
          isTeamMember: false,
          canSupervise: true,
          canContribute: false,
        },
      },
    });
    findPage.mockResolvedValue({
      items: [{
        id: "71000000-0000-4000-8000-000000000001",
        teamId: workspace.id,
        requesterId: student.id,
        requesterName: student.name,
        kind: "REVIEW",
        title: "설계 검토 요청",
        content: "현재 설계안의 책임 분리를 검토해 주세요.",
        referenceUrl: null,
        preferredAt: null,
        status: "PENDING",
        response: null,
        scheduledAt: null,
        responderName: null,
        respondedAt: null,
        canceledAt: null,
        createdAt: new Date("2026-08-03T00:00:00Z"),
      }],
      page: 1,
      totalPages: 1,
      total: 1,
      pendingTotal: 1,
    });

    render(await ProjectGuidanceRequestsPage(routeProps));

    expect(screen.queryByTestId("request-form")).not.toBeInTheDocument();
    expect(screen.getByText("설계 검토 요청")).toBeInTheDocument();
    expect(screen.getByText("현재 설계안의 책임 분리를 검토해 주세요.")).toBeInTheDocument();
    expect(screen.getByTestId("response-form")).toBeInTheDocument();
    expect(screen.getByText("1건 답변 대기")).toBeInTheDocument();
  });

  it("종료된 프로젝트에는 새 요청 대신 읽기 전용 안내를 보여준다", async () => {
    loadTeamWorkspace.mockResolvedValue({
      actor: student,
      workspace: { ...workspace, status: "CLOSED" },
    });
    findPage.mockResolvedValue({
      items: [],
      page: 1,
      totalPages: 1,
      total: 0,
      pendingTotal: 0,
    });

    render(await ProjectGuidanceRequestsPage(routeProps));

    expect(screen.queryByTestId("request-form")).not.toBeInTheDocument();
    expect(screen.getByText("종료된 프로젝트에서는 요청 이력만 확인할 수 있습니다.")).toBeInTheDocument();
  });
});
