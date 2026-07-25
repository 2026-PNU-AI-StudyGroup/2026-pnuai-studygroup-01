import { describe, expect, it, vi } from "vitest";

import { GenerateDeadlineNotificationsService, NotificationNotFoundError, NotificationService } from "@/modules/notification/application/manage-notifications";
import type { DeadlineNotificationGenerator, NotificationRepository } from "@/modules/notification/application/notification-ports";

describe("알림 관리", () => {
  it("알림 미리보기는 최신 3개 조회를 요청한다", async () => {
    const repository = { preview: vi.fn().mockResolvedValue({ items: [], unreadCount: 0 }) } as unknown as NotificationRepository;

    await expect(new NotificationService(repository).preview("user-1")).resolves.toEqual({ items: [], unreadCount: 0 });
    expect(repository.preview).toHaveBeenCalledWith("user-1", 3);
  });

  it("본인 알림을 읽음 처리하고 내부 경로를 반환한다", async () => {
    const repository = { markRead: vi.fn().mockResolvedValue("/teams/team-1") } as unknown as NotificationRepository;
    await expect(new NotificationService(repository).open("user-1", "notification-1")).resolves.toBe("/teams/team-1");
    expect(repository.markRead).toHaveBeenCalledWith("user-1", "notification-1", expect.any(Date));
  });

  it("다른 사용자의 알림은 찾을 수 없는 것으로 처리한다", async () => {
    const repository = { markRead: vi.fn().mockResolvedValue(null) } as unknown as NotificationRepository;
    await expect(new NotificationService(repository).open("user-1", "notification-1")).rejects.toBeInstanceOf(NotificationNotFoundError);
  });

  it("현재 시각부터 7일 범위의 마감 알림을 생성한다", async () => {
    const generator = { generate: vi.fn().mockResolvedValue(3) } satisfies DeadlineNotificationGenerator;
    const now = new Date("2026-07-17T00:00:00.000Z");
    await expect(new GenerateDeadlineNotificationsService(generator).execute(now)).resolves.toBe(3);
    expect(generator.generate).toHaveBeenCalledWith(now, new Date("2026-07-24T00:00:00.000Z"));
  });
});
