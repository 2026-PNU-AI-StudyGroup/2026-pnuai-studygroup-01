import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { normalizeStudentProfile, type StudentProfile } from "@/modules/identity/domain/student-profile";

export interface StudentProfileRepository {
  find(userId: string): Promise<StudentProfile | null>;
  save(userId: string, profile: StudentProfile): Promise<void>;
}

export class StudentProfileForbiddenError extends Error {
  constructor() {
    super("학생 계정만 프로젝트 프로필을 관리할 수 있습니다.");
    this.name = "StudentProfileForbiddenError";
  }
}

export class StudentProfileService {
  constructor(private readonly repository: StudentProfileRepository) {}

  get(actor: CurrentActor): Promise<StudentProfile | null> {
    this.assertStudent(actor);
    return this.repository.find(actor.id);
  }

  async save(actor: CurrentActor, input: StudentProfile): Promise<void> {
    this.assertStudent(actor);
    await this.repository.save(actor.id, normalizeStudentProfile(input));
  }

  private assertStudent(actor: CurrentActor) {
    if (actor.role !== "STUDENT") throw new StudentProfileForbiddenError();
  }
}
