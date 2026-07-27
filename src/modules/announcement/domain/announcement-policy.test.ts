import { describe, expect, it } from "vitest";

import {
  canCreateAnnouncement,
  canManageAnnouncement,
} from "@/modules/announcement/domain/announcement-policy";

describe("공지사항 권한 정책", () => {
  it("교수와 관리자만 공지를 작성할 수 있다", () => {
    expect(canCreateAnnouncement("STUDENT")).toBe(false);
    expect(canCreateAnnouncement("PROFESSOR")).toBe(true);
    expect(canCreateAnnouncement("ADMIN")).toBe(true);
  });

  it("교수는 자신의 공지만 관리할 수 있고 관리자는 모든 공지를 관리한다", () => {
    expect(canManageAnnouncement(
      { id: "professor-1", role: "PROFESSOR" },
      "professor-1",
    )).toBe(true);
    expect(canManageAnnouncement(
      { id: "professor-2", role: "PROFESSOR" },
      "professor-1",
    )).toBe(false);
    expect(canManageAnnouncement(
      { id: "student-1", role: "STUDENT" },
      "student-1",
    )).toBe(false);
    expect(canManageAnnouncement(
      { id: "admin-1", role: "ADMIN" },
      "professor-1",
    )).toBe(true);
  });
});
