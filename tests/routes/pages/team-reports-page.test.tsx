import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TeamReportsPage from "@/app/teams/[teamId]/reports/page";

const { loadTeamReportWorkspace } = vi.hoisted(() => ({
  loadTeamReportWorkspace: vi.fn(),
}));

vi.mock("@/app/teams/[teamId]/_lib/team-workspace-data", () => ({
  loadTeamReportWorkspace,
}));

vi.mock("@/app/teams/[teamId]/_components/report-decision-form", () => ({
  ReportDecisionForm: () => null,
}));

vi.mock("@/app/teams/[teamId]/_components/report-requirement-forms", () => ({
  RemoveReportRequirementForm: () => null,
  ReportRequirementForm: () => null,
}));

vi.mock("@/app/teams/[teamId]/_components/report-submission-form", () => ({
  ReportSubmissionForm: () => null,
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
  milestones: [],
  professorName: "김교수",
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

describe("TeamReportsPage feedback states", () => {
  it("학생에게 검토자, 검토 시각, 수정 요청과 다음 행동을 분리해 보여준다", async () => {
    loadTeamReportWorkspace.mockResolvedValue({
      actor,
      workspace,
      reportWorkspace: {
        reports: [{
          id: "report-1",
          type: "MIDTERM",
          dueAt: new Date("2026-10-15T14:59:59Z"),
          versions: [{
            id: "version-1",
            version: 1,
            fileId: "file-1",
            fileName: "중간보고서.pdf",
            description: "중간 결과를 정리했습니다.",
            submittedAt: new Date("2026-07-20T00:00:00Z"),
            submitterName: "정하늘",
            decision: {
              decision: "REVISION_REQUESTED",
              comment: "근거 자료를 보완해 주세요.",
              decidedAt: new Date("2026-07-21T03:30:00Z"),
              reviewerName: "김도윤",
            },
          }],
          feedback: [],
        }],
        artifacts: [],
      },
    });

    render(await TeamReportsPage({ params: Promise.resolve({ teamId: "team-1" }) }));

    expect(screen.getByRole("heading", { name: "수정 요청 사항" })).toBeInTheDocument();
    expect(screen.getByText("근거 자료를 보완해 주세요.")).toBeInTheDocument();
    expect(screen.getByText("김도윤")).toBeInTheDocument();
    expect(screen.getByText("요청 사항을 반영한 새 버전을 제출해 주세요.")).toBeInTheDocument();
  });

  it("보고서 이력이 있으면 제출 불가 안내를 빈 상태가 아닌 compact status로 보여준다", async () => {
    loadTeamReportWorkspace.mockResolvedValue({
      actor,
      workspace,
      reportWorkspace: {
        reports: [{
          id: "report-1",
          type: "START",
          dueAt: new Date("2020-01-01T00:00:00Z"),
          versions: [],
          feedback: [],
        }],
        artifacts: [],
      },
    });

    render(await TeamReportsPage({ params: Promise.resolve({ teamId: "team-1" }) }));

    expect(screen.getByRole("status")).toHaveTextContent("현재 제출 가능한 보고서가 없습니다");
    expect(screen.queryByRole("heading", { name: "현재 제출 가능한 보고서가 없습니다" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "착수 보고서" })).toBeInTheDocument();
  });

  it("팀 상태 안내와 실제 0건 빈 상태를 서로 다른 표면으로 보여준다", async () => {
    loadTeamReportWorkspace.mockResolvedValue({
      actor,
      workspace: { ...workspace, status: "FORMING" },
      reportWorkspace: { reports: [], artifacts: [] },
    });

    render(await TeamReportsPage({ params: Promise.resolve({ teamId: "team-1" }) }));

    expect(screen.getByRole("status")).toHaveTextContent("팀 확정 후 제출할 수 있습니다");
    const empty = screen.getByRole("heading", { name: "보고서 일정이 없습니다" }).closest("[data-empty-state]");
    expect(empty).toHaveAttribute("data-empty-state", "page");
  });
});
