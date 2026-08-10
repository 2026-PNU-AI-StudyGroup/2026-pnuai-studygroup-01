import { describe, expect, it, vi } from "vitest";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";

vi.mock("@/modules/translation/application/translation-queue", () => ({
  enqueueTranslations: vi.fn(async () => undefined),
}));

const input = {
  createdById: "admin-1",
  icon: "FOLDER" as const,
  name: "캡스톤",
  category: "교과",
  description: "설명",
  startsAt: new Date("2026-03-01T00:00:00Z"),
  endsAt: new Date("2026-12-01T00:00:00Z"),
  projectRegistrationStartsAt: new Date("2026-03-01T00:00:00Z"),
  projectRegistrationEndsAt: new Date("2026-12-01T00:00:00Z"),
  recruitmentEndsAt: new Date("2026-10-01T00:00:00Z"),
  advisorEnabled: true,
  studentProjectCreationEnabled: false,
  votingPolicy: null,
};

function uniqueConflict(target: string[]) {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "7.8.0",
    meta: { target },
  });
}

describe("Prisma 프로그램 저장소", () => {
  it("이름과 시작 시각의 유니크 충돌만 프로그램 중복으로 분류한다", async () => {
    const duplicateRepository = new PrismaProjectProgramRepository({
      $transaction: vi.fn().mockRejectedValue(uniqueConflict(["name", "startsAt"])),
    } as unknown as PrismaClient);
    const unrelatedConflict = uniqueConflict(["dedupeKey"]);
    const unrelatedRepository = new PrismaProjectProgramRepository({
      $transaction: vi.fn().mockRejectedValue(unrelatedConflict),
    } as unknown as PrismaClient);

    await expect(duplicateRepository.create(input)).resolves.toBe("DUPLICATE");
    await expect(unrelatedRepository.create(input)).rejects.toBe(unrelatedConflict);
  });

  it("잠긴 투표 정책 검증에 실패하면 확인된 표 초기화도 실행하지 않는다", async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: "program-1" }]),
      programVotingPolicy: {
        findUnique: vi.fn().mockResolvedValue({
          programId: "program-1",
          startsAt: new Date("2026-08-01T00:00:00Z"),
          endsAt: new Date("2026-08-31T00:00:00Z"),
          voteLimit: 1,
          voteLimitScope: "PROGRAM",
          selfVotingAllowed: false,
          identityVisibility: "ANONYMOUS",
        }),
      },
      programDivision: { count: vi.fn().mockResolvedValue(1) },
      topic: { findFirst: vi.fn().mockResolvedValue(null) },
      projectVote: {
        count: vi.fn().mockResolvedValue(1),
        deleteMany: vi.fn(),
      },
      auditLog: { create: vi.fn() },
    };
    const repository = new PrismaProjectProgramRepository({
      $transaction: vi.fn(async (operation) => operation(transaction)),
    } as unknown as PrismaClient);

    const outcome = await repository.updateSettings("program-1", {
      projectRegistrationStartsAt: new Date("2026-07-01T00:00:00Z"),
      projectRegistrationEndsAt: new Date("2026-07-31T00:00:00Z"),
      recruitmentEndsAt: new Date("2026-08-15T00:00:00Z"),
      votingPolicy: {
        startsAt: new Date("2026-08-01T00:00:00Z"),
        endsAt: new Date("2026-08-31T00:00:00Z"),
        voteLimit: 2,
        voteLimitScope: "PROGRAM",
        selfVotingAllowed: false,
        identityVisibility: "NAMED",
      },
      confirmVoteReset: {
        voteCount: 1,
        from: { voteLimit: 1, voteLimitScope: "PROGRAM" },
        to: { voteLimit: 2, voteLimitScope: "PROGRAM" },
      },
    }, "admin-1");

    expect(outcome).toBe("IDENTITY_VISIBILITY_LOCKED");
    expect(transaction.projectVote.deleteMany).not.toHaveBeenCalled();
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it("프로그램 목록의 프로젝트 수에 마감된 프로젝트도 포함한다", async () => {
    const repository = new PrismaProjectProgramRepository({
      projectProgram: {
        findMany: vi.fn().mockResolvedValue([{
          id: "program-1",
          name: "캡스톤",
          startsAt: new Date("2026-03-01T00:00:00Z"),
          topics: [{ team: null }, { team: { id: "team-1" } }],
          divisions: [],
          votingPolicy: null,
        }]),
      },
    } as unknown as PrismaClient);

    const [program] = await repository.listAll();

    expect(program.topicCount).toBe(2);
    expect(program.teamCount).toBe(1);
  });
});
