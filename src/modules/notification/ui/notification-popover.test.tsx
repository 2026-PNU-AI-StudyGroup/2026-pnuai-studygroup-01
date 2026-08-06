import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NotificationPopover } from "@/modules/notification/ui/notification-popover";
import { I18nProvider } from "@/modules/translation/ui/i18n-provider";

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

  it("영어 모드에서 접근 이름과 읽지 않은 개수, 알림 종류를 영어로 보여준다", () => {
    render(
      <I18nProvider locale="en">
        <NotificationPopover
          active={false}
          placement="side"
          unreadCount={1}
          items={items}
          openNotification={openNotification}
        />
      </I18nProvider>,
    );

    const trigger = screen.getByRole("button", { name: "1 unread notification" });
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog", { name: "Recent notifications" })).toBeInTheDocument();
    expect(screen.getByText("1 unread")).toBeInTheDocument();
    expect(screen.getByText("Report")).toBeInTheDocument();
    expect(screen.queryByText("보고서")).not.toBeInTheDocument();
  });

  it("영어 모드에서 99개 초과 읽지 않은 알림을 영어 접근 이름으로 축약한다", () => {
    render(
      <I18nProvider locale="en">
        <NotificationPopover
          active={false}
          placement="side"
          unreadCount={120}
          items={[]}
          openNotification={openNotification}
        />
      </I18nProvider>,
    );

    const trigger = screen.getByRole("button", { name: "99 or more unread notifications" });
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog", { name: "Recent notifications" })).toBeInTheDocument();
    expect(screen.getByText("99 or more unread")).toBeInTheDocument();
  });

  it("데스크톱 역상 트리거는 보이는 알림 라벨까지 버튼에 포함한다", () => {
    render(
      <NotificationPopover
        active={false}
        placement="side"
        inverse
        unreadCount={0}
        items={[]}
        openNotification={openNotification}
      />,
    );

    expect(screen.getByRole("button", { name: "알림" })).toHaveTextContent("알림");
  });

  it("알림 페이지에서는 현재 목적지인 전체 알림 링크를 다시 제공하지 않는다", () => {
    render(
      <NotificationPopover
        active
        placement="side"
        unreadCount={1}
        items={items}
        openNotification={openNotification}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "읽지 않은 알림 1개" }));

    expect(screen.queryByRole("link", { name: "전체 알림 보기" })).not.toBeInTheDocument();
  });
});
