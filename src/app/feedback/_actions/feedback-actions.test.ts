import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }),
}));
vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: { feedbackPost: { create: mocks.create } },
}));

import { createFeedbackPostAction } from "@/app/feedback/_actions/feedback-actions";
import { feedbackInitialState } from "@/app/feedback/_lib/feedback-options";
import { resetFeedbackRateLimit } from "@/app/feedback/_lib/feedback-rate-limit";

function validPostForm() {
  const formData = new FormData();
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
    resetFeedbackRateLimit();
    mocks.create.mockResolvedValue({});
  });

  it("선택한 우선순위를 피드백과 함께 저장한다", async () => {
    const result = await createFeedbackPostAction(feedbackInitialState, validPostForm());

    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        // 이름은 받지 않는다. 자유 입력이라 사칭이 가능했고 실명이 그대로 공개됐다.
        authorName: "익명",
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

  // 서버 액션은 공개 HTTP 엔드포인트다. 로그인을 요구하지 않기로 정했으므로 속도로 막는다.
  it("같은 요청자가 연달아 넣으면 막고 다시 시도할 시각을 알려 준다", async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(createFeedbackPostAction(feedbackInitialState, validPostForm()))
        .resolves.toMatchObject({ status: "success" });
    }
    const blocked = await createFeedbackPostAction(feedbackInitialState, validPostForm());

    expect(blocked.status).toBe("error");
    expect(blocked.message).toMatch(/초 뒤에 다시 시도/);
    expect(mocks.create).toHaveBeenCalledTimes(3);
  });
});
