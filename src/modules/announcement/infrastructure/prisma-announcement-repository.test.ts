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
        { teamId: null, programId: null, visibility: "AUTHENTICATED" },
        { teamId: null, programId: { not: null }, visibility: "AUTHENTICATED" },
        { teamId: null, programId: { in: ["program-1"] } },
        { teamId: { in: ["team-1"] } },
        { authorId: "student-1" },
      ],
    });
  });

  it("프로그램 조회는 대상 programId와 권한을 적용하고 개수 제한 없이 정렬한다", async () => {
    const createdAt = new Date("2026-08-11T00:00:00.000Z");
    const findMany = vi.fn(async () => [{
      id: "notice-1",
      authorId: "professor-1",
      title: "일정 안내",
      content: "내용",
      category: "GENERAL" as const,
      visibility: "AUTHENTICATED" as const,
      pinned: true,
      teamId: null,
      programId: "program-2",
      createdAt,
      updatedAt: createdAt,
      author: { name: "김교수", role: "PROFESSOR" as const },
      team: null,
      program: { name: "프로그램 2" },
    }]);
    const repository = new PrismaAnnouncementRepository({
      announcement: { findMany },
    } as unknown as PrismaClient);

    const result = await repository.listForProgram(student, "program-2");

    expect(findMany).toHaveBeenCalledWith({
      where: {
        programId: "program-2",
        teamId: null,
        ...announcementScopeWhere(student),
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: expect.any(Object),
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "notice-1", visibility: "AUTHENTICATED", programId: "program-2" });
  });
});
