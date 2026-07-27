import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import {
  normalizeStudentOnboardingProfile,
  type StudentOnboardingProfile,
} from "@/modules/identity/domain/student-onboarding";

export interface StudentOnboardingRepository {
  complete(
    userId: string,
    profile: StudentOnboardingProfile,
    completedAt: Date,
  ): Promise<"COMPLETED" | "NOT_REQUIRED" | "STUDENT_NUMBER_TAKEN">;
}

export class StudentOnboardingForbiddenError extends Error {
  constructor() {
    super("학생 계정만 가입 정보를 완료할 수 있습니다.");
    this.name = "StudentOnboardingForbiddenError";
  }
}

export class StudentNumberAlreadyUsedError extends Error {
  constructor() {
    super("이미 사용 중인 학번입니다.");
    this.name = "StudentNumberAlreadyUsedError";
  }
}

export class StudentOnboardingService {
  constructor(private readonly repository: StudentOnboardingRepository) {}

  async complete(
    actor: CurrentActor,
    input: StudentOnboardingProfile,
    completedAt = new Date(),
  ): Promise<void> {
    if (actor.role !== "STUDENT") {
      throw new StudentOnboardingForbiddenError();
    }
    const result = await this.repository.complete(
      actor.id,
      normalizeStudentOnboardingProfile(input),
      completedAt,
    );
    if (result === "STUDENT_NUMBER_TAKEN") {
      throw new StudentNumberAlreadyUsedError();
    }
    if (result === "NOT_REQUIRED") {
      throw new StudentOnboardingForbiddenError();
    }
  }
}
