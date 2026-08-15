import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DiscussionPostForm } from "./discussion-post-form";

const { createDiscussionPostAction, replace } = vi.hoisted(() => ({
  createDiscussionPostAction: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/app/projects/[projectId]/_actions/team-workspace-actions", () => ({
  createDiscussionPostAction,
}));

describe("DiscussionPostForm", () => {
  beforeEach(() => {
    createDiscussionPostAction.mockReset();
    replace.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("최신 대화 페이지에서 첫 진입과 새 메시지 반영 후 하단을 보여준다", () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <>
        <div id="discussion-scroll" />
        <DiscussionPostForm
          teamId="team-1"
          authorName="정하늘"
          scrollContainerId="discussion-scroll"
          latestPostId="post-1"
          autoScrollToLatest
        />
      </>,
    );
    const container = document.getElementById("discussion-scroll")!;
    Object.defineProperty(container, "scrollHeight", { configurable: true, value: 840 });

    act(() => vi.runAllTimers());
    expect(container.scrollTop).toBe(840);

    Object.defineProperty(container, "scrollHeight", { configurable: true, value: 1_120 });
    rerender(
      <>
        <div id="discussion-scroll" />
        <DiscussionPostForm
          teamId="team-1"
          authorName="정하늘"
          scrollContainerId="discussion-scroll"
          latestPostId="post-2"
          autoScrollToLatest
        />
      </>,
    );
    act(() => vi.runAllTimers());
    expect(document.getElementById("discussion-scroll")!.scrollTop).toBe(1_120);
  });

  it("이전 대화 페이지에서는 사용자의 읽기 위치를 바꾸지 않는다", () => {
    vi.useFakeTimers();
    render(
      <>
        <div id="discussion-scroll" />
        <DiscussionPostForm
          teamId="team-1"
          authorName="정하늘"
          scrollContainerId="discussion-scroll"
          latestPostId="post-50"
          autoScrollToLatest={false}
        />
      </>,
    );
    const container = document.getElementById("discussion-scroll")!;
    container.scrollTop = 120;

    act(() => vi.runAllTimers());
    expect(container.scrollTop).toBe(120);
  });

  it("이전 대화에서 메시지를 보내면 최신 페이지로 이동한다", async () => {
    createDiscussionPostAction.mockResolvedValue({ status: "success", message: "메시지를 보냈습니다." });
    const { rerender } = render(
      <DiscussionPostForm
        teamId="team-1"
        authorName="정하늘"
        scrollContainerId="discussion-scroll"
        latestPostId="old-post"
        autoScrollToLatest={false}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "메시지" }), { target: { value: "새 결정 사항입니다." } });
    fireEvent.submit(screen.getByRole("textbox", { name: "메시지" }).closest("form")!);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/projects/team-1/discussion"));

    replace.mockClear();
    rerender(
      <DiscussionPostForm
        teamId="team-1"
        authorName="정하늘"
        scrollContainerId="discussion-scroll"
        latestPostId="latest-post"
        autoScrollToLatest
      />,
    );
    rerender(
      <DiscussionPostForm
        teamId="team-1"
        authorName="정하늘"
        scrollContainerId="discussion-scroll"
        latestPostId="old-post"
        autoScrollToLatest={false}
      />,
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("최신 대화에서 메시지를 보내면 같은 경로로 다시 이동하지 않는다", async () => {
    createDiscussionPostAction.mockResolvedValue({ status: "success", message: "메시지를 보냈습니다." });
    render(
      <DiscussionPostForm
        teamId="team-1"
        authorName="정하늘"
        latestPostId="latest-post"
        autoScrollToLatest
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "메시지" }), { target: { value: "최신 페이지 메시지" } });
    fireEvent.submit(screen.getByRole("textbox", { name: "메시지" }).closest("form")!);

    expect(await screen.findByText("메시지를 보냈습니다.")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("Enter로 메시지를 보낸다", async () => {
    createDiscussionPostAction.mockResolvedValue({ status: "success", message: "메시지를 보냈습니다." });
    render(<DiscussionPostForm teamId="team-1" authorName="정하늘" />);

    const textbox = screen.getByRole("textbox", { name: "메시지" });
    fireEvent.change(textbox, { target: { value: "Enter로 보냅니다." } });
    fireEvent.keyDown(textbox, { key: "Enter", code: "Enter" });

    await waitFor(() => expect(createDiscussionPostAction).toHaveBeenCalled());
  });

  it("Shift+Enter와 한글 조합 중 Enter는 줄바꿈으로 남긴다", () => {
    render(<DiscussionPostForm teamId="team-1" authorName="정하늘" />);

    const textbox = screen.getByRole("textbox", { name: "메시지" });
    fireEvent.change(textbox, { target: { value: "회의 일정" } });

    fireEvent.keyDown(textbox, { key: "Enter", code: "Enter", shiftKey: true });
    fireEvent.keyDown(textbox, { key: "Enter", code: "Enter", isComposing: true });
    expect(createDiscussionPostAction).not.toHaveBeenCalled();
  });

  it("전송 버튼은 접근 가능한 이름을 가진 아이콘 버튼으로 표시한다", () => {
    render(<DiscussionPostForm teamId="team-1" authorName="정하늘" />);

    expect(screen.getByRole("button", { name: "메시지 보내기" })).toBeInTheDocument();
    expect(screen.queryByText("보내기")).not.toBeInTheDocument();
  });
});
