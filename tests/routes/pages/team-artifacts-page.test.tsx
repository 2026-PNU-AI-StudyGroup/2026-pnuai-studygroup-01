import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TeamArtifactsPage from "@/app/teams/[teamId]/artifacts/page";

const { loadTeamReportWorkspace } = vi.hoisted(() => ({
  loadTeamReportWorkspace: vi.fn(),
}));

vi.mock("@/app/teams/[teamId]/_lib/team-workspace-data", () => ({
  loadTeamReportWorkspace,
}));

vi.mock("@/modules/translation/infrastructure/localized-metadata", () => ({
  getLocalizedMetadata: vi.fn(),
}));

vi.mock("@/app/teams/[teamId]/_components/artifact-registration-form", () => ({
  ArtifactRegistrationForm: () => <button type="button">결과물 등록</button>,
}));

vi.mock("@/app/teams/[teamId]/_components/showcase-manager", () => ({
  ShowcaseManager: () => null,
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

describe("TeamArtifactsPage", () => {
  beforeEach(() => {
    loadTeamReportWorkspace.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("결과물을 종류·제목과 함께 본문에 인라인으로 보여준다", async () => {
    loadTeamReportWorkspace.mockResolvedValue({
      actor,
      workspace,
      reportWorkspace: {
        reports: [],
        artifacts: [
          {
            id: "artifact-poster",
            type: "POSTER",
            title: "모두의 길 프로젝트 소개 포스터",
            fileId: "file-poster",
            createdAt: new Date("2026-08-01T00:00:00Z"),
          },
          {
            id: "artifact-source",
            type: "SOURCE_CODE",
            title: "접근성 길찾기 프로토타입 소스 코드",
            externalUrl: "https://example.com/source",
            createdAt: new Date("2026-08-02T00:00:00Z"),
          },
        ],
      },
    });

    render(await TeamArtifactsPage({ params: Promise.resolve({ teamId: workspace.id }) }));

    const pageTitle = screen.getByRole("heading", { name: "프로젝트 결과물" });
    expect(pageTitle.closest("section")).toHaveClass("max-w-6xl");
    expect(pageTitle.closest("header")).not.toHaveClass("border-b");
    expect(screen.getByRole("button", { name: "결과물 등록" })).toBeInTheDocument();

    const posterItem = screen.getByRole("heading", { name: "모두의 길 프로젝트 소개 포스터" }).closest("li");
    expect(posterItem).toHaveAttribute("data-artifact-type", "poster");
    const inlinePosterLabels = within(posterItem!).getAllByText("포스터", { selector: "span" })
      .filter((label) => !label.closest("dialog"));
    expect(inlinePosterLabels).toHaveLength(1);

    const sourceItem = screen.getByRole("heading", { name: "접근성 길찾기 프로토타입 소스 코드" }).closest("li");
    expect(sourceItem).toHaveAttribute("data-artifact-type", "source_code");
    const inlineSourceLabels = within(sourceItem!).getAllByText("소스 코드", { selector: "span" })
      .filter((label) => !label.closest("dialog"));
    expect(inlineSourceLabels).toHaveLength(1);
    const sourceLink = within(sourceItem!).getByRole("link");
    expect(sourceLink).toHaveAttribute("href", "https://example.com/source");
    expect(sourceLink).toHaveAttribute("target", "_blank");
  });

  it("팀 확정 전에는 등록 행동을 숨기고 역할에 맞는 빈 상태를 유지한다", async () => {
    loadTeamReportWorkspace.mockResolvedValue({
      actor,
      workspace: { ...workspace, status: "FORMING" },
      reportWorkspace: { reports: [], artifacts: [] },
    });

    render(await TeamArtifactsPage({ params: Promise.resolve({ teamId: workspace.id }) }));

    expect(screen.queryByRole("button", { name: "결과물 등록" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "아직 공개할 결과물이 없습니다" })).toBeInTheDocument();
    expect(screen.getByText("팀이 확정되면 결과물을 공개할 수 있습니다.")).toBeInTheDocument();
  });

  it.each([
    ["등록 시작 시각", workspace.schedule.submissionStartsAt],
    ["등록 종료 시각", workspace.schedule.submissionEndsAt],
  ])("학생은 %s을 포함해 결과물을 등록할 수 있다", async (_label, now) => {
    vi.setSystemTime(now);
    loadTeamReportWorkspace.mockResolvedValue({
      actor,
      workspace,
      reportWorkspace: { reports: [], artifacts: [] },
    });

    render(await TeamArtifactsPage({ params: Promise.resolve({ teamId: workspace.id }) }));

    expect(screen.getByRole("button", { name: "결과물 등록" })).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: /결과물 등록 기간/ })).not.toBeInTheDocument();
  });

  it("학생의 결과물 등록 기간 전에는 등록 행동을 숨기고 하나의 빈 상태로 안내한다", async () => {
    vi.setSystemTime(new Date("2026-08-04T00:00:00Z"));
    loadTeamReportWorkspace.mockResolvedValue({
      actor,
      workspace,
      reportWorkspace: { reports: [], artifacts: [] },
    });

    render(await TeamArtifactsPage({ params: Promise.resolve({ teamId: workspace.id }) }));

    expect(screen.queryByRole("button", { name: "결과물 등록" })).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: /결과물 등록 기간/ })).not.toBeInTheDocument();
    expect(screen.getByText("결과물 등록 기간이 시작되면 파일 또는 링크를 공개할 수 있습니다.")).toBeInTheDocument();
  });

  it("학생의 결과물 등록 기간 후에는 등록 행동을 숨기고 읽기 전용 상태를 안내한다", async () => {
    vi.setSystemTime(new Date("2026-12-02T00:00:00Z"));
    loadTeamReportWorkspace.mockResolvedValue({
      actor,
      workspace,
      reportWorkspace: {
        reports: [],
        artifacts: [{
          id: "artifact-existing",
          type: "OTHER",
          title: "기존 결과물",
          externalUrl: "https://example.com/existing",
          createdAt: new Date("2026-11-01T00:00:00Z"),
        }],
      },
    });

    render(await TeamArtifactsPage({ params: Promise.resolve({ teamId: workspace.id }) }));

    expect(screen.queryByRole("button", { name: "결과물 등록" })).not.toBeInTheDocument();
    const restriction = screen.getByRole("complementary", { name: "결과물 등록 기간 종료" });
    expect(within(restriction).getByText("등록 기간이 종료되어 기존 결과물만 확인할 수 있습니다.")).toBeInTheDocument();
    expect(within(restriction).getByText(/등록 종료/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "기존 결과물" })).toBeInTheDocument();
  });

  it("관리자는 결과물 등록 기간과 관계없이 운영 중인 프로젝트에 결과물을 등록할 수 있다", async () => {
    vi.setSystemTime(new Date("2026-08-04T00:00:00Z"));
    loadTeamReportWorkspace.mockResolvedValue({
      actor: { ...actor, id: "admin-1", role: "ADMIN" },
      workspace: {
        ...workspace,
        access: {
          isPrimaryAdvisor: false,
          isAssistant: false,
          isTeamMember: false,
          canSupervise: true,
          canContribute: true,
        },
      },
      reportWorkspace: { reports: [], artifacts: [] },
    });

    render(await TeamArtifactsPage({ params: Promise.resolve({ teamId: workspace.id }) }));

    expect(screen.getByRole("button", { name: "결과물 등록" })).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: /결과물 등록 기간/ })).not.toBeInTheDocument();
  });
});
