import { describe, expect, it } from "vitest";

import { isAnnouncementAttachmentSetAllowed } from "@/modules/announcement/domain/announcement-attachment-policy";

describe("공지 첨부 묶음 정책", () => {
  it("5개 합계가 정확히 500MiB이면 허용한다", () => {
    expect(isAnnouncementAttachmentSetAllowed(Array.from({ length: 5 }, () => ({ size: 100 * 1024 * 1024 })))).toBe(true);
  });

  it("개수 또는 합계 용량을 초과하면 거부한다", () => {
    expect(isAnnouncementAttachmentSetAllowed(Array.from({ length: 6 }, () => ({ size: 1 })))).toBe(false);
    expect(isAnnouncementAttachmentSetAllowed([{ size: 500 * 1024 * 1024 + 1 }])).toBe(false);
  });
});
