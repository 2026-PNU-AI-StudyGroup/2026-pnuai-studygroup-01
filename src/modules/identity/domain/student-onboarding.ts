export type StudentOnboardingProfile = {
  name: string;
  department: string;
  studentNumber: string;
  grade: number;
  phoneNumber: string;
  contactEmail: string;
};

export class InvalidStudentOnboardingProfileError extends Error {
  constructor() {
    super("필수 가입 정보를 올바르게 입력해 주세요.");
    this.name = "InvalidStudentOnboardingProfileError";
  }
}

function compact(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizePhoneNumber(value: string) {
  const compacted = value.trim().replace(/[\s()-]/g, "");
  if (!/^\+?\d{8,15}$/.test(compacted)) {
    throw new InvalidStudentOnboardingProfileError();
  }
  return compacted;
}

export function normalizeStudentOnboardingProfile(
  input: StudentOnboardingProfile,
): StudentOnboardingProfile {
  const name = compact(input.name);
  const department = compact(input.department);
  const studentNumber = input.studentNumber.replace(/[\s-]/g, "");
  const contactEmail = input.contactEmail.trim().toLowerCase();

  if (
    name.length < 2 ||
    name.length > 50 ||
    department.length < 2 ||
    department.length > 100 ||
    !/^\d{6,12}$/.test(studentNumber) ||
    !Number.isInteger(input.grade) ||
    input.grade < 1 ||
    input.grade > 6 ||
    contactEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)
  ) {
    throw new InvalidStudentOnboardingProfileError();
  }

  return {
    name,
    department,
    studentNumber,
    grade: input.grade,
    phoneNumber: normalizePhoneNumber(input.phoneNumber),
    contactEmail,
  };
}
