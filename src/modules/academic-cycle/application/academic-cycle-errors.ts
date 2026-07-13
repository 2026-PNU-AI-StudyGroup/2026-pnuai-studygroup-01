export class AcademicCycleAlreadyExistsError extends Error {
  constructor() {
    super("이미 등록된 학년도와 학기입니다.");
    this.name = "AcademicCycleAlreadyExistsError";
  }
}
