import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaAdminProjectCardDataReader } from "@/modules/team/infrastructure/prisma-admin-project-card-data-reader";

describe("PrismaAdminProjectCardDataReader", () => {
  it("팀 정보와 필수 보고서 제출 현황을 관리자 카드 데이터로 변환한다", async () => {
    const findMany = vi.fn().mockResolvedValue([{
      id: "team-1",
      name: "알파팀",
      projectId: "topic-1",
      memberships: [{
        role: "LEADER",
        user: {
          id: "student-1",
          name: "김학생",
          email: "school@example.com",
          contactEmail: "student@example.com",
          phoneNumber: "010-0000-0000",
          studentProfile: {
            phone: "010-1234-5678",
            kakao: "student-kakao",
            github: "student-github",
            instagram: "student-instagram",
          },
        },
      }],
      reports: [
        { dueAt: new Date("2026-08-01T00:00:00Z"), versions: [] },
        { dueAt: new Date("2026-08-20T00:00:00Z"), versions: [{ id: "version-1" }] },
      ],
    }]);
    const client = { projectTeam: { findMany } } as unknown as PrismaClient;
    const reader = new PrismaAdminProjectCardDataReader(
      client,
      () => new Date("2026-08-13T00:00:00Z"),
    );

    const result = await reader.listByTopicIds(["topic-1"]);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { projectId: { in: ["topic-1"] } },
      select: expect.objectContaining({
        reports: expect.objectContaining({ where: { required: true, submissionEnabled: true } }),
      }),
    }));
    expect(result).toEqual([{
      topicId: "topic-1",
      team: {
        id: "team-1",
        name: "알파팀",
        members: [{
          id: "student-1",
          name: "김학생",
          role: "LEADER",
          email: "school@example.com",
          contactEmail: "student@example.com",
          phone: "010-1234-5678",
          kakao: "student-kakao",
          github: "student-github",
          instagram: "student-instagram",
        }],
      },
      reportProgress: {
        requiredCount: 2,
        submittedCount: 1,
        overdueCount: 1,
      },
    }]);
  });
});
