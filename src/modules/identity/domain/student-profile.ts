export type StudentProfile = {
  interests: string[];
  skills: string[];
  desiredRole: string;
  availability: string;
  bio: string;
};

export class InvalidStudentProfileError extends Error {
  constructor() {
    super("관심 분야, 보유 기술, 희망 역할, 활동 가능 시간과 자기소개를 확인해 주세요.");
    this.name = "InvalidStudentProfileError";
  }
}

export function normalizeStudentProfile(input: StudentProfile): StudentProfile {
  const interests = normalizeTags(input.interests);
  const skills = normalizeTags(input.skills);
  const desiredRole = input.desiredRole.trim();
  const availability = input.availability.trim();
  const bio = input.bio.trim();
  if (!interests.length || !skills.length || !desiredRole || !availability || !bio || desiredRole.length > 200 || availability.length > 500 || bio.length > 1_000) {
    throw new InvalidStudentProfileError();
  }
  return { interests, skills, desiredRole, availability, bio };
}

function normalizeTags(values: string[]) {
  const normalized = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  if (normalized.length > 20 || normalized.some((value) => value.length > 50)) throw new InvalidStudentProfileError();
  return normalized;
}
