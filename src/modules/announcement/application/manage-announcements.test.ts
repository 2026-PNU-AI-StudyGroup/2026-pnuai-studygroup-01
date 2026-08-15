import { describe, expect, it, vi } from "vitest";

import type {
  AnnouncementAudience,
  AnnouncementRecord,
  AnnouncementRepository,
} from "@/modules/announcement/application/announcement-ports";
import {
  AnnouncementForbiddenError,
  InvalidAnnouncementAttachmentsError,
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
  visibility: "AUTHENTICATED",
  pinned: false,
  teamId: null,
  teamName: null,
  projectId: null,
  programId: null,
  programName: null,
  createdAt: new Date("2026-07-27T00:00:00.000Z"),
  updatedAt: new Date("2026-07-27T00:00:00.000Z"),
  attachments: [],
};
const noAttachments = { retainedAttachmentIds: [], newAttachmentUploadIds: [] };
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
    listSystem: vi.fn(),
    listForProgram: vi.fn(),
    listForTeam: vi.fn(),
    listForTeamOverview: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  };
}

describe("공지사항 관리", () => {
  it("교수는 소관 프로그램 공지를 작성할 수 있다", async () => {
    const announcements = repository({
      create: vi.fn(async () => announcement),
    });
    const service = new AnnouncementService(announcements);

    await expect(service.create(
      { id: "professor-1", role: "PROFESSOR" },
      professorAudience,
      { title: announcement.title, content: announcement.content, visibility: "AUTHENTICATED", pinned: false, teamId: null, programId: "program-1", ...noAttachments },
    )).resolves.toEqual(announcement);
  });

  it("시스템 공지는 관리자만 작성할 수 있다", async () => {
    const create = vi.fn(async () => announcement);
    const service = new AnnouncementService(repository({ create }));
    const input = { title: announcement.title, content: announcement.content, visibility: "AUTHENTICATED" as const, pinned: false, teamId: null, programId: null, ...noAttachments };

    await expect(service.create(
      { id: "professor-1", role: "PROFESSOR" },
      professorAudience,
      input,
    )).rejects.toBeInstanceOf(AnnouncementForbiddenError);
    await expect(service.create(
      { id: "admin-1", role: "ADMIN" },
      { role: "ADMIN", actorId: "admin-1", teamIds: [], programIds: [] },
      input,
    )).resolves.toEqual(announcement);
  });

  it("학생의 작성 요청은 저장소에 도달하지 않는다", async () => {
    const announcements = repository();
    const service = new AnnouncementService(announcements);

    await expect(service.create(
      { id: "student-1", role: "STUDENT" },
      { role: "STUDENT", actorId: "student-1", teamIds: [], programIds: [] },
      { title: announcement.title, content: announcement.content, visibility: "AUTHENTICATED", pinned: false, teamId: null, programId: null, ...noAttachments },
    )).rejects.toBeInstanceOf(AnnouncementForbiddenError);
    expect(announcements.create).not.toHaveBeenCalled();
  });

  it("다른 작성자의 공지는 저장소 호출 전에 거부한다", async () => {
    const service = new AnnouncementService(repository({
      findById: vi.fn(async () => announcement),
      update: vi.fn(async () => "FORBIDDEN" as const),
    }));

    await expect(service.update(
      { id: "professor-2", role: "PROFESSOR" },
      { role: "PROFESSOR", actorId: "professor-2", teamIds: [], programIds: [] },
      announcement.id,
      { title: announcement.title, content: announcement.content, visibility: "AUTHENTICATED", pinned: false, teamId: null, programId: null, ...noAttachments },
    )).rejects.toBeInstanceOf(AnnouncementForbiddenError);
  });

  it("수정할 때 공지 범위를 다른 대상으로 바꿀 수 없다", async () => {
    const update = vi.fn(async () => "UPDATED" as const);
    const service = new AnnouncementService(repository({
      findById: vi.fn(async () => ({ ...announcement, programId: "program-1" })),
      update,
    }));

    await expect(service.update(
      { id: "professor-1", role: "PROFESSOR" },
      professorAudience,
      announcement.id,
      { title: announcement.title, content: announcement.content, visibility: "AUTHENTICATED", pinned: false, teamId: null, programId: null, ...noAttachments },
    )).rejects.toBeInstanceOf(AnnouncementForbiddenError);
    expect(update).not.toHaveBeenCalled();
  });

  it("팀 공지의 전체 공개 입력을 구성원 전용으로 강제한다", async () => {
    const create = vi.fn(async () => announcement);
    const service = new AnnouncementService(repository({ create }));

    await service.create(
      { id: "professor-1", role: "PROFESSOR" },
      professorAudience,
      { title: announcement.title, content: announcement.content, visibility: "AUTHENTICATED", pinned: false, teamId: "team-1", programId: null, ...noAttachments },
    );

    expect(create).toHaveBeenCalledWith({ id: "professor-1", role: "PROFESSOR" }, expect.objectContaining({ visibility: "TARGET_MEMBERS" }));
  });

  it("팀과 프로그램 대상이 함께 들어오면 팀 대상만 유지한다", async () => {
    const create = vi.fn(async () => announcement);
    const service = new AnnouncementService(repository({ create }));

    await service.create(
      { id: "professor-1", role: "PROFESSOR" },
      professorAudience,
      { title: announcement.title, content: announcement.content, visibility: "AUTHENTICATED", pinned: false, teamId: "team-1", programId: "program-1", ...noAttachments },
    );

    expect(create).toHaveBeenCalledWith({ id: "professor-1", role: "PROFESSOR" }, expect.objectContaining({
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
      { title: announcement.title, content: announcement.content, visibility: "TARGET_MEMBERS", pinned: false, teamId: null, programId: "program-1", ...noAttachments },
    );

    expect(create).toHaveBeenCalledWith({ id: "professor-1", role: "PROFESSOR" }, expect.objectContaining({ visibility: "TARGET_MEMBERS" }));
  });

  it("교수 소관이 아닌 프로그램·팀 대상은 저장소 호출 전에 거부한다", async () => {
    const create = vi.fn(async () => announcement);
    const service = new AnnouncementService(repository({ create }));

    await expect(service.create(
      { id: "professor-1", role: "PROFESSOR" },
      professorAudience,
      { title: announcement.title, content: announcement.content, visibility: "AUTHENTICATED", pinned: false, teamId: null, programId: "program-9", ...noAttachments },
    )).rejects.toBeInstanceOf(AnnouncementForbiddenError);
    expect(create).not.toHaveBeenCalled();
  });

  it("첨부 5개 제한과 중복 ID를 저장소 호출 전에 거부한다", async () => {
    const create = vi.fn(async () => announcement);
    const service = new AnnouncementService(repository({ create }));
    const base = { title: announcement.title, content: announcement.content, visibility: "AUTHENTICATED" as const, pinned: false, teamId: null, programId: "program-1", retainedAttachmentIds: [] };

    await expect(service.create(
      { id: "professor-1", role: "PROFESSOR" },
      professorAudience,
      { ...base, newAttachmentUploadIds: Array.from({ length: 6 }, (_, index) => `file-${index}`) },
    )).rejects.toBeInstanceOf(InvalidAnnouncementAttachmentsError);
    await expect(service.create(
      { id: "professor-1", role: "PROFESSOR" },
      professorAudience,
      { ...base, newAttachmentUploadIds: ["file-1", "file-1"] },
    )).rejects.toBeInstanceOf(InvalidAnnouncementAttachmentsError);
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
