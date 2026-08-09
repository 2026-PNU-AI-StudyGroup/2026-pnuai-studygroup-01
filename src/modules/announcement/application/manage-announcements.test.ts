import { describe, expect, it, vi } from "vitest";

import type {
  AnnouncementAudience,
  AnnouncementRecord,
  AnnouncementRepository,
} from "@/modules/announcement/application/announcement-ports";
import {
  AnnouncementForbiddenError,
  AnnouncementNotFoundError,
  AnnouncementService,
} from "@/modules/announcement/application/manage-announcements";

const announcement: AnnouncementRecord = {
  id: "notice-1",
  authorId: "professor-1",
  authorName: "김교수",
  authorRole: "PROFESSOR",
  title: "프로젝트 일정 안내",
  content: "일정을 확인해 주세요.",
  category: "GENERAL",
  pinned: false,
  teamId: null,
  teamName: null,
  programId: null,
  programName: null,
  createdAt: new Date("2026-07-27T00:00:00.000Z"),
  updatedAt: new Date("2026-07-27T00:00:00.000Z"),
};

function repository(
  overrides: Partial<AnnouncementRepository> = {},
): AnnouncementRepository {
  return {
    list: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  };
}

describe("공지사항 관리", () => {
  it("교수와 관리자는 공지를 작성할 수 있다", async () => {
    const announcements = repository({
      create: vi.fn(async () => announcement),
    });
    const service = new AnnouncementService(announcements);

    await expect(service.create(
      { id: "professor-1", role: "PROFESSOR" },
      { title: announcement.title, content: announcement.content, category: "GENERAL", pinned: false, teamId: null, programId: null },
    )).resolves.toEqual(announcement);
  });

  it("학생의 작성 요청은 저장소에 도달하지 않는다", async () => {
    const announcements = repository();
    const service = new AnnouncementService(announcements);

    await expect(service.create(
      { id: "student-1", role: "STUDENT" },
      { title: announcement.title, content: announcement.content, category: "GENERAL", pinned: false, teamId: null, programId: null },
    )).rejects.toBeInstanceOf(AnnouncementForbiddenError);
    expect(announcements.create).not.toHaveBeenCalled();
  });

  it("저장소의 권한 거부 결과를 애플리케이션 오류로 변환한다", async () => {
    const service = new AnnouncementService(repository({
      update: vi.fn(async () => "FORBIDDEN" as const),
    }));

    await expect(service.update(
      { id: "professor-2", role: "PROFESSOR" },
      announcement.id,
      { title: announcement.title, content: announcement.content, category: "GENERAL", pinned: false, teamId: null, programId: null },
    )).rejects.toBeInstanceOf(AnnouncementForbiddenError);
  });

  it("존재하지 않는 공지 삭제를 명확히 구분한다", async () => {
    const service = new AnnouncementService(repository({
      delete: vi.fn(async () => "NOT_FOUND" as const),
    }));

    await expect(service.delete(
      { id: "admin-1", role: "ADMIN" },
      "missing",
    )).rejects.toBeInstanceOf(AnnouncementNotFoundError);
  });
});

describe("공지 대상 스코프", () => {
  const admin: AnnouncementAudience = { role: "ADMIN", actorId: "admin-1", teamIds: [], programIds: [] };
  const student: AnnouncementAudience = { role: "STUDENT", actorId: "student-1", teamIds: ["team-1"], programIds: ["program-1"] };
  const scoped = (over: Partial<AnnouncementRecord>): AnnouncementRecord => ({ ...announcement, teamId: null, programId: null, ...over });

  it("전체 공지는 누구나 열람한다", () => {
    const service = new AnnouncementService(repository());
    expect(service.canView(student, scoped({}))).toBe(true);
  });

  it("팀 지정 공지는 소속 팀원만 열람한다", () => {
    const service = new AnnouncementService(repository());
    expect(service.canView(student, scoped({ teamId: "team-1" }))).toBe(true);
    expect(service.canView(student, scoped({ teamId: "team-9" }))).toBe(false);
    expect(service.canView(admin, scoped({ teamId: "team-9" }))).toBe(true);
  });

  it("프로그램 지정 공지는 소속 프로그램 구성원만 열람한다", () => {
    const service = new AnnouncementService(repository());
    expect(service.canView(student, scoped({ programId: "program-1" }))).toBe(true);
    expect(service.canView(student, scoped({ programId: "program-9" }))).toBe(false);
    expect(service.canView(student, scoped({ programId: "program-9", authorId: "student-1" }))).toBe(true);
  });
});
