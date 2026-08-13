import { beforeEach, describe, expect, it, vi } from "vitest";

import ProgramDetailPage from "@/app/admin/programs/[programId]/page";

const { getCurrentActor, redirect } = vi.hoisted(() => ({
  getCurrentActor: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor }));

describe("이전 프로그램 관리 주소", () => {
  beforeEach(() => {
    redirect.mockReset();
    getCurrentActor.mockResolvedValue({ id: "admin-1", name: "관리자", role: "ADMIN" });
  });

  it("기본 진입은 통합 화면 설정 탭으로 보낸다", async () => {
    await ProgramDetailPage({ params: Promise.resolve({ programId: "program-1" }), searchParams: Promise.resolve({}) });
    expect(redirect).toHaveBeenCalledWith("/topics?programId=program-1&mode=manage&tab=settings");
  });

  it("기존 탭 파라미터를 통합 화면에서도 보존한다", async () => {
    await ProgramDetailPage({ params: Promise.resolve({ programId: "program-1" }), searchParams: Promise.resolve({ tab: "votes" }) });
    expect(redirect).toHaveBeenCalledWith("/topics?programId=program-1&mode=manage&tab=votes");
  });
});
