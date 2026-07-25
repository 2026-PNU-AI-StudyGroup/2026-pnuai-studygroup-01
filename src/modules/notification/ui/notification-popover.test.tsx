import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NotificationPopover } from "@/modules/notification/ui/notification-popover";

const openNotification = vi.fn();

const items = [
  {
    id: "notification-1",
    title: "중간 보고서 검토 완료",
    body: "교수님의 검토 의견을 확인해 주세요.",
    type: "REPORT_ACTIVITY" as const,
    read: false,
    createdAt: "2026-07-24T02:00:00.000Z",
  },
];

describe("NotificationPopover", () => {
  it("버튼을 누르면 최근 알림과 전체 알림 링크를 보여준다", () => {
    render(
      <NotificationPopover
        active={false}
        placement="side"
        unreadCount={1}
        items={items}
        openNotification={openNotification}
      />,
    );

    const trigger = screen.getByRole("button", { name: "읽지 않은 알림 1개" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "최근 알림" })).toBeInTheDocument();
    expect(screen.getByText("중간 보고서 검토 완료")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "전체 알림 보기" })).toHaveAttribute("href", "/notifications");
  });

  it("Esc를 누르면 팝오버를 닫고 버튼으로 초점을 돌린다", () => {
    render(
      <NotificationPopover
        active={false}
        placement="below"
        unreadCount={0}
        items={[]}
        openNotification={openNotification}
      />,
    );

    const trigger = screen.getByRole("button", { name: "알림" });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "최근 알림" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
