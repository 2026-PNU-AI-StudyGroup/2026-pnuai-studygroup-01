import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TeamReportsPage from "@/app/teams/[teamId]/reports/page";

const { loadTeamReportWorkspace } = vi.hoisted(() => ({
  loadTeamReportWorkspace: vi.fn(),
}));

vi.mock("@/app/teams/[teamId]/_lib/team-workspace-data", () => ({
  loadTeamReportWorkspace,
}));

vi.mock("@/modules/translation/infrastructure/localized-metadata", () => ({
  getLocalizedMetadata: vi.fn(),
}));

vi.mock("@/app/teams/[teamId]/_components/report-decision-form", () => ({
  ReportDecisionForm: () => <button type="button">보고서 검토</button>,
}));

vi.mock("@/app/teams/[teamId]/_components/report-requirement-forms", () => ({
  RemoveReportRequirementForm: () => <button type="button">일정 삭제</button>,
  ReportRequirementForm: () => <button type="button">보고서 일정 설정</button>,
}));

vi.mock("@/app/teams/[teamId]/_components/report-score-feedback-forms", () => ({
  ReportFeedbackForm: () => <button type="button">피드백 남기기</button>,
}));

vi.mock("@/app/teams/[teamId]/_components/report-submission-form", () => ({
  ReportSubmissionForm: ({ triggerLabel = "보고서 제출" }: { triggerLabel?: string }) => <button type="button">{triggerLabel}</button>,
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
  taskCount: 0,
  completedTaskCount: 0,
  tasks: [],
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

describe("TeamReportsPage feedback states", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-04T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("학생에게 검토자, 검토 시각, 수정 요청과 다음 행동을 분리해 보여준다", async () => {
    loadTeamReportWorkspace.mockResolvedValue({
      actor,
      workspace,
      reportWorkspace: {
        reports: [
          {
            id: "report-approved",
            type: "START",
            dueAt: new Date("2026-08-31T14:59:59Z"),
            versions: [{
              id: "version-approved",
              version: 1,
              fileId: "file-approved",
              fileName: "착수보고서.pdf",
              description: "착수 계획을 정리했습니다.",
              submittedAt: new Date("2026-07-10T00:00:00Z"),
              submitterName: "정하늘",
              decision: {
                decision: "APPROVED",
                comment: "승인합니다.",
                decidedAt: new Date("2026-07-11T03:30:00Z"),
                reviewerName: "박준호",
              },
            }],
            feedback: [],
          },
          {
            id: "report-revision",
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
          },
          {
            id: "report-unsubmitted",
            type: "FINAL",
            dueAt: new Date("2026-12-15T14:59:59Z"),
            versions: [],
            feedback: [],
          },
        ],
        artifacts: [],
      },
    });

    render(await TeamReportsPage({ params: Promise.resolve({ teamId: "team-1" }) }));

    expect(screen.getByRole("heading", { name: "수정 요청 사항" })).toBeInTheDocument();
    expect(screen.getByText("근거 자료를 보완해 주세요.")).toBeInTheDocument();
    expect(screen.getByText("김도윤")).toBeInTheDocument();
    expect(screen.getByText("요청 사항을 반영한 새 버전을 제출해 주세요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "수정본 제출" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "피드백 남기기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "일정 삭제" })).not.toBeInTheDocument();
    const focus = screen.getByRole("complementary", { name: "중간 보고서 수정 요청을 확인해 주세요" });
    expect(within(focus).getByText("수정 요청 도착")).toBeInTheDocument();
    expect(within(focus).queryByText(/착수 보고서|결과 보고서/)).not.toBeInTheDocument();
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

  it("지도교수 없는 프로젝트의 만료된 수정 요청은 프로젝트 관리자에게 문의하도록 안내한다", async () => {
    loadTeamReportWorkspace.mockResolvedValue({
      actor,
      workspace: { ...workspace, advisorEnabled: false },
      reportWorkspace: {
        reports: [{
          id: "report-1",
          type: "MIDTERM",
          dueAt: new Date("2020-01-01T00:00:00Z"),
          versions: [{
            id: "version-1",
            version: 1,
            fileId: "file-1",
            fileName: "중간보고서.pdf",
            description: "중간 결과를 정리했습니다.",
            submittedAt: new Date("2019-12-20T00:00:00Z"),
            submitterName: "정하늘",
            decision: {
              decision: "REVISION_REQUESTED",
              comment: "근거 자료를 보완해 주세요.",
              decidedAt: new Date("2019-12-21T03:30:00Z"),
              reviewerName: "프로젝트 관리자",
            },
          }],
          feedback: [],
        }],
        artifacts: [],
      },
    });

    render(await TeamReportsPage({ params: Promise.resolve({ teamId: "team-1" }) }));

    expect(screen.getByText("제출 기한이 지났습니다. 새 버전 제출 일정은 프로젝트 관리자에게 확인해 주세요.")).toBeInTheDocument();
    expect(screen.queryByText(/지도교수에게 확인/)).not.toBeInTheDocument();
  });

  it("팀 확정 전 일정 0건은 중복 상태 strip 없이 하나의 빈 상태로 설명한다", async () => {
    loadTeamReportWorkspace.mockResolvedValue({
      actor,
      workspace: { ...workspace, status: "FORMING" },
      reportWorkspace: { reports: [], artifacts: [] },
    });

    render(await TeamReportsPage({ params: Promise.resolve({ teamId: "team-1" }) }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    const empty = screen.getByRole("heading", { name: "팀 확정 후 보고서를 제출할 수 있습니다" }).closest("[data-empty-state]");
    expect(empty).toHaveAttribute("data-empty-state", "page");
  });

  it("종료된 프로젝트의 일정 0건도 하나의 빈 상태만 보여준다", async () => {
    loadTeamReportWorkspace.mockResolvedValue({
      actor,
      workspace: { ...workspace, status: "CLOSED" },
      reportWorkspace: { reports: [], artifacts: [] },
    });

    render(await TeamReportsPage({ params: Promise.resolve({ teamId: "team-1" }) }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "종료된 프로젝트에 보고서 일정이 없습니다" })).toBeInTheDocument();
    expect(screen.queryByText("종료된 프로젝트입니다")).not.toBeInTheDocument();
  });

  it("보고서 요구사항 관리 권한이 있을 때만 일정 관리 기능을 보여준다", async () => {
    loadTeamReportWorkspace.mockResolvedValue({
      actor: { ...actor, id: "professor-1", role: "PROFESSOR" },
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
      reportWorkspace: {
        reports: [{
          id: "report-1",
          type: "FINAL",
          dueAt: new Date("2026-12-15T14:59:59Z"),
          versions: [],
          feedback: [],
        }],
        artifacts: [],
      },
    });

    render(await TeamReportsPage({ params: Promise.resolve({ teamId: "team-1" }) }));

    expect(screen.getByRole("button", { name: "보고서 일정 설정" })).toBeInTheDocument();
    expect(screen.getByText("보고서 일정 관리")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "일정 삭제" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "피드백 남기기" })).toBeInTheDocument();
  });
});
