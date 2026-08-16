import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentOperationalActor, transaction } = vi.hoisted(() => ({
  getCurrentOperationalActor: vi.fn(),
  transaction: {
    $queryRaw: vi.fn(),
    rubricDefinition: { findFirst: vi.fn() },
    rubricScore: { findFirst: vi.fn() },
    advisorEvaluation: { findFirst: vi.fn() },
    projectTeamRubricEvaluation: { deleteMany: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("@/modules/identity/infrastructure/operational-actor", () => ({ getCurrentOperationalActor }));
vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: { $transaction: vi.fn(async (operation) => operation(transaction)) },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { archiveRubricAction, createRubricAction } from "@/app/topics/_management/rubric-actions";

const programId = "40000000-0000-4000-8000-000000000001";
const rubricId = "40000000-0000-4000-8000-000000000002";
const initialState = { status: "idle" as const, message: "" };

describe("채점표 관리 액션", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentOperationalActor.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
  });

  it("평가 항목 FormData가 빠지면 채점표를 만들지 않는다", async () => {
    const formData = new FormData();
    formData.set("title", "공식 평가");
    formData.set("gradingDueAt", "2026-08-20T09:00");
    formData.set("audience", "STAFF_ONLY");

    await expect(createRubricAction(programId, initialState, formData)).resolves.toEqual({
      status: "error",
      message: "평가 항목을 하나 이상 추가해 주세요.",
    });
  });

  it("자문위원 평가가 있으면 채점표 삭제를 차단한다", async () => {
    transaction.$queryRaw.mockResolvedValue([{ id: programId, startsAt: new Date(), endsAt: new Date() }]);
    transaction.rubricDefinition.findFirst.mockResolvedValue({ title: "외부 자문위원 기술 검토" });
    transaction.rubricScore.findFirst.mockResolvedValue(null);
    transaction.advisorEvaluation.findFirst.mockResolvedValue({ id: "advisor-evaluation-1" });

    await expect(archiveRubricAction(rubricId, programId, initialState)).resolves.toEqual({
      status: "error",
      message: "점수가 저장된 채점표는 삭제하거나 보관할 수 없습니다.",
    });
    expect(transaction.projectTeamRubricEvaluation.deleteMany).not.toHaveBeenCalled();
  });
});
