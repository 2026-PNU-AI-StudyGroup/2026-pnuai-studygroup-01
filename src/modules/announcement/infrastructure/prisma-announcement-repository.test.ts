import { describe, expect, it } from "vitest";

import type { AnnouncementAudience } from "@/modules/announcement/application/announcement-ports";
import { announcementScopeWhere } from "@/modules/announcement/infrastructure/prisma-announcement-repository";

describe("공지 대상 스코프 where", () => {
  const admin: AnnouncementAudience = { role: "ADMIN", actorId: "admin-1", teamIds: [], programIds: [] };
  const student: AnnouncementAudience = { role: "STUDENT", actorId: "student-1", teamIds: ["team-1"], programIds: ["program-1"] };

  it("관리자는 제한 없이 전체 조회한다", () => {
    expect(announcementScopeWhere(admin)).toEqual({});
  });

  it("비관리자는 전체·본인 소속·작성분만 조회한다", () => {
    expect(announcementScopeWhere(student)).toEqual({
      OR: [
        { teamId: null, programId: null },
        { programId: { in: ["program-1"] } },
        { teamId: { in: ["team-1"] } },
        { authorId: "student-1" },
      ],
    });
  });
});
