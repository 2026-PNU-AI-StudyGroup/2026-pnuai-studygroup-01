import { describe, expect, it, vi } from "vitest";

import { type PrismaClient } from "@/generated/prisma/client";
import { PrismaTopicApplicationSubmissionRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-submission-repository";

describe("Prisma 프로젝트 지원 저장소", () => {
  it("학생 팀 프로젝트 운영 프로그램은 지원 설정 조회에서 제외한다", async () => {
    const findFirst = vi.fn(async () => null);
    const repository = new PrismaTopicApplicationSubmissionRepository({
      topic: { findFirst },
    } as unknown as PrismaClient);

    await repository.findConfiguration("topic-1", new Date("2026-08-01T00:00:00Z"));

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        program: expect.objectContaining({ studentProjectCreationEnabled: false }),
      }),
    }));
  });

  it("트랜잭션 시점에 학생 팀 프로젝트 운영으로 바뀌면 직접 지원을 거부한다", async () => {
    const queryRaw = vi.fn()
      .mockResolvedValueOnce([{
        isStudentPublic: true,
        endsAt: new Date("2026-12-31T00:00:00Z"),
        studentProjectCreationEnabled: true,
        recruitmentStartsAt: new Date("2026-07-01T00:00:00Z"),
        recruitmentEndsAt: new Date("2026-09-01T00:00:00Z"),
      }])
      .mockResolvedValueOnce([{
        id: "topic-1",
        programId: "program-1",
        capacity: 4,
        applicationMode: "INDIVIDUAL_ONLY",
      }]);
    const transaction = { $queryRaw: queryRaw };
    const repository = new PrismaTopicApplicationSubmissionRepository({
      $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
    } as unknown as PrismaClient);

    await expect(repository.createIndividualIfAvailable({
      topicId: "topic-1",
      studentId: "student-1",
      studentEmail: "student@pusan.ac.kr",
      kind: "INDIVIDUAL",
      answers: [],
      appliedAt: new Date("2026-08-01T00:00:00Z"),
    })).resolves.toEqual({ outcome: "TOPIC_UNAVAILABLE" });
  });

  it("프로그램의 팀 지원 최대 인원을 넘은 팀 지원을 거부한다", async () => {
    const transaction = {
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([{
          isStudentPublic: true,
          endsAt: new Date("2026-12-31T00:00:00Z"),
          studentProjectCreationEnabled: false,
          projectTeamMaxSize: 2,
          recruitmentStartsAt: new Date("2026-07-01T00:00:00Z"),
          recruitmentEndsAt: new Date("2026-09-01T00:00:00Z"),
        }])
        .mockResolvedValueOnce([{ id: "topic-1", programId: "program-1", capacity: 6, applicationMode: "TEAM_ONLY" }])
        .mockResolvedValueOnce([{ id: "student-team-1", leaderId: "student-1" }]),
      studentTeamMember: {
        findMany: vi.fn(async () => ["student-1", "student-2", "student-3"].map((studentId) => ({
          studentId,
          role: studentId === "student-1" ? "LEADER" : "MEMBER",
          student: { role: "STUDENT", accountStatus: "ACTIVE" },
        }))),
      },
    };
    const repository = new PrismaTopicApplicationSubmissionRepository({
      $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
    } as unknown as PrismaClient);

    await expect(repository.createTeamFromStudentTeam({
      topicId: "topic-1",
      studentId: "student-1",
      studentEmail: "student1@pusan.ac.kr",
      studentTeamId: "student-team-1",
      kind: "TEAM",
      answers: [],
      appliedAt: new Date("2026-08-01T00:00:00Z"),
    })).resolves.toEqual({ outcome: "TEAM_MEMBER_UNAVAILABLE" });
  });
});
