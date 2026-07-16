import { describe, expect, it, vi } from "vitest";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";

function knownError(code: string, target?: string[]) {
  return new Prisma.PrismaClientKnownRequestError("transaction conflict", {
    code,
    clientVersion: "7.8.0",
    meta: target ? { target } : undefined,
  });
}

describe("Prisma 지원 결정 저장소", () => {
  it("교수 검토 목록에서 최신 대기 지원을 처리 이력보다 먼저 반환한다", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { id: "accepted", topicId: "topic-1", studentId: "student-1", status: "ACCEPTED", message: "완료", skills: [], desiredRole: "개발", availability: "저녁", createdAt: new Date("2026-07-17"), topic: { title: "지난 주제", authorId: "professor-1" }, student: { name: "김학생", email: "student1@pusan.ac.kr" } },
      { id: "pending-new", topicId: "topic-2", studentId: "student-2", status: "PENDING", message: "신규", skills: [], desiredRole: "기획", availability: "주말", createdAt: new Date("2026-07-16"), topic: { title: "현재 주제", authorId: "professor-1" }, student: { name: "이학생", email: "student2@pusan.ac.kr" } },
      { id: "rejected", topicId: "topic-3", studentId: "student-3", status: "REJECTED", message: "이력", skills: [], desiredRole: "분석", availability: "평일", createdAt: new Date("2026-07-15"), topic: { title: "지난 주제", authorId: "professor-1" }, student: { name: "박학생", email: "student3@pusan.ac.kr" } },
      { id: "pending-old", topicId: "topic-4", studentId: "student-4", status: "PENDING", message: "대기", skills: [], desiredRole: "개발", availability: "저녁", createdAt: new Date("2026-07-14"), topic: { title: "현재 주제", authorId: "professor-1" }, student: { name: "최학생", email: "student4@pusan.ac.kr" } },
    ]);
    const repository = new PrismaTopicApplicationRepository({ topicApplication: { findMany } } as unknown as PrismaClient);

    const applications = await repository.listAll();

    expect(applications.map(({ id }) => id)).toEqual(["pending-new", "pending-old", "accepted", "rejected"]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { createdAt: "desc" } }));
  });

  it("학생-학기 유니크 충돌만 중복 소속으로 분류한다", async () => {
    const studentConflict = new PrismaTopicApplicationRepository({
      $transaction: vi
        .fn()
        .mockRejectedValue(
          knownError("P2002", ["academicCycleId", "studentId"]),
        ),
    } as unknown as PrismaClient);
    const otherConflict = new PrismaTopicApplicationRepository({
      $transaction: vi
        .fn()
        .mockRejectedValue(knownError("P2002", ["topicId"])),
    } as unknown as PrismaClient);

    await expect(
      studentConflict.accept(
        "application-1",
        { id: "professor-1", isAdmin: false },
        new Date(),
      ),
    ).resolves.toBe("STUDENT_ALREADY_ASSIGNED");
    await expect(
      otherConflict.accept(
        "application-1",
        { id: "professor-1", isAdmin: false },
        new Date(),
      ),
    ).resolves.toBe("CONFLICT");
  });
});
