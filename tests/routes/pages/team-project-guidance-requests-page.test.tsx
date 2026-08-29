import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProjectGuidanceRequestsPage from "@/app/projects/[projectId]/requests/page";

const { findPage, loadActiveTeamWorkspace, notFound } = vi.hoisted(() => ({
  findPage: vi.fn(),
  loadActiveTeamWorkspace: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound }));

vi.mock("@/app/projects/[projectId]/_lib/team-workspace-data", () => ({
  loadActiveTeamWorkspace,
}));

vi.mock("@/modules/translation/infrastructure/localized-metadata", () => ({
  getLocalizedMetadata: vi.fn(),
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

vi.mock("@/app/projects/[projectId]/_components/project-guidance-request-forms", () => ({
  ProjectGuidanceRequestForm: () => <button type="button">새 요청 보내기</button>,
  ProjectGuidanceResponseForm: () => <button type="button">답변하기</button>,
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
  status: "IN_PROGRESS" as const,
  memberCount: 1,
  taskCount: 0,
  completedTaskCount: 0,
  reportCount: 0,
  submittedReportCount: 0,
  tasks: [],
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
    programRecruitmentEndsAt: new Date("2026-02-01T00:00:00Z"),
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
  params: Promise.resolve({ projectId: workspace.id }),
  searchParams: Promise.resolve({}),
};

describe("ProjectGuidanceRequestsPage", () => {
  beforeEach(() => {
    findPage.mockReset();
    loadActiveTeamWorkspace.mockReset();
    notFound.mockReset();
  });

  it("운영 중인 학생 팀원에게 요청 작성 버튼과 명시적 0건 상태를 보여준다", async () => {
    loadActiveTeamWorkspace.mockResolvedValue({ actor: student, workspace });
    findPage.mockResolvedValue({
      items: [],
      page: 1,
      totalPages: 1,
      total: 0,
      pendingTotal: 0,
    });

    render(await ProjectGuidanceRequestsPage(routeProps));

    const pageTitle = screen.getByRole("heading", { name: "회의·검토 요청" });
    expect(pageTitle.closest("section")).toHaveClass("max-w-6xl");
    expect(pageTitle.closest("header")).not.toHaveClass("border-b");
    expect(screen.getByRole("button", { name: "새 요청 보내기" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "회의나 검토가 필요하신가요?" }).closest("section")).toHaveClass("bg-[var(--surface)]", "rounded-[var(--radius-panel)]");
    expect(screen.getByRole("heading", { name: "아직 등록된 요청이 없습니다" })).toBeInTheDocument();
    expect(screen.getByText("회의나 검토가 필요할 때 새 요청 보내기 버튼으로 첫 요청을 작성하세요.")).toBeInTheDocument();
  });

  it("지도교수에게 학생의 대기 요청과 답변 양식을 보여준다", async () => {
    loadActiveTeamWorkspace.mockResolvedValue({
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
        referenceUrl: "https://example.com/design",
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

    expect(screen.queryByRole("button", { name: "새 요청 보내기" })).not.toBeInTheDocument();
    const requestCard = screen.getByRole("article", { name: "설계 검토 요청" });
    expect(requestCard).toHaveAttribute("data-request-state", "pending");
    expect(requestCard).toHaveClass("bg-[var(--surface)]", "rounded-[var(--radius-panel)]");
    const requestTitle = within(requestCard).getByRole("heading", { name: "설계 검토 요청" });
    expect(requestCard).toHaveAttribute("aria-labelledby", requestTitle.id);
    expect(requestCard).not.toHaveAttribute("aria-label");
    expect(within(requestCard).getByText("현재 설계안의 책임 분리를 검토해 주세요.")).toBeInTheDocument();
    expect(within(requestCard).getByRole("link", { name: "참고 링크 열기 새 창" })).toHaveAttribute("target", "_blank");
    expect(within(requestCard).getByRole("button", { name: "답변하기" })).toBeInTheDocument();
    expect(screen.getByText("1건 답변 대기")).toBeInTheDocument();
    expect(screen.getByText("검토 요청")).toBeInTheDocument();
    expect(screen.queryByText("요청 유형")).not.toBeInTheDocument();
  });

  it("답변 완료 요청은 확정 상태와 지도 답변을 성공 색면의 카드로 구분한다", async () => {
    loadActiveTeamWorkspace.mockResolvedValue({ actor: student, workspace });
    findPage.mockResolvedValue({
      items: [{
        id: "71000000-0000-4000-8000-000000000002",
        teamId: workspace.id,
        requesterId: student.id,
        requesterName: student.name,
        kind: "MEETING",
        title: "중간 점검 회의",
        content: "사용성 테스트 결과를 함께 확인하고 싶습니다.",
        referenceUrl: null,
        preferredAt: new Date("2026-08-10T05:00:00Z"),
        status: "ANSWERED",
        response: "회의에서 개선 우선순위를 정리하겠습니다.",
        scheduledAt: new Date("2026-08-11T05:00:00Z"),
        responderName: "김도윤",
        respondedAt: new Date("2026-08-04T05:00:00Z"),
        canceledAt: null,
        createdAt: new Date("2026-08-03T00:00:00Z"),
      }],
      page: 1,
      totalPages: 1,
      total: 1,
      pendingTotal: 0,
    });

    render(await ProjectGuidanceRequestsPage(routeProps));

    const requestCard = screen.getByRole("article", { name: "중간 점검 회의" });
    expect(requestCard).toHaveAttribute("data-request-state", "answered");
    expect(within(requestCard).getByText("일정 확정")).toBeInTheDocument();
    const response = within(requestCard).getByRole("complementary", { name: "지도 답변" });
    expect(response).toHaveClass("bg-[var(--success-subtle)]");
    expect(within(response).getByText("회의에서 개선 우선순위를 정리하겠습니다.")).toBeInTheDocument();
    expect(within(response).getByText(/확정 일시/)).toBeInTheDocument();
  });

  it("종료된 프로젝트에는 새 요청 대신 읽기 전용 안내를 보여준다", async () => {
    loadActiveTeamWorkspace.mockResolvedValue({
      actor: student,
      workspace: { ...workspace, status: "COMPLETED" },
    });
    findPage.mockResolvedValue({
      items: [],
      page: 1,
      totalPages: 1,
      total: 0,
      pendingTotal: 0,
    });

    render(await ProjectGuidanceRequestsPage(routeProps));

    expect(screen.queryByRole("button", { name: "새 요청 보내기" })).not.toBeInTheDocument();
    expect(screen.getByText("종료된 프로젝트에서는 요청 이력만 확인할 수 있습니다.")).toBeInTheDocument();
  });

  it("지도교수가 없는 프로젝트의 직접 검토 요청을 조회 전에 차단한다", async () => {
    loadActiveTeamWorkspace.mockResolvedValue({
      actor: student,
      workspace: { ...workspace, advisorEnabled: false },
    });
    notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(ProjectGuidanceRequestsPage(routeProps)).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalledOnce();
    expect(findPage).not.toHaveBeenCalled();
  });
});
