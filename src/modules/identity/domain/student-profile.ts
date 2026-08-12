export type StudentProfile = {
  phone: string;
  kakao: string;
  github: string;
  instagram: string;
};

export class InvalidStudentProfileError extends Error {
  constructor() {
    super("전화번호는 숫자로, 나머지는 영문 ID나 링크 형식으로 입력해 주세요.");
    this.name = "InvalidStudentProfileError";
  }
}

// 전화번호: 숫자와 + - 공백 () 만. 나머지: 공백·한글 없는 출력 가능한 ASCII(ID 또는 URL).
const PHONE_PATTERN = /^[0-9+\-\s()]+$/;
const HANDLE_PATTERN = /^[!-~]+$/;

export function normalizeStudentProfile(input: StudentProfile): StudentProfile {
  const phone = input.phone.trim();
  const kakao = input.kakao.trim();
  const github = input.github.trim();
  const instagram = input.instagram.trim();
  if (
    phone.length > 40 || kakao.length > 200 || github.length > 200 || instagram.length > 200 ||
    (phone && !PHONE_PATTERN.test(phone)) ||
    (kakao && !HANDLE_PATTERN.test(kakao)) ||
    (github && !HANDLE_PATTERN.test(github)) ||
    (instagram && !HANDLE_PATTERN.test(instagram))
  ) {
    throw new InvalidStudentProfileError();
  }
  return { phone, kakao, github, instagram };
}
