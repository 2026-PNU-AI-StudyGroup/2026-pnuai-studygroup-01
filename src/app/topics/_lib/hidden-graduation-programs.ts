// 내부 사정으로 현재 데모 데이터의 졸업과제 분류만 학생 탐색에서 숨긴다.
// 자유 텍스트를 추측하지 않아 이름에 "캡스톤"이 들어간 다른 분류를 오탐하지 않는다.
export const HIDDEN_GRADUATION_PROGRAM_CATEGORY = "CSE 캡스톤 디자인";

export function isHiddenGraduationProgram(category: string): boolean {
  return category === HIDDEN_GRADUATION_PROGRAM_CATEGORY;
}

// 학생에게만 졸업과제 프로그램을 제거한다. 교수·관리자에게는 그대로 노출.
export function hideGraduationProgramsForStudent<T extends { category: string }>(
  programs: T[],
  role: string,
): T[] {
  if (role !== "STUDENT") return programs;
  return programs.filter((program) => !isHiddenGraduationProgram(program.category));
}
