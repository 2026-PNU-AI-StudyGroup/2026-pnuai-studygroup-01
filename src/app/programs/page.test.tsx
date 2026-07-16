import { describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("next/navigation", () => ({ redirect }));

import ProgramsPage from "./page";

describe("ProgramsPage", () => {
  it("별도 프로그램 화면 대신 주제 탐색으로 이동한다", async () => {
    await expect(ProgramsPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/topics");
  });
});
