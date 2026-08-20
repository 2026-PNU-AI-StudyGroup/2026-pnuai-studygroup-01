import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listWorkspace: vi.fn(),
}));

vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {} }));
vi.mock("@/modules/student-team/infrastructure/prisma-student-team-query-repository", () => ({
  PrismaStudentTeamQueryRepository: class {},
}));
vi.mock("@/modules/student-team/application/manage-student-teams", () => ({
  StudentTeamQueryService: class {
    listWorkspace = mocks.listWorkspace;
  },
}));

import { recruitMembersEntry } from "@/app/recruitments/_lib/recruit-members-entry";

const actor = { id: "student-1", role: "STUDENT" as const, name: "김하나", email: "s1@pusan.ac.kr", image: null };

function teams(...leaderIds: Array<{ id: string; leaderId: string }>) {
  mocks.listWorkspace.mockResolvedValue({ teams: leaderIds, invitations: [] });
}

describe("recruitMembersEntry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("팀장인 팀이 없으면 팀 만들기로 보낸다", async () => {
    teams({ id: "team-9", leaderId: "other" });

    await expect(recruitMembersEntry(actor)).resolves.toEqual({
      href: "/teams?modal=create",
      label: "팀 만들기",
    });
  });

  it("팀장인 팀이 하나면 공고 작성 창을 바로 연다", async () => {
    // 예전에는 네 단계를 거쳐야 도달하던 화면이다.
    teams({ id: "team-1", leaderId: "student-1" }, { id: "team-2", leaderId: "other" });

    await expect(recruitMembersEntry(actor)).resolves.toEqual({
      href: "/teams/manage/team-1?modal=recruitment",
      label: "팀원 모집하기",
    });
  });

  it("팀장인 팀이 여러 개면 어느 팀으로 모집할지 고르게 한다", async () => {
    teams({ id: "team-1", leaderId: "student-1" }, { id: "team-2", leaderId: "student-1" });

    await expect(recruitMembersEntry(actor)).resolves.toEqual({
      href: "/teams",
      label: "팀원 모집하기",
    });
  });
});
