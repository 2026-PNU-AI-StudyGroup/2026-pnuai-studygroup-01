import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NotificationCenter } from "@/modules/notification/ui/notification-center";

describe("NotificationCenter", () => {
  it("알림 행 전체를 하나의 열기 버튼으로 제공한다", () => {
    render(
      <NotificationCenter
        data={{
          items: [{
            id: "notification-1",
            type: "REPORT_ACTIVITY",
            title: "중간 보고서 검토 완료",
            body: "교수님의 검토 의견을 확인해 주세요.",
            href: "/teams/team-1/reports",
            readAt: null,
            createdAt: new Date("2026-07-24T02:00:00.000Z"),
          }],
          unreadCount: 1,
          page: 1,
          totalPages: 1,
          total: 1,
        }}
        openNotification={vi.fn()}
        markAllRead={vi.fn()}
      />,
    );

    const rowButton = screen.getByRole("button", { name: /중간 보고서 검토 완료/ });
    expect(rowButton).toHaveClass("record-row", "w-full");
    expect(within(rowButton).getByRole("heading", { name: "중간 보고서 검토 완료" })).toBeInTheDocument();
    expect(within(rowButton).getByText("확인")).toBeInTheDocument();
    expect(rowButton.parentElement).toHaveAttribute("action");
  });
});
