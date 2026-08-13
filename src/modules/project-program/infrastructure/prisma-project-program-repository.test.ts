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
  recruitmentStartsAt: new Date("2026-03-01T00:00:00Z"),
  recruitmentEndsAt: new Date("2026-10-01T00:00:00Z"),
  executionStartsAt: new Date("2026-03-15T00:00:00Z"),
  executionEndsAt: new Date("2026-11-15T00:00:00Z"),
  submissionStartsAt: new Date("2026-10-15T00:00:00Z"),
  submissionEndsAt: new Date("2026-12-01T00:00:00Z"),
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
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      rubricDefinition: { create: vi.fn().mockResolvedValue({ id: "rubric-1" }) },
      programReportDefinition: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const repository = new PrismaProjectProgramRepository({
      $transaction: vi.fn(async (operation) => operation(transaction)),
    } as unknown as PrismaClient);

    await expect(repository.create({
      ...input,
      divisionNames: ["창업"],
      rubricDefinitions: [{ divisionName: "창업", title: "공식 평가", gradingDueAt: new Date("2026-10-01T00:00:00Z"), audience: "STAFF_ONLY", criteria: [{ label: "완성도", maxPoints: 40 }] }],
      reportDefinitions: [{ title: "최종 보고서", dueAt: new Date("2026-11-01T00:00:00Z") }],
    })).resolves.toBe("program-1");

    expect(transaction.programDivision.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { rubricMode: "CUSTOM" } }));
    expect(transaction.rubricDefinition.create).toHaveBeenCalledWith({ data: expect.objectContaining({ programId: "program-1", divisionId: "division-1", title: "공식 평가" }) });
    expect(transaction.programReportDefinition.createMany).toHaveBeenCalledWith({ data: [{ programId: "program-1", title: "최종 보고서", dueAt: new Date("2026-11-01T00:00:00Z"), position: 0 }] });
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

    await expect(repository.setVisibility("program-1", "STUDENT", true, firstPublishedAt)).resolves.toBe(true);
    await expect(repository.setVisibility("program-1", "STUDENT", true, reopenedAt)).resolves.toBe(true);

    expect(transaction.projectProgram.update).toHaveBeenNthCalledWith(1, {
      where: { id: "program-1" },
      data: { isStudentPublic: true, firstPublishedAt },
    });
    expect(transaction.projectProgram.update).toHaveBeenNthCalledWith(2, {
      where: { id: "program-1" },
      data: { isStudentPublic: true, firstPublishedAt: undefined },
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

  it("프로그램 목록의 프로젝트 수에 마감된 프로젝트도 포함한다", async () => {
    const repository = new PrismaProjectProgramRepository({
      projectProgram: {
        findMany: vi.fn().mockResolvedValue([{
          id: "program-1",
          name: "캡스톤",
          startsAt: new Date("2026-03-01T00:00:00Z"),
          topics: [{ projectTeam: null }, { projectTeam: { id: "team-1" } }],
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
