export const ACADEMIC_TERMS = ["FIRST", "SECOND"] as const;

export type AcademicTerm = (typeof ACADEMIC_TERMS)[number];

export type AcademicCycleIdentity = {
  academicYear: number;
  term: AcademicTerm;
};

export class InvalidAcademicCycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAcademicCycleError";
  }
}

export function assertValidAcademicCycle(
  cycle: AcademicCycleIdentity,
): void {
  if (
    !Number.isSafeInteger(cycle.academicYear) ||
    cycle.academicYear < 2000 ||
    cycle.academicYear > 9999
  ) {
    throw new InvalidAcademicCycleError(
      "학년도는 2000 이상인 네 자리 정수여야 합니다.",
    );
  }

  if (!ACADEMIC_TERMS.includes(cycle.term)) {
    throw new InvalidAcademicCycleError("지원하지 않는 학기입니다.");
  }
}
