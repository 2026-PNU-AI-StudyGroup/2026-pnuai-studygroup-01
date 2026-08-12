import { describe, expect, it } from "vitest";

import {
  buildDemoProgramAnnouncements,
  DEMO_PROGRAM_ANNOUNCEMENT_COUNTS,
  type DemoProgramAnnouncementProgram,
} from "./demo-program-announcements";

function program(index: number): DemoProgramAnnouncementProgram {
  const year = 2026 - index;
  return {
    name: `${year} 데모 프로그램 ${index + 1}`,
    startsAt: new Date(`${year}-03-01T00:00:00+09:00`),
    endsAt: new Date(`${year}-12-20T23:59:59+09:00`),
    recruitmentStartsAt: new Date(`${year}-03-01T00:00:00+09:00`),
    recruitmentEndsAt: new Date(`${year}-04-01T23:59:59+09:00`),
    executionStartsAt: new Date(`${year}-04-02T00:00:00+09:00`),
    executionEndsAt: new Date(`${year}-11-30T23:59:59+09:00`),
    submissionStartsAt: new Date(`${year}-12-01T00:00:00+09:00`),
    submissionEndsAt: new Date(`${year}-12-20T23:59:59+09:00`),
    lifecycleStatus: index < 3 ? "ACTIVE" : "CLOSED",
  };
}

describe("프로그램별 데모 공지", () => {
  it("2026 캡스톤은 6건이고 모든 프로그램의 공지 수가 서로 다르다", () => {
    const counts = DEMO_PROGRAM_ANNOUNCEMENT_COUNTS.map((_, index) => (
      buildDemoProgramAnnouncements(program(index), index).length
    ));

    expect(counts[0]).toBe(6);
    expect(new Set(counts).size).toBe(counts.length);
  });

  it("공지마다 고유한 공식 안내문과 결정적인 ID를 생성한다", () => {
    const announcements = DEMO_PROGRAM_ANNOUNCEMENT_COUNTS.flatMap((_, index) => (
      buildDemoProgramAnnouncements(program(index), index)
    ));

    expect(new Set(announcements.map(({ id }) => id)).size).toBe(announcements.length);
    expect(new Set(announcements.map(({ content }) => content)).size).toBe(announcements.length);
    for (const announcement of announcements) {
      expect(announcement.content.length).toBeGreaterThan(350);
      expect(announcement.content).toContain("기간:");
      expect(announcement.content).toContain("담당자:");
      expect(announcement.content).toContain("연락처:");
    }
  });
});
