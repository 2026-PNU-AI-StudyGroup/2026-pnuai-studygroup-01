import { beforeEach, describe, expect, it, vi } from "vitest";

const { delegatedPost } = vi.hoisted(() => ({ delegatedPost: vi.fn(async () => new Response(null, { status: 204 })) }));

vi.mock("better-auth/next-js", () => ({ toNextJsHandler: () => ({ GET: vi.fn(), POST: delegatedPost }) }));
vi.mock("@/modules/identity/infrastructure/auth", () => ({ auth: {} }));

import { POST } from "@/app/api/auth/[...all]/route";

describe("인증 API 노출 범위", () => {
  beforeEach(() => delegatedPost.mockClear());

  it("Google 신원 이름과 사진을 바꾸는 기본 API를 차단한다", async () => {
    const response = await POST(new Request("http://localhost:3000/api/auth/update-user", { method: "POST" }));
    expect(response.status).toBe(404);
    expect(delegatedPost).not.toHaveBeenCalled();
  });

  it("로그아웃 등 허용된 인증 요청은 Better Auth로 전달한다", async () => {
    const request = new Request("http://localhost:3000/api/auth/sign-out", { method: "POST" });
    const response = await POST(request);
    expect(response.status).toBe(204);
    expect(delegatedPost).toHaveBeenCalledWith(request);
  });
});
