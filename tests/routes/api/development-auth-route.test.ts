import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { deleteMany, findFirst, login } = vi.hoisted(() => ({
  deleteMany: vi.fn(),
  findFirst: vi.fn(),
  login: vi.fn(),
}));

vi.mock("@/modules/identity/infrastructure/auth", () => ({
  auth: { $context: Promise.resolve({ test: { login } }) },
}));
vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: { user: { findFirst }, session: { deleteMany } },
}));

import { POST } from "@/app/api/development-auth/sign-in/route";

function request(role = "STUDENT") {
  return new Request("http://localhost:3000/api/development-auth/sign-in", {
    method: "POST",
    headers: { origin: "http://localhost:3000" },
    body: new URLSearchParams({ role }),
  });
}

describe("개발용 역할 로그인", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    findFirst.mockResolvedValue({ id: "20000000-0000-4000-8000-000000000001" });
    deleteMany.mockResolvedValue({ count: 1 });
    login.mockResolvedValue({
      cookies: [{ name: "better-auth.session_token", value: "signed-token", domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" }],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it.each(["STUDENT", "PROFESSOR", "ADMIN"])("%s 데모 로그인도 실제 로그인과 같은 프로젝트 탐색으로 이동한다", async (role) => {
    const response = await POST(request(role));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/topics");
    expect(response.headers.get("set-cookie")).toContain("better-auth.session_token=signed-token");
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: "20000000-0000-4000-8000-000000000001" } });
    expect(login).toHaveBeenCalledWith({ userId: "20000000-0000-4000-8000-000000000001" });
  });

  it("운영 환경에서는 경로 자체를 노출하지 않는다", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await POST(request());

    expect(response.status).toBe(404);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("데모 시드 계정이 없으면 실행 안내가 있는 로그인 화면으로 돌아간다", async () => {
    findFirst.mockResolvedValue(null);

    const response = await POST(request("PROFESSOR"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/?mockLogin=seed-required");
    expect(login).not.toHaveBeenCalled();
  });
});
