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
  startsAt: new Date("2026-03-01T00:00:00Z"),
  endsAt: new Date("2026-12-01T00:00:00Z"),
  projectRegistrationStartsAt: new Date("2026-03-01T00:00:00Z"),
  projectRegistrationEndsAt: new Date("2026-12-01T00:00:00Z"),
  recruitmentStartsAt: new Date("2026-03-01T00:00:00Z"),
  recruitmentEndsAt: new Date("2026-10-01T00:00:00Z"),
  executionStartsAt: new Date("2026-03-15T00:00:00Z"),
  executionEndsAt: new Date("2026-11-15T00:00:00Z"),
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

  it("프로그램과 분과 채점표·보고서 정의를 한 트랜잭션에서 생성한다", async () => {
    const transaction = {
      projectProgram: { create: vi.fn().mockResolvedValue({ id: "program-1" }) },
      programDivision: {
        findMany: vi.fn().mockResolvedValue([{ id: "division-1", name: "창업" }]),
      },
      rubricDefinition: { create: vi.fn().mockResolvedValue({ id: "rubric-1" }) },
      programReportDefinition: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const repository = new PrismaProjectProgramRepository({
      $transaction: vi.fn(async (operation) => operation(transaction)),
    } as unknown as PrismaClient);

    await expect(repository.create({
      ...input,
      isPublic: true,
      divisionNames: ["창업"],
      votingPolicy: {
        startsAt: new Date("2026-08-01T00:00:00Z"),
        endsAt: new Date("2026-08-31T00:00:00Z"),
        voteLimit: 3,
        voteLimitScope: "PROGRAM",
        selfVotingAllowed: false,
        resultsVisibleDuringVoting: false,
        resultsVisibleAfterVoting: true,
      },
      rubricDefinitions: [{ divisionName: "창업", title: "공식 평가", gradingDueAt: new Date("2026-10-01T00:00:00Z"), audience: "STAFF_ONLY", criteria: [{ label: "완성도", maxPoints: 40 }] }],
      reportDefinitions: [{ title: "최종 보고서", dueAt: new Date("2026-11-01T00:00:00Z") }],
    })).resolves.toBe("program-1");

    expect(transaction.projectProgram.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        isPublic: true,
        votingPolicy: { create: expect.objectContaining({ resultsVisibleDuringVoting: false, resultsVisibleAfterVoting: true }) },
      }),
    }));
    expect("updateMany" in transaction.programDivision).toBe(false);
    expect(transaction.rubricDefinition.create).toHaveBeenCalledWith({ data: expect.objectContaining({ programId: "program-1", divisionId: "division-1", title: "공식 평가" }) });
    expect(transaction.programReportDefinition.createMany).toHaveBeenCalledWith({ data: [{ programId: "program-1", title: "최종 보고서", dueAt: new Date("2026-11-01T00:00:00Z"), required: true, position: 0 }] });
  });

  it("최초 공개 시각은 처음 공개할 때만 기록하고 재공개에서는 보존한다", async () => {
    const firstPublishedAt = new Date("2026-03-02T00:00:00Z");
    const reopenedAt = new Date("2026-04-02T00:00:00Z");
    const transaction = {
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([{ id: "program-1", firstPublishedAt: null }])
        .mockResolvedValueOnce([{ id: "program-1", firstPublishedAt }]),
      projectProgram: { update: vi.fn().mockResolvedValue({ id: "program-1" }) },
    };
    const repository = new PrismaProjectProgramRepository({
      $transaction: vi.fn(async (operation) => operation(transaction)),
    } as unknown as PrismaClient);

    await expect(repository.setVisibility("program-1", true, firstPublishedAt)).resolves.toBe(true);
    await expect(repository.setVisibility("program-1", true, reopenedAt)).resolves.toBe(true);

    expect(transaction.projectProgram.update).toHaveBeenNthCalledWith(1, {
      where: { id: "program-1" },
      data: { isPublic: true, firstPublishedAt },
    });
    expect(transaction.projectProgram.update).toHaveBeenNthCalledWith(2, {
      where: { id: "program-1" },
      data: { isPublic: true, firstPublishedAt: undefined },
    });
  });

  it("종속 일정이 기존 범위를 벗어나도 관리자 설정을 저장한다", async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: "program-1", endsAt: input.endsAt }]),
      programVotingPolicy: { findUnique: vi.fn().mockResolvedValue(null) },
      projectVote: { count: vi.fn().mockResolvedValue(0) },
      programDivision: { count: vi.fn().mockResolvedValue(0) },
      projectProgram: { update: vi.fn().mockResolvedValue({ id: "program-1" }) },
    };
    const repository = new PrismaProjectProgramRepository({
      $transaction: vi.fn(async (operation) => operation(transaction)),
    } as unknown as PrismaClient);

    await expect(repository.updateSettings("program-1", {
      ...input,
      votingPolicy: null,
    }, "admin-1")).resolves.toBe("UPDATED");
    expect(transaction.projectProgram.update).toHaveBeenCalled();
  });

  it("직접 지원 전환과 일정을 같은 잠금 트랜잭션에서 저장한다", async () => {
    const current = {
      ...input,
      id: "program-1",
      projectTeamMinSize: 2,
      projectTeamMaxSize: 6,
      isPublic: false,
      firstPublishedAt: null,
      endProcessedAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    };
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: "program-1" }]),
      topic: { findFirst: vi.fn().mockResolvedValue(null) },
      projectProgram: {
        findUnique: vi.fn().mockResolvedValue({ ...current, studentProjectCreationEnabled: true, recruitmentStartsAt: null, recruitmentEndsAt: null }),
        update: vi.fn().mockResolvedValue({ id: "program-1" }),
      },
    };
    const repository = new PrismaProjectProgramRepository({
      $transaction: vi.fn(async (operation) => operation(transaction)),
    } as unknown as PrismaClient);

    await expect(repository.updateSchedule("program-1", {
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      projectRegistrationStartsAt: input.projectRegistrationStartsAt,
      projectRegistrationEndsAt: input.projectRegistrationEndsAt,
      recruitmentStartsAt: input.recruitmentStartsAt,
      recruitmentEndsAt: input.recruitmentEndsAt,
      executionStartsAt: input.executionStartsAt,
      executionEndsAt: input.executionEndsAt,
      transitionToDirect: true,
    })).resolves.toBe("UPDATED");

    expect(transaction.projectProgram.findUnique).toHaveBeenCalledWith({ where: { id: "program-1" } });
    expect(transaction.topic.findFirst).toHaveBeenCalledWith({ where: { programId: "program-1" }, select: { id: true } });
    expect(transaction.projectProgram.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        studentProjectCreationEnabled: false,
        recruitmentStartsAt: input.recruitmentStartsAt,
        recruitmentEndsAt: input.recruitmentEndsAt,
      }),
    }));
  });

  it("직접 지원 전환을 막는 프로젝트가 있으면 일정도 저장하지 않는다", async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: "program-1" }]),
      topic: { findFirst: vi.fn().mockResolvedValue({ id: "topic-1" }) },
      projectProgram: {
        findUnique: vi.fn().mockResolvedValue({ ...input, id: "program-1", projectTeamMinSize: 2, projectTeamMaxSize: 6, studentProjectCreationEnabled: true, recruitmentStartsAt: null, recruitmentEndsAt: null }),
        update: vi.fn(),
      },
    };
    const repository = new PrismaProjectProgramRepository({ $transaction: vi.fn(async (operation) => operation(transaction)) } as unknown as PrismaClient);

    await expect(repository.updateSchedule("program-1", {
      startsAt: input.startsAt, endsAt: input.endsAt,
      projectRegistrationStartsAt: input.projectRegistrationStartsAt, projectRegistrationEndsAt: input.projectRegistrationEndsAt,
      recruitmentStartsAt: input.recruitmentStartsAt, recruitmentEndsAt: input.recruitmentEndsAt,
      executionStartsAt: input.executionStartsAt, executionEndsAt: input.executionEndsAt,
      transitionToDirect: true,
    })).resolves.toBe("TOPICS_EXIST");
    expect(transaction.projectProgram.update).not.toHaveBeenCalled();
  });

  it("결과 공개 설정만 변경하면 기존 표를 삭제하거나 초기화 확인을 요구하지 않는다", async () => {
    const currentPolicy = {
      programId: "program-1",
      startsAt: new Date("2026-08-01T00:00:00Z"),
      endsAt: new Date("2026-08-31T00:00:00Z"),
      voteLimit: 3,
      voteLimitScope: "PROGRAM" as const,
      selfVotingAllowed: false,
      resultsVisibleDuringVoting: false,
      resultsVisibleAfterVoting: true,
    };
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: "program-1", endsAt: input.endsAt }]),
      programVotingPolicy: {
        findUnique: vi.fn().mockResolvedValue(currentPolicy),
        update: vi.fn().mockResolvedValue({ ...currentPolicy, resultsVisibleDuringVoting: true, resultsVisibleAfterVoting: false }),
      },
      projectVote: {
        count: vi.fn().mockResolvedValue(7),
        groupBy: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        deleteMany: vi.fn(),
      },
      programDivision: { count: vi.fn().mockResolvedValue(1) },
      auditLog: { create: vi.fn() },
      projectProgram: { update: vi.fn().mockResolvedValue({ id: "program-1" }) },
    };
    const repository = new PrismaProjectProgramRepository({
      $transaction: vi.fn(async (operation) => operation(transaction)),
    } as unknown as PrismaClient);

    const outcome = await repository.updateSettings("program-1", {
      ...input,
      votingPolicy: {
        startsAt: currentPolicy.startsAt,
        endsAt: currentPolicy.endsAt,
        voteLimit: currentPolicy.voteLimit,
        voteLimitScope: currentPolicy.voteLimitScope,
        selfVotingAllowed: currentPolicy.selfVotingAllowed,
        resultsVisibleDuringVoting: true,
        resultsVisibleAfterVoting: false,
      },
    }, "admin-1");

    expect(outcome).toBe("UPDATED");
    expect(transaction.projectVote.findFirst).not.toHaveBeenCalled();
    expect(transaction.projectVote.deleteMany).not.toHaveBeenCalled();
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
    expect(transaction.programVotingPolicy.update).toHaveBeenCalledWith({
      where: { programId: "program-1" },
      data: expect.objectContaining({ resultsVisibleDuringVoting: true, resultsVisibleAfterVoting: false }),
    });
  });

  it("투표 기간을 옮기면 기간 밖으로 밀려나는 표를 초기화할지 먼저 확인한다", async () => {
    // 예전에는 그냥 거부했다. 투표를 조금 받아 본 뒤 일정을 미뤄 다시 시작하는 운영이 막혔다.
    const currentPolicy = {
      programId: "program-1",
      startsAt: new Date("2026-08-01T00:00:00Z"),
      endsAt: new Date("2026-08-31T00:00:00Z"),
      voteLimit: 3,
      voteLimitScope: "PROGRAM" as const,
      selfVotingAllowed: false,
      resultsVisibleDuringVoting: false,
      resultsVisibleAfterVoting: true,
    };
    const movedPolicy = {
      startsAt: new Date("2026-09-10T00:00:00Z"),
      endsAt: new Date("2026-09-20T00:00:00Z"),
      voteLimit: currentPolicy.voteLimit,
      voteLimitScope: currentPolicy.voteLimitScope,
      selfVotingAllowed: currentPolicy.selfVotingAllowed,
      resultsVisibleDuringVoting: currentPolicy.resultsVisibleDuringVoting,
      resultsVisibleAfterVoting: currentPolicy.resultsVisibleAfterVoting,
    };
    function harness() {
      const transaction = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: "program-1", endsAt: input.endsAt }]),
        programVotingPolicy: { findUnique: vi.fn().mockResolvedValue(currentPolicy), update: vi.fn() },
        projectVote: {
          count: vi.fn().mockResolvedValue(1),
          findFirst: vi.fn().mockResolvedValue(null),
          deleteMany: vi.fn(),
          groupBy: vi.fn().mockResolvedValue([]),
        },
        programDivision: { count: vi.fn().mockResolvedValue(1) },
        projectProgram: { update: vi.fn() },
        auditLog: { create: vi.fn() },
      };
      const repository = new PrismaProjectProgramRepository({
        $transaction: vi.fn(async (operation) => operation(transaction)),
      } as unknown as PrismaClient);
      return { transaction, repository };
    }

    const first = harness();
    const outcome = await first.repository.updateSettings("program-1", {
      ...input,
      votingPolicy: movedPolicy,
    }, "admin-1");

    expect(outcome).toEqual({
      status: "VOTE_RESET_CONFIRMATION_REQUIRED",
      impact: {
        voteCount: 1,
        from: { voteLimit: 3, voteLimitScope: "PROGRAM" },
        to: { voteLimit: 3, voteLimitScope: "PROGRAM" },
      },
    });
    expect(first.transaction.projectVote.deleteMany).not.toHaveBeenCalled();
    expect(first.transaction.projectProgram.update).not.toHaveBeenCalled();

    const second = harness();
    const confirmed = await second.repository.updateSettings("program-1", {
      ...input,
      votingPolicy: movedPolicy,
      confirmVoteReset: {
        voteCount: 1,
        from: { voteLimit: 3, voteLimitScope: "PROGRAM" },
        to: { voteLimit: 3, voteLimitScope: "PROGRAM" },
      },
    }, "admin-1");

    expect(confirmed).toBe("UPDATED");
    expect(second.transaction.projectVote.deleteMany).toHaveBeenCalledWith({ where: { programId: "program-1" } });
    expect(second.transaction.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: "PROGRAM_VOTING_RESET",
      metadata: expect.objectContaining({ reason: "PERIOD_CHANGED", voteCount: 1 }),
    }) });
  });

  it("프로그램 목록의 프로젝트 수는 마감된 프로젝트는 세고 승인 대기와 반려는 빼고 센다", async () => {
    const repository = new PrismaProjectProgramRepository({
      projectProgram: {
        findMany: vi.fn().mockResolvedValue([{
          id: "program-1",
          name: "캡스톤",
          startsAt: new Date("2026-03-01T00:00:00Z"),
          topics: [
            { status: "ACTIVE", projectTeam: null },
            { status: "ACTIVE", projectTeam: { id: "team-1" } },
            // 승인 대기와 반려는 아직 프로젝트가 아니다. 화면 목록에도 안 나오므로 세지 않는다.
            { status: "PENDING_APPROVAL", projectTeam: null },
            { status: "REJECTED", projectTeam: null },
          ],
          divisions: [],
          votingPolicy: null,
        }]),
      },
    } as unknown as PrismaClient);

    const [program] = await repository.listAll();

    expect(program.topicCount).toBe(2);
    expect(program.teamCount).toBe(1);
  });

  // 분과 하나를 지울 때 무효표가 0건 지워지고 있었다. topic 의 divisionId 를 먼저 null 로
  // 밀어 버려서, 그 divisionId 로 표를 찾는 조건에 맞는 topic 이 남지 않았기 때문이다.
  // 화면과 감사 로그는 "표 N개 초기화" 라고 알리는데 표는 전부 살아남았다.
  //
  // 분과를 전부 지우는 경로는 조건이 { programId } 라 순서와 무관하게 동작해서,
  // 그 경로만 보던 테스트로는 잡히지 않았다.
  it("분과 하나를 지울 때 divisionId 를 비우기 전에 그 분과의 표를 지운다", async () => {
    const removedDivision = { id: "division-1", name: "융합", position: 0, _count: { topics: 2 } };
    const confirmDivisionSync = {
      divisionIds: ["division-1"],
      divisionNames: ["융합"],
      projectCount: 2,
      voteCount: 4,
      rubricCount: 0,
      switchesVotingScope: false,
    };
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: "program-1", isPublic: true, firstPublishedAt: new Date("2026-03-01T00:00:00Z") }]),
      programDivision: {
        findMany: vi.fn().mockResolvedValue([removedDivision]),
        updateMany: vi.fn(),
        update: vi.fn(),
        create: vi.fn().mockResolvedValue({ id: "division-2" }),
        deleteMany: vi.fn(),
      },
      programVotingPolicy: { findUnique: vi.fn().mockResolvedValue({ voteLimitScope: "DIVISION" }), update: vi.fn() },
      projectVote: { count: vi.fn().mockResolvedValue(4), deleteMany: vi.fn() },
      rubricDefinition: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn() },
      projectTeam: { findMany: vi.fn().mockResolvedValue([]) },
      projectTeamRubricEvaluation: { deleteMany: vi.fn(), createMany: vi.fn() },
      rubricScore: { findFirst: vi.fn().mockResolvedValue(null) },
      advisorEvaluation: { findFirst: vi.fn().mockResolvedValue(null) },
      topic: { updateMany: vi.fn() },
      projectProgram: { update: vi.fn().mockResolvedValue({ id: "program-1" }) },
      auditLog: { create: vi.fn() },
    };
    const repository = new PrismaProjectProgramRepository({
      $transaction: vi.fn(async (operation) => operation(transaction)),
    } as unknown as PrismaClient);

    // 분과를 하나도 남기지 않으면 한도 기준이 프로그램 단위로 바뀌는 다른 경로를 탄다.
    // 여기서는 "융합" 을 지우고 "창업" 을 새로 두어 개별 삭제 경로를 확인한다.
    await expect(repository.updateBasicInfo("program-1", {
      name: "캡스톤",
      category: "교과",
      isPublic: true,
      divisionNames: ["창업"],
      confirmDivisionSync,
    } as never, "admin-1")).resolves.toBe("UPDATED");

    expect(transaction.projectVote.deleteMany).toHaveBeenCalledWith({
      where: { programId: "program-1", topic: { divisionId: { in: ["division-1"] } } },
    });
    const voteDeleteOrder = transaction.projectVote.deleteMany.mock.invocationCallOrder[0]!;
    const divisionClearOrder = transaction.topic.updateMany.mock.invocationCallOrder[0]!;
    expect(voteDeleteOrder).toBeLessThan(divisionClearOrder);
  });
});
