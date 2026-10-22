// 내부 사정으로 현재 데모 데이터의 졸업과제 분류만 학생 탐색에서 숨긴다.
// 자유 텍스트를 추측하지 않아 이름에 "캡스톤"이 들어간 다른 분류를 오탐하지 않는다.
// 로그인 없이 보는 공개 아카이브도 이 분류를 빼야 해서 라우트 밖에 둔다.
export const HIDDEN_GRADUATION_PROGRAM_CATEGORY = "CSE 캡스톤 디자인";

export function isHiddenGraduationProgram(category: string): boolean {
  return category === HIDDEN_GRADUATION_PROGRAM_CATEGORY;
}
