import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: { feedbackPost: { create: mocks.create } },
}));

import { createFeedbackPostAction } from "@/app/feedback/_actions/feedback-actions";
import { feedbackInitialState } from "@/app/feedback/_lib/feedback-options";

function validPostForm() {
  const formData = new FormData();
  formData.set("authorName", "김사용자");
  formData.set("targetScreen", "COMMON");
  formData.set("area", "기타");
  formData.set("type", "BUG");
  formData.set("priority", "HIGH");
  formData.set("title", "피드백 제목");
  formData.set("body", "피드백 본문");
  return formData;
}

describe("createFeedbackPostAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.create.mockResolvedValue({});
  });

  it("선택한 우선순위를 피드백과 함께 저장한다", async () => {
    const result = await createFeedbackPostAction(feedbackInitialState, validPostForm());

    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        authorName: "김사용자",
        targetScreen: "COMMON",
        area: "기타",
        type: "BUG",
        priority: "HIGH",
        title: "피드백 제목",
        body: "피드백 본문",
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/feedback");
    expect(result.status).toBe("success");
  });

  it("우선순위가 없거나 허용값이 아니면 저장하지 않는다", async () => {
    const missing = validPostForm();
    missing.delete("priority");
    const unsupported = validPostForm();
    unsupported.set("priority", "CRITICAL");

    await expect(createFeedbackPostAction(feedbackInitialState, missing)).resolves.toMatchObject({ status: "error" });
    await expect(createFeedbackPostAction(feedbackInitialState, unsupported)).resolves.toMatchObject({ status: "error" });
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
