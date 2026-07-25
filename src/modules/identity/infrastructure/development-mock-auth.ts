import { USER_ROLES, type UserRole } from "@/modules/identity/domain/user-role";

export const DEVELOPMENT_MOCK_ACCOUNTS = {
  STUDENT: {
    id: "20000000-0000-4000-8000-000000000001",
    label: "학생 화면 열기",
    description: "주제 탐색, 지원과 팀 활동 화면을 확인합니다.",
  },
  PROFESSOR: {
    id: "10000000-0000-4000-8000-000000000001",
    label: "교수 화면 열기",
    description: "주제 관리와 학생 지원 검토 화면을 확인합니다.",
  },
  ADMIN: {
    id: "00000000-0000-4000-8000-000000000001",
    label: "관리자 화면 열기",
    description: "프로그램, 사용자와 운영 설정을 확인합니다.",
  },
} as const satisfies Record<UserRole, { id: string; label: string; description: string }>;

const localHostnames = new Set(["localhost", "127.0.0.1", "::1"]);

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.some((role) => role === value);
}

export function canUseDevelopmentMockAuth(input: { nodeEnv: string | undefined; requestUrl: string; origin: string | null }): boolean {
  if (input.nodeEnv !== "development") return false;
  const requestUrl = new URL(input.requestUrl);
  return localHostnames.has(requestUrl.hostname) && input.origin === requestUrl.origin;
}
