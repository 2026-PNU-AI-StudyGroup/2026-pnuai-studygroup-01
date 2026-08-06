import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TeamDiscussionPage from "@/app/teams/[teamId]/discussion/page";

const { loadTeamWorkspace } = vi.hoisted(() => ({
  loadTeamWorkspace: vi.fn(),
}));

vi.mock("@/app/teams/[teamId]/_lib/team-workspace-data", () => ({
  loadTeamWorkspace,
}));

vi.mock("@/modules/translation/infrastructure/localized-metadata", () => ({
  getLocalizedMetadata: vi.fn(),
}));

vi.mock("@/app/_components/translated-text", () => ({
  TranslatedText: ({ text, className }: { text: string; className?: string }) => <span className={className}>{text}</span>,
}));

vi.mock("@/app/teams/[teamId]/_components/discussion-post-form", () => ({
  DiscussionPostForm: ({
    scrollContainerId,
    latestPostId,
    autoScrollToLatest,
  }: {
    scrollContainerId?: string;
    latestPostId?: string;
    autoScrollToLatest?: boolean;
  }) => (
    <form
      aria-label="메시지 작성"
      data-scroll-container-id={scrollContainerId}
      data-latest-post-id={latestPostId}
      data-auto-scroll-to-latest={String(autoScrollToLatest)}
    />
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
  status: "CONFIRMED" as const,
  advisorEnabled: true,
  professorName: "김도윤",
  members: [{ id: "student-1", name: "정하늘", email: "student@pusan.ac.kr" }],
  discussionPosts: [
    {
      id: "post-1",
      authorId: "professor-1",
      authorName: "김도윤",
      content: "발표 범위를 먼저 정리해 주세요.",
      createdAt: new Date("2026-08-03T01:00:00.000Z"),
    },
    {
      id: "post-2",
      authorId: "student-1",
      authorName: "정하늘",
      content: "오늘 안에 초안을 공유하겠습니다.",
      createdAt: new Date("2026-08-04T02:00:00.000Z"),
    },
  ],
  discussionPage: 2,
  discussionTotalPages: 3,
  discussionTotal: 30,
};

describe("TeamDiscussionPage", () => {
  beforeEach(() => {
    loadTeamWorkspace.mockResolvedValue({ actor, workspace });
  });

  it("대화 계약을 유지하면서 메시지와 참여자를 하나의 흰색 패널로 묶는다", async () => {
    const { container } = render(await TeamDiscussionPage({
      params: Promise.resolve({ teamId: "team-1" }),
      searchParams: Promise.resolve({ page: "2" }),
    }));

    expect(loadTeamWorkspace).toHaveBeenCalledWith("team-1", 2);

    const page = screen.getByRole("region", { name: "팀 대화" });
    expect(page).toHaveClass("mx-auto", "w-full", "max-w-6xl");
    expect(screen.getByRole("heading", { name: "팀 대화" }).closest("header")).not.toHaveClass("border-b");

    const participantPanel = screen.getByRole("complementary", { name: "대화 참여자" });
    const discussionPanel = participantPanel.parentElement;
    expect(discussionPanel).toHaveClass(
      "overflow-hidden",
      "rounded-[var(--radius-panel)]",
      "border",
      "bg-white",
    );
    const messageLog = screen.getByRole("log", { name: "팀 대화" });
    expect(messageLog).toHaveAttribute("tabindex", "0");
    expect(discussionPanel).toContainElement(messageLog);
    expect(discussionPanel).toContainElement(container.querySelector("[data-discussion-scroll-container]"));
    expect(discussionPanel).toContainElement(screen.getByLabelText("메시지 작성"));

    const otherMessage = screen.getByRole("article", { name: "김도윤의 메시지" });
    expect(within(otherMessage).getByText("발표 범위를 먼저 정리해 주세요.").parentElement).toHaveClass(
      "border-[var(--line-strong)]",
      "bg-[var(--surface-subtle)]",
    );
    const ownMessage = screen.getByRole("article", { name: "정하늘의 메시지" });
    expect(within(ownMessage).getByText("오늘 안에 초안을 공유하겠습니다.").parentElement).toHaveClass(
      "bg-[var(--primary-subtle)]",
    );

    expect(screen.getByRole("link", { name: "최근 대화" })).toHaveAttribute("href", "/teams/team-1/discussion?page=1");
    expect(screen.getByRole("link", { name: "이전 대화" })).toHaveAttribute("href", "/teams/team-1/discussion?page=3");
    expect(screen.getByLabelText("메시지 작성")).toHaveAttribute("data-scroll-container-id", "team-discussion-messages");
    expect(screen.getByLabelText("메시지 작성")).toHaveAttribute("data-latest-post-id", "post-2");
    expect(screen.getByLabelText("메시지 작성")).toHaveAttribute("data-auto-scroll-to-latest", "false");
  });

  it("종료된 프로젝트에서는 패널 안에 작성기 대신 종료 안내를 표시한다", async () => {
    loadTeamWorkspace.mockResolvedValue({
      actor,
      workspace: { ...workspace, status: "CLOSED", discussionPosts: [], discussionTotal: 0 },
    });

    render(await TeamDiscussionPage({
      params: Promise.resolve({ teamId: "team-1" }),
      searchParams: Promise.resolve({}),
    }));

    expect(screen.queryByLabelText("메시지 작성")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "아직 나눈 대화가 없습니다" })).toBeInTheDocument();
    expect(screen.getByText("프로젝트 종료 전에 나눈 대화가 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("종료된 프로젝트에서는 새 메시지를 보낼 수 없습니다.")).toBeInTheDocument();
  });

  it("운영 중 빈 대화에서도 시작 안내와 작성기를 함께 유지한다", async () => {
    loadTeamWorkspace.mockResolvedValue({
      actor,
      workspace: { ...workspace, discussionPosts: [], discussionTotal: 0 },
    });

    render(await TeamDiscussionPage({
      params: Promise.resolve({ teamId: "team-1" }),
      searchParams: Promise.resolve({}),
    }));

    expect(screen.getByRole("heading", { name: "아직 나눈 대화가 없습니다" })).toBeInTheDocument();
    expect(screen.getByText("질문이나 의견을 작성해 대화를 시작하세요.")).toBeInTheDocument();
    expect(screen.getByLabelText("메시지 작성")).toBeInTheDocument();
  });
});
