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
  visibility: "AUTHENTICATED",
  pinned: false,
  teamId: null,
  teamName: null,
  programId: null,
  programName: null,
  createdAt: new Date("2026-07-27T00:00:00.000Z"),
  updatedAt: new Date("2026-07-27T00:00:00.000Z"),
};
const professorAudience: AnnouncementAudience = {
  role: "PROFESSOR",
  actorId: "professor-1",
  teamIds: ["team-1"],
  programIds: ["program-1"],
};

function repository(
  overrides: Partial<AnnouncementRepository> = {},
): AnnouncementRepository {
  return {
    list: vi.fn(),
    listForProgram: vi.fn(),
    listForTeam: vi.fn(),
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
      professorAudience,
      { title: announcement.title, content: announcement.content, category: "GENERAL", visibility: "AUTHENTICATED", pinned: false, teamId: null, programId: null },
    )).resolves.toEqual(announcement);
  });

  it("학생의 작성 요청은 저장소에 도달하지 않는다", async () => {
    const announcements = repository();
    const service = new AnnouncementService(announcements);

    await expect(service.create(
      { id: "student-1", role: "STUDENT" },
      { role: "STUDENT", actorId: "student-1", teamIds: [], programIds: [] },
      { title: announcement.title, content: announcement.content, category: "GENERAL", visibility: "AUTHENTICATED", pinned: false, teamId: null, programId: null },
    )).rejects.toBeInstanceOf(AnnouncementForbiddenError);
    expect(announcements.create).not.toHaveBeenCalled();
  });

  it("저장소의 권한 거부 결과를 애플리케이션 오류로 변환한다", async () => {
    const service = new AnnouncementService(repository({
      update: vi.fn(async () => "FORBIDDEN" as const),
    }));

    await expect(service.update(
      { id: "professor-2", role: "PROFESSOR" },
      { role: "PROFESSOR", actorId: "professor-2", teamIds: [], programIds: [] },
      announcement.id,
      { title: announcement.title, content: announcement.content, category: "GENERAL", visibility: "AUTHENTICATED", pinned: false, teamId: null, programId: null },
    )).rejects.toBeInstanceOf(AnnouncementForbiddenError);
  });

  it("팀 공지의 전체 공개 입력을 구성원 전용으로 강제한다", async () => {
    const create = vi.fn(async () => announcement);
    const service = new AnnouncementService(repository({ create }));

    await service.create(
      { id: "professor-1", role: "PROFESSOR" },
      professorAudience,
      { title: announcement.title, content: announcement.content, category: "GENERAL", visibility: "AUTHENTICATED", pinned: false, teamId: "team-1", programId: null },
    );

    expect(create).toHaveBeenCalledWith("professor-1", expect.objectContaining({ visibility: "TARGET_MEMBERS" }));
  });

  it("팀과 프로그램 대상이 함께 들어오면 팀 대상만 유지한다", async () => {
    const create = vi.fn(async () => announcement);
    const service = new AnnouncementService(repository({ create }));

    await service.create(
      { id: "professor-1", role: "PROFESSOR" },
      professorAudience,
      { title: announcement.title, content: announcement.content, category: "GENERAL", visibility: "AUTHENTICATED", pinned: false, teamId: "team-1", programId: "program-1" },
    );

    expect(create).toHaveBeenCalledWith("professor-1", expect.objectContaining({
      teamId: "team-1",
      programId: null,
      visibility: "TARGET_MEMBERS",
    }));
  });

  it("프로그램 공지는 작성자가 선택한 열람 범위를 유지한다", async () => {
    const create = vi.fn(async () => announcement);
    const service = new AnnouncementService(repository({ create }));

    await service.create(
      { id: "professor-1", role: "PROFESSOR" },
      professorAudience,
      { title: announcement.title, content: announcement.content, category: "GENERAL", visibility: "TARGET_MEMBERS", pinned: false, teamId: null, programId: "program-1" },
    );

    expect(create).toHaveBeenCalledWith("professor-1", expect.objectContaining({ visibility: "TARGET_MEMBERS" }));
  });

  it("교수 소관이 아닌 프로그램·팀 대상은 저장소 호출 전에 거부한다", async () => {
    const create = vi.fn(async () => announcement);
    const service = new AnnouncementService(repository({ create }));

    await expect(service.create(
      { id: "professor-1", role: "PROFESSOR" },
      professorAudience,
      { title: announcement.title, content: announcement.content, category: "GENERAL", visibility: "AUTHENTICATED", pinned: false, teamId: null, programId: "program-9" },
    )).rejects.toBeInstanceOf(AnnouncementForbiddenError);
    expect(create).not.toHaveBeenCalled();
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

  it("전체 공개 프로그램 공지는 비소속 사용자도 열람한다", () => {
    const service = new AnnouncementService(repository());
    expect(service.canView(student, scoped({ programId: "program-9", visibility: "AUTHENTICATED" }))).toBe(true);
  });

  it("구성원 전용 프로그램 공지는 소속·작성자·관리자만 열람한다", () => {
    const service = new AnnouncementService(repository());
    expect(service.canView(student, scoped({ programId: "program-1", visibility: "TARGET_MEMBERS" }))).toBe(true);
    expect(service.canView(student, scoped({ programId: "program-9", visibility: "TARGET_MEMBERS" }))).toBe(false);
    expect(service.canView(student, scoped({ programId: "program-9", visibility: "TARGET_MEMBERS", authorId: "student-1" }))).toBe(true);
    expect(service.canView(admin, scoped({ programId: "program-9", visibility: "TARGET_MEMBERS" }))).toBe(true);
  });
});
