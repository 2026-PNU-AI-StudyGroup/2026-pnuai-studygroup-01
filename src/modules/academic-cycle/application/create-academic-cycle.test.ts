import { describe, expect, it, vi } from "vitest";

import type { AcademicCycleCreator } from "@/modules/academic-cycle/application/academic-cycle-ports";
import {
  AcademicCycleCreationForbiddenError,
  CreateAcademicCycleService,
} from "@/modules/academic-cycle/application/create-academic-cycle";

describe("학기 생성", () => {
  it("관리자가 학기를 생성한다", async () => {
    const repository: AcademicCycleCreator = {
      create: vi.fn(async (cycle) => ({ id: "cycle-1", ...cycle })),
    };
    const service = new CreateAcademicCycleService(repository);

    await expect(
      service.execute({
        actorRole: "ADMIN",
        academicYear: 2026,
        term: "FIRST",
      }),
    ).resolves.toEqual({ id: "cycle-1", academicYear: 2026, term: "FIRST" });
  });

  it("관리자가 아니면 저장소를 호출하지 않는다", async () => {
    const repository: AcademicCycleCreator = {
      create: vi.fn(),
    };
    const service = new CreateAcademicCycleService(repository);

    await expect(
      service.execute({
        actorRole: "PROFESSOR",
        academicYear: 2026,
        term: "FIRST",
      }),
    ).rejects.toBeInstanceOf(AcademicCycleCreationForbiddenError);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
