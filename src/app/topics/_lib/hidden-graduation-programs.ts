// 졸업과제는 다른 사이트로 이관 — 학생 탐색 화면에서 졸업과제/캡스톤 성격 프로그램을 숨긴다.
// 프로그램 분류(category)는 자유 텍스트라 문자열 매칭으로 판별한다.
// 되돌리려면 이 필터 호출부를 제거하면 된다.
const GRADUATION_PROGRAM_PATTERN = /졸업|캡스톤|capstone/i;

export function isHiddenGraduationProgram(category: string): boolean {
  return GRADUATION_PROGRAM_PATTERN.test(category);
}

// 학생에게만 졸업과제 프로그램을 제거한다. 교수·관리자에게는 그대로 노출.
export function hideGraduationProgramsForStudent<T extends { category: string }>(
  programs: T[],
  role: string,
): T[] {
  if (role !== "STUDENT") return programs;
  return programs.filter((program) => !isHiddenGraduationProgram(program.category));
}
