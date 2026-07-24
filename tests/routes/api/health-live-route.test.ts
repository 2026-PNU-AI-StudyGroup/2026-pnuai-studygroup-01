import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/health/live/route";

describe("생존 상태 API", () => {
  it("프로세스가 요청을 처리하면 캐시 없는 정상 상태를 반환한다", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });
});
