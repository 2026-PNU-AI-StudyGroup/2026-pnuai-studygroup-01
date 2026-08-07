import { describe, expect, it, vi } from "vitest";

import {
  StudentTeamRecruitmentCommandService,
  StudentTeamRecruitmentQueryService,
  type StudentTeamRecruitmentReader,
  type StudentTeamRecruitmentWriter,
} from "@/modules/student-team/application/manage-student-team-recruitment";

const actor = {
  id: "student-1",
  role: "STUDENT" as const,
  name: "김학생",
  email: "student@pusan.ac.kr",
  image: null,
};

function reader(): StudentTeamRecruitmentReader {
  return {
    listPosts: vi.fn(async () => ({
      posts: [],
      page: 1,
      totalPages: 1,
      total: 0,
    })),
    listLeaderTeams: vi.fn(async () => []),
    listAuthoredPosts: vi.fn(async () => ({
      posts: [],
      page: 1,
      totalPages: 1,
      total: 0,
    })),
    listApplicationHistory: vi.fn(async () => ({
      applications: [],
      page: 1,
      totalPages: 1,
      total: 0,
    })),
    findPostApplications: vi.fn(async () => null),
  };
}

function writer(): StudentTeamRecruitmentWriter {
  return {
    createPost: vi.fn(async () => true),
    apply: vi.fn(async () => "CREATED" as const),
    decide: vi.fn(async () => "ACCEPTED" as const),
  };
}

describe("학생 팀 모집 경계", () => {
  it("목록 조회는 읽기 포트에만 위임한다", async () => {
    const store = reader();

    await new StudentTeamRecruitmentQueryService(store).listPosts(actor, 2);

    expect(store.listPosts).toHaveBeenCalledWith(actor.id, 2);
  });

  it("모집 글 입력을 정규화해 변경 포트로 전달한다", async () => {
    const store = writer();
    const now = new Date("2026-08-07T00:00:00Z");

    await new StudentTeamRecruitmentCommandService(store, () => now).createPost(actor, {
      teamId: "team-1",
      title: " 백엔드 팀원 모집 ",
      content: " 함께 개발합니다. ",
      requiredSkills: [" TypeScript ", "TypeScript"],
      roleNeeded: " API 개발 ",
      availability: " 평일 저녁 ",
      capacity: 4,
      deadlineAt: new Date("2026-09-07T00:00:00Z"),
    });

    expect(store.createPost).toHaveBeenCalledWith({
      teamId: "team-1",
      leaderId: actor.id,
      title: "백엔드 팀원 모집",
      content: "함께 개발합니다.",
      requiredSkills: ["TypeScript"],
      roleNeeded: "API 개발",
      availability: "평일 저녁",
      capacity: 4,
      deadlineAt: new Date("2026-09-07T00:00:00Z"),
      createdAt: now,
    });
  });

  it("모집 마감은 등록 시점부터 한 달 이내로 제한한다", async () => {
    const now = new Date("2026-08-07T00:00:00Z");

    await expect(new StudentTeamRecruitmentCommandService(writer(), () => now).createPost(actor, {
      teamId: "team-1",
      title: "백엔드 팀원 모집",
      content: "함께 개발합니다.",
      requiredSkills: ["TypeScript"],
      roleNeeded: "API 개발",
      availability: "평일 저녁",
      capacity: 4,
      deadlineAt: new Date("2026-09-07T00:00:01Z"),
    })).rejects.toThrow("모집 마감은 등록 시점부터 최대 1개월 안에서 정해 주세요.");
  });
});
