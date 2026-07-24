import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/identity/infrastructure/current-actor", () => ({
  getCurrentActor: vi.fn(async () => ({ id: "student-1", role: "STUDENT" })),
}));
vi.mock("@/app/api/uploads/_lib/upload-service", () => ({
  uploadService: vi.fn(() => ({ create: vi.fn(), complete: vi.fn() })),
}));

import { POST as completeUpload } from "@/app/api/uploads/complete/route";
import { POST as presignUpload } from "@/app/api/uploads/presign/route";

describe("업로드 API 요청 본문 제한", () => {
  it("업로드 예약의 16KiB 초과 JSON을 거절한다", async () => {
    const response = await presignUpload(new Request("http://localhost/api/uploads/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ padding: "x".repeat(17_000) }),
    }));
    expect(response.status).toBe(413);
  });

  it("업로드 완료의 4KiB 초과 JSON을 거절한다", async () => {
    const response = await completeUpload(new Request("http://localhost/api/uploads/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ padding: "x".repeat(5_000) }),
    }));
    expect(response.status).toBe(413);
  });
});
