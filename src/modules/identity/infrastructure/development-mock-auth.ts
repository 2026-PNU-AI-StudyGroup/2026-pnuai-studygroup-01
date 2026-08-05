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

export function isDevelopmentMockAuthEnabled(input: {
  nodeEnv: string | undefined;
  explicitlyEnabled: string | undefined;
}): boolean {
  return input.nodeEnv === "development" || input.explicitlyEnabled === "true";
}

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.some((role) => role === value);
}

type DevelopmentMockAuthRequest = {
  requestUrl: string;
  host?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
};

export function getDevelopmentMockAuthOrigin(input: DevelopmentMockAuthRequest): string | null {
  const requestUrl = new URL(input.requestUrl);
  const host = input.forwardedHost?.split(",")[0]?.trim()
    || input.host?.trim()
    || requestUrl.host;
  const protocol = input.forwardedProto?.split(",")[0]?.trim()
    || requestUrl.protocol.slice(0, -1);
  let effectiveUrl: URL;
  try {
    effectiveUrl = new URL(`${protocol}://${host}`);
  } catch {
    return null;
  }
  return effectiveUrl.origin;
}

export function canUseDevelopmentMockAuth(input: DevelopmentMockAuthRequest & {
  nodeEnv: string | undefined;
  explicitlyEnabled: string | undefined;
  allowedHostnames: string | undefined;
  origin: string | null;
}): boolean {
  if (!isDevelopmentMockAuthEnabled(input)) return false;
  const effectiveOrigin = getDevelopmentMockAuthOrigin(input);
  if (!effectiveOrigin || input.origin !== effectiveOrigin) return false;
  const effectiveUrl = new URL(effectiveOrigin);
  if (input.nodeEnv === "development" && localHostnames.has(effectiveUrl.hostname)) return true;
  if (input.explicitlyEnabled !== "true") return false;
  const allowedHostnames = new Set(
    input.allowedHostnames
      ?.split(",")
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean) ?? [],
  );
  return allowedHostnames.has(effectiveUrl.hostname.toLowerCase());
}
