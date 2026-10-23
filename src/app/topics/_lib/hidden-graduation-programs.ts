import { isHiddenGraduationProgram } from "@/modules/project-program/domain/hidden-graduation-program";

export {
  HIDDEN_GRADUATION_PROGRAM_CATEGORY,
  isHiddenGraduationProgram,
} from "@/modules/project-program/domain/hidden-graduation-program";

// 학생에게만 졸업과제 프로그램을 제거한다. 교수·관리자에게는 그대로 노출.
export function hideGraduationProgramsForStudent<T extends { category: string }>(
  programs: T[],
  role: string,
): T[] {
  if (role !== "STUDENT") return programs;
  return programs.filter((program) => !isHiddenGraduationProgram(program.category));
}
