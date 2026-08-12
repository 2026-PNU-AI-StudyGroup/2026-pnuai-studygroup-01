import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, login } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  login: vi.fn(),
}));

vi.mock("@/modules/identity/infrastructure/auth", () => ({
  auth: { $context: Promise.resolve({ test: { login } }) },
}));
vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: { user: { findFirst } },
}));

import { POST } from "@/app/api/development-auth/sign-in/route";

function request(
  role = "STUDENT",
  url = "http://localhost:3000/api/development-auth/sign-in",
  headers: Record<string, string> = {},
) {
  const origin = new URL(url).origin;
  return new Request(url, {
    method: "POST",
    headers: { origin, ...headers },
    body: new URLSearchParams({ role }),
  });
}

describe("개발용 역할 로그인", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    findFirst.mockResolvedValue({ id: "20000000-0000-4000-8000-000000000001" });
    login.mockResolvedValue({
      cookies: [{ name: "better-auth.session_token", value: "signed-token", domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" }],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it.each(["STUDENT", "PROFESSOR", "ADMIN"])("%s 데모 로그인도 실제 로그인과 같은 프로젝트 찾기로 이동한다", async (role) => {
    const response = await POST(request(role));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/topics");
    expect(response.headers.get("set-cookie")).toContain("better-auth.session_token=signed-token");
    expect(login).toHaveBeenCalledWith({ userId: "20000000-0000-4000-8000-000000000001" });
  });

  it("운영 환경에서는 경로 자체를 노출하지 않는다", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await POST(request());

    expect(response.status).toBe(404);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("명시적으로 허용한 개발 배포 호스트에서는 운영 빌드도 데모 로그인을 허용한다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_DEVELOPMENT_MOCK_AUTH", "true");
    vi.stubEnv("DEVELOPMENT_MOCK_AUTH_HOSTS", "pnu-pms.jun0.dev");

    const response = await POST(request("STUDENT", "https://pnu-pms.jun0.dev/api/development-auth/sign-in"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://pnu-pms.jun0.dev/topics");
  });

  it("standalone 내부 URL 대신 전달된 외부 origin으로 이동한다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_DEVELOPMENT_MOCK_AUTH", "true");
    vi.stubEnv("DEVELOPMENT_MOCK_AUTH_HOSTS", "pnu-pms.jun0.dev");

    const response = await POST(request(
      "STUDENT",
      "http://localhost:3000/api/development-auth/sign-in",
      {
        origin: "https://pnu-pms.jun0.dev",
        host: "localhost:3000",
        "x-forwarded-host": "pnu-pms.jun0.dev",
        "x-forwarded-proto": "https",
      },
    ));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://pnu-pms.jun0.dev/topics");
  });

  it("데모 시드 계정이 없으면 실행 안내가 있는 로그인 화면으로 돌아간다", async () => {
    findFirst.mockResolvedValue(null);

    const response = await POST(request("PROFESSOR"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/?mockLogin=seed-required");
    expect(login).not.toHaveBeenCalled();
  });
});
