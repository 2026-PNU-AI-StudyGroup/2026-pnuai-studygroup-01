import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentOperationalActor, transaction } = vi.hoisted(() => ({
  getCurrentOperationalActor: vi.fn(),
  transaction: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/modules/identity/infrastructure/operational-actor", () => ({
  getCurrentOperationalActor,
}));
vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (operation) => operation(transaction)),
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { saveRubricScoresAction } from "@/app/projects/[projectId]/_actions/rubric-actions";

describe("프로젝트 평가 저장 SQL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentOperationalActor.mockResolvedValue({ id: "admin-1", name: "관리자", role: "ADMIN" });
    transaction.$queryRaw
      .mockResolvedValueOnce([{ id: "40000000-0000-4000-8000-000000000001" }])
      .mockResolvedValueOnce([{ id: "40000000-0000-4000-8000-000000000001" }])
      .mockResolvedValueOnce([]);
  });

  it("개명된 프로젝트 팀 평가 테이블과 FK로 권한을 검사한다", async () => {
    await expect(saveRubricScoresAction(
      "70000000-0000-4000-8000-000000000001",
      "80000000-0000-4000-8000-000000000001",
      { status: "idle", message: "" },
      new FormData(),
    )).resolves.toEqual({ status: "error", message: "채점 권한 또는 채점 마감을 확인해 주세요." });

    const sql = transaction.$queryRaw.mock.calls
      .map(([query]) => (query as { strings: readonly string[] }).strings.join("?"))
      .join("\n");
    expect(sql).toContain('FROM "project_team_rubric_evaluation"');
    expect(sql).toContain('evaluation."projectTeamId"');
    expect(sql).not.toContain('FROM "team_rubric_evaluation"');
    expect(sql).not.toContain('evaluation."teamId"');
  });
});
