import { describe, expect, it } from "vitest";

import {
  canCreateAnnouncement,
  canCreateSystemAnnouncement,
  canManageAnnouncement,
  canViewAnnouncement,
} from "@/modules/announcement/domain/announcement-policy";

describe("공지사항 권한 정책", () => {
  it("교수와 관리자만 공지를 작성할 수 있다", () => {
    expect(canCreateAnnouncement("STUDENT")).toBe(false);
    expect(canCreateAnnouncement("PROFESSOR")).toBe(true);
    expect(canCreateAnnouncement("ADMIN")).toBe(true);
  });

  it("시스템 공지는 관리자만 작성할 수 있다", () => {
    expect(canCreateSystemAnnouncement("STUDENT")).toBe(false);
    expect(canCreateSystemAnnouncement("PROFESSOR")).toBe(false);
    expect(canCreateSystemAnnouncement("ADMIN")).toBe(true);
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

  it("프로그램 전체 공개와 구성원 전용 열람을 구분한다", () => {
    const audience = { role: "STUDENT" as const, actorId: "student-1", teamIds: [], programIds: ["program-1"] };
    const base = { authorId: "professor-1", teamId: null, programId: "program-2" };

    expect(canViewAnnouncement(audience, { ...base, visibility: "AUTHENTICATED" })).toBe(true);
    expect(canViewAnnouncement(audience, { ...base, visibility: "TARGET_MEMBERS" })).toBe(false);
    expect(canViewAnnouncement(audience, { ...base, programId: "program-1", visibility: "TARGET_MEMBERS" })).toBe(true);
  });

  it("팀 공지는 열람 범위 값과 무관하게 소속 팀원만 읽는다", () => {
    const outsider = { role: "STUDENT" as const, actorId: "student-1", teamIds: [], programIds: [] };
    expect(canViewAnnouncement(outsider, {
      authorId: "professor-1",
      teamId: "team-1",
      programId: null,
      visibility: "AUTHENTICATED",
    })).toBe(false);
  });

  it("대상이 사라진 구성원 전용 공지를 전역 공지로 공개하지 않는다", () => {
    const outsider = { role: "STUDENT" as const, actorId: "student-1", teamIds: [], programIds: [] };
    expect(canViewAnnouncement(outsider, {
      authorId: "professor-1",
      teamId: null,
      programId: null,
      visibility: "TARGET_MEMBERS",
    })).toBe(false);
  });
});
