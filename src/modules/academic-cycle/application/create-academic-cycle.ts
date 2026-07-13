import type { AcademicTerm } from "@/modules/academic-cycle/domain/academic-cycle";
import { assertValidAcademicCycle } from "@/modules/academic-cycle/domain/academic-cycle";
import type {
  AcademicCycleCreator,
  AcademicCycleRecord,
} from "@/modules/academic-cycle/application/academic-cycle-ports";
import type { UserRole } from "@/modules/identity/domain/user-role";

export class AcademicCycleCreationForbiddenError extends Error {
  constructor() {
    super("관리자만 학기를 생성할 수 있습니다.");
    this.name = "AcademicCycleCreationForbiddenError";
  }
}

export class CreateAcademicCycleService {
  constructor(private readonly repository: AcademicCycleCreator) {}

  async execute(input: {
    actorRole: UserRole;
    academicYear: number;
    term: AcademicTerm;
  }): Promise<AcademicCycleRecord> {
    if (input.actorRole !== "ADMIN") {
      throw new AcademicCycleCreationForbiddenError();
    }

    const cycle = {
      academicYear: input.academicYear,
      term: input.term,
    };
    assertValidAcademicCycle(cycle);

    return this.repository.create(cycle);
  }
}
