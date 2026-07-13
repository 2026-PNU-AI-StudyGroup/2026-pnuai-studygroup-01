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
