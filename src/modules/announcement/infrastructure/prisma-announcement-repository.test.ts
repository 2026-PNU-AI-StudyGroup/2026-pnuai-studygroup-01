import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import type { AnnouncementAudience } from "@/modules/announcement/application/announcement-ports";
import {
  announcementScopeWhere,
  PrismaAnnouncementRepository,
} from "@/modules/announcement/infrastructure/prisma-announcement-repository";

describe("공지 대상 스코프 where", () => {
  const admin: AnnouncementAudience = { role: "ADMIN", actorId: "admin-1", teamIds: [], programIds: [] };
  const student: AnnouncementAudience = { role: "STUDENT", actorId: "student-1", teamIds: ["team-1"], programIds: ["program-1"] };

  it("관리자는 제한 없이 전체 조회한다", () => {
    expect(announcementScopeWhere(admin)).toEqual({});
  });

  it("비관리자는 전체·본인 소속·작성분만 조회한다", () => {
    expect(announcementScopeWhere(student)).toEqual({
      OR: [
        { projectTeamId: null, programId: null, visibility: "AUTHENTICATED" },
        { projectTeamId: null, programId: { not: null }, visibility: "AUTHENTICATED" },
        { projectTeamId: null, programId: { in: ["program-1"] } },
        { projectTeamId: { in: ["team-1"] } },
        { authorId: "student-1" },
      ],
    });
  });

  it("시스템 공지 목록은 프로그램·프로젝트 공지를 제외한다", async () => {
    const findMany = vi.fn(async () => []);
    const count = vi.fn(async () => 0);
    const repository = new PrismaAnnouncementRepository({
      announcement: { findMany, count },
      $transaction: vi.fn(async (queries: Array<Promise<unknown>>) => Promise.all(queries)),
    } as unknown as PrismaClient);

    await repository.listSystem(admin, 1, 20);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ projectTeamId: null, programId: null }),
    }));
    expect(count).toHaveBeenCalledWith({
      where: expect.objectContaining({ projectTeamId: null, programId: null }),
    });
  });

  it("프로그램 조회는 대상 programId와 권한을 적용하고 개수 제한 없이 정렬한다", async () => {
    const createdAt = new Date("2026-08-11T00:00:00.000Z");
    const findMany = vi.fn(async () => [{
      id: "notice-1",
      authorId: "professor-1",
      title: "일정 안내",
      content: "내용",
      visibility: "AUTHENTICATED" as const,
      pinned: true,
      projectTeamId: null,
      programId: "program-2",
      createdAt,
      updatedAt: createdAt,
      author: { name: "김교수", role: "PROFESSOR" as const },
      projectTeam: null,
      program: { name: "프로그램 2" },
      attachments: [],
    }]);
    const repository = new PrismaAnnouncementRepository({
      announcement: { findMany },
    } as unknown as PrismaClient);

    const result = await repository.listForProgram(student, "program-2");

    expect(findMany).toHaveBeenCalledWith({
      where: {
        programId: "program-2",
        projectTeamId: null,
        ...announcementScopeWhere(student),
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: expect.any(Object),
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "notice-1", visibility: "AUTHENTICATED", programId: "program-2" });
  });

  it("프로젝트 조회는 대상 teamId와 권한을 적용하고 고정 공지를 먼저 정렬한다", async () => {
    const findMany = vi.fn(async () => []);
    const repository = new PrismaAnnouncementRepository({
      announcement: { findMany },
    } as unknown as PrismaClient);

    await repository.listForTeam(student, "team-1");

    expect(findMany).toHaveBeenCalledWith({
      where: {
        projectTeamId: "team-1",
        programId: null,
        ...announcementScopeWhere(student),
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: expect.any(Object),
    });
  });

  it("프로젝트 개요 조회는 해당 프로젝트 공지와 전체 공지만 포함한다", async () => {
    const findMany = vi.fn(async () => []);
    const repository = new PrismaAnnouncementRepository({
      announcement: { findMany },
    } as unknown as PrismaClient);

    await repository.listForTeamOverview(student, "team-1");

    expect(findMany).toHaveBeenCalledWith({
      where: {
        AND: [
          {
            OR: [
              { projectTeamId: "team-1", programId: null },
              { projectTeamId: null, programId: null },
            ],
          },
          announcementScopeWhere(student),
        ],
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: expect.any(Object),
    });
  });
});
