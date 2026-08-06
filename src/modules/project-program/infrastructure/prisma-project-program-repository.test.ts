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
});
