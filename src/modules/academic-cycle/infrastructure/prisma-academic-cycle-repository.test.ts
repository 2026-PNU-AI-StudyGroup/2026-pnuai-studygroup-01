import { describe, expect, it, vi } from "vitest";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { AcademicCycleAlreadyExistsError } from "@/modules/academic-cycle/application/academic-cycle-errors";
import { PrismaAcademicCycleRepository } from "@/modules/academic-cycle/infrastructure/prisma-academic-cycle-repository";

describe("Prisma 학기 저장소", () => {
  it("학년도와 학기 중복을 애플리케이션 오류로 변환한다", async () => {
    const uniqueConflict = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: "7.8.0",
        meta: { target: ["academicYear", "term"] },
      },
    );
    const client = {
      academicCycle: {
        create: vi.fn().mockRejectedValue(uniqueConflict),
      },
    } as unknown as PrismaClient;
    const repository = new PrismaAcademicCycleRepository(client);

    await expect(
      repository.create({ academicYear: 2026, term: "FIRST" }),
    ).rejects.toBeInstanceOf(AcademicCycleAlreadyExistsError);
  });

  it("알 수 없는 저장소 오류는 그대로 전달한다", async () => {
    const databaseError = new Error("database unavailable");
    const client = {
      academicCycle: {
        create: vi.fn().mockRejectedValue(databaseError),
      },
    } as unknown as PrismaClient;
    const repository = new PrismaAcademicCycleRepository(client);

    await expect(
      repository.create({ academicYear: 2026, term: "FIRST" }),
    ).rejects.toBe(databaseError);
  });
});
