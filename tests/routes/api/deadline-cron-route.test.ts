import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {} }));

import { POST } from "@/app/api/cron/deadlines/route";

const previous = process.env.CRON_SECRET;

afterEach(() => {
  process.env.CRON_SECRET = previous;
});

describe("마감 알림 작업 API", () => {
  it("비밀값이 구성되지 않으면 작업을 실행하지 않는다", async () => {
    delete process.env.CRON_SECRET;
    const response = await POST(new Request("http://localhost/api/cron/deadlines", { method: "POST" }));
    expect(response.status).toBe(503);
  });

  it("잘못된 Bearer 토큰을 거절한다", async () => {
    process.env.CRON_SECRET = "a-secure-random-cron-secret-with-48-characters-1234";
    const response = await POST(new Request("http://localhost/api/cron/deadlines", { method: "POST", headers: { authorization: "Bearer wrong" } }));
    expect(response.status).toBe(401);
  });
});
