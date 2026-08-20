import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  updateMany: vi.fn(),
  getCurrentActor: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("REDIRECT");
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor: mocks.getCurrentActor }));
vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: { projectProgram: { count: mocks.count, updateMany: mocks.updateMany } },
}));

import { renameProgramCategoryAction } from "@/app/admin/program-categories/_actions/program-category-actions";

const initialState = { status: "idle" as const, message: "" };

function form(from: string, to: string) {
  const formData = new FormData();
  formData.set("from", from);
  formData.set("to", to);
  return formData;
}

describe("renameProgramCategoryAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentActor.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mocks.count.mockResolvedValue(0);
    mocks.updateMany.mockResolvedValue({ count: 3 });
  });

  it("그 분류를 쓰는 프로그램을 한 번에 고친다", async () => {
    // 분류는 별도 테이블이 아니라 프로그램의 문자열이라 일괄 UPDATE 가 곧 이름 변경이다.
    const result = await renameProgramCategoryAction(initialState, form("해커톤", "창의융합 해커톤"));

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { category: "해커톤" },
      data: { category: "창의융합 해커톤" },
    });
    expect(result.status).toBe("success");
  });

  it("이미 있는 이름으로 바꾸면 합친 것으로 안내한다", async () => {
    mocks.count.mockResolvedValue(2);

    const result = await renameProgramCategoryAction(initialState, form("해커톤", "창의융합 해커톤"));

    expect(result.message).toContain("합쳤습니다");
  });

  it("같은 이름이면 아무것도 바꾸지 않는다", async () => {
    const result = await renameProgramCategoryAction(initialState, form("해커톤", "해커톤"));

    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
  });

  it("관리자가 아니면 거부한다", async () => {
    mocks.getCurrentActor.mockResolvedValue({ id: "prof-1", role: "PROFESSOR" });

    const result = await renameProgramCategoryAction(initialState, form("해커톤", "융합 해커톤"));

    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
  });

  it("이미 사라진 분류면 오류로 알린다", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });

    const result = await renameProgramCategoryAction(initialState, form("옛 분류", "새 분류"));

    expect(result.status).toBe("error");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
