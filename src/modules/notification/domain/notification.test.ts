import { describe, expect, it } from "vitest";

import { normalizeNotificationHref } from "@/modules/notification/domain/notification";

describe("알림 이동 경로", () => {
  it("서비스 내부 경로만 허용한다", () => {
    expect(normalizeNotificationHref("/teams/team-1")).toBe("/teams/team-1");
    expect(normalizeNotificationHref("https://example.com")).toBe("/notifications");
    expect(normalizeNotificationHref("//example.com")).toBe("/notifications");
  });
});
