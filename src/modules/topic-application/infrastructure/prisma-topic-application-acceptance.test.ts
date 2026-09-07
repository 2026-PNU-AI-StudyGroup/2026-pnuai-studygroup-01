import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaTopicApplicationAcceptance } from "@/modules/topic-application/infrastructure/prisma-topic-application-acceptance";

const decidedAt = new Date("2026-09-07T00:00:00Z");
const professor = { id: "professor-1", isAdmin: false };

/**
 * 승인 경로의 중복 소속 검사만 본다.
 *
 * 검사에 닿기까지 잠금 질의가 여러 번 지나간다. 원시 질의는 순서대로 정해진 값을 돌려주고,
 * 검사 자리에서 무엇을 물었는지 잡는다.
 */
function clientReachingMembershipCheck(membership: { id: string } | null) {
  // 인자 자리를 적어 두어야 mock.calls 에서 where 를 꺼내 볼 수 있다.
  const findFirst = vi.fn<(args: { where?: unknown }) => Promise<{ id: string } | null>>(async () => membership);
  const queryRaw = vi.fn()
    // 프로그램 잠금
    .mockResolvedValueOnce([{ endsAt: new Date("2027-01-01"), studentProjectCreationEnabled: false }])
    // 주제 잠금
    .mockResolvedValueOnce([{ status: "ACTIVE" }])
    // 이 주제의 프로젝트 팀
    .mockResolvedValueOnce([])
    // 지원자 계정
    .mockResolvedValueOnce([{ id: "student-1", role: "STUDENT", accountStatus: "ACTIVE" }]);

  const transaction = {
    topicApplication: {
      findUnique: vi.fn()
        .mockResolvedValueOnce({ studentId: "student-1", topicId: "topic-a", groupId: null })
        .mockResolvedValueOnce({
          id: "application-1",
          studentId: "student-1",
          topicId: "topic-a",
          status: "PENDING",
          topic: {
            id: "topic-a",
            title: "가 주제",
            authorId: "professor-1",
            managerId: "professor-1",
            assistants: [],
            programId: "program-1",
            capacity: 4,
            status: "ACTIVE",
          },
          recruitmentApplication: null,
        }),
    },
    projectTeamMembership: { findFirst },
    $queryRaw: queryRaw,
  };

  const client = {
    $transaction: vi.fn(async (run: (tx: unknown) => Promise<unknown>) => run(transaction)),
  } as unknown as PrismaClient;
  return { client, findFirst };
}

describe("지원 승인의 중복 소속 검사", () => {
  it("이 프로그램의 다른 프로젝트 팀에 이미 있으면 승인하지 않는다", async () => {
    // 지원할 때는 프로그램 단위로 막는데 승인은 그 주제 팀만 봤다. 한 프로그램의 서로 다른
    // 주제 둘에 지원해 두면 둘 다 승인돼 같은 학생이 팀 두 곳에 소속됐다.
    const { client, findFirst } = clientReachingMembershipCheck({ id: "membership-1" });

    const outcome = await new PrismaTopicApplicationAcceptance(client)
      .accept("application-1", professor, decidedAt);

    expect(outcome).toBe("STUDENT_ALREADY_IN_PROJECT");
    // 주제가 아니라 프로그램으로 물어야 한다.
    expect(findFirst.mock.calls[0]![0]!.where).toEqual({
      userId: "student-1",
      endedAt: null,
      projectTeam: { project: { programId: "program-1" } },
    });
  });
});
