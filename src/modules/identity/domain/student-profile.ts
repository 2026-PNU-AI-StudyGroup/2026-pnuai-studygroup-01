export type StudentProfile = {
  phone: string;
  kakao: string;
  github: string;
  instagram: string;
};

export class InvalidStudentProfileError extends Error {
  constructor() {
    super("연락처 정보를 확인해 주세요.");
    this.name = "InvalidStudentProfileError";
  }
}

export function normalizeStudentProfile(input: StudentProfile): StudentProfile {
  const phone = input.phone.trim();
  const kakao = input.kakao.trim();
  const github = input.github.trim();
  const instagram = input.instagram.trim();
  if (phone.length > 40 || kakao.length > 200 || github.length > 200 || instagram.length > 200) {
    throw new InvalidStudentProfileError();
  }
  return { phone, kakao, github, instagram };
}
