import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  revalidatePath: vi.fn(),
  getCurrentActor: vi.fn(),
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
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({
  getCurrentActor: mocks.getCurrentActor,
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
    mocks.getCurrentActor.mockResolvedValue({ id: "user-1", name: "김사용자", email: "kim@pusan.ac.kr", role: "STUDENT" });
  });

  it("선택한 우선순위를 피드백과 함께 저장한다", async () => {
    const result = await createFeedbackPostAction(feedbackInitialState, validPostForm());

    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        // 글쓴이는 로그인 세션에서 받는다. 자유 입력이던 때는 사칭이 가능했다.
        authorName: "김사용자",
        authorId: "user-1",
        authorEmail: "kim@pusan.ac.kr",
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

  // 로그인을 받지만 서버 액션은 여전히 공개 HTTP 엔드포인트다. 속도 제한도 함께 둔다.
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

  it("로그인하지 않으면 저장하지 않는다", async () => {
    // 읽기는 열어 두지만 글쓴이를 남겨야 하므로 쓰기는 세션이 있어야 한다.
    mocks.getCurrentActor.mockResolvedValue(null);

    await expect(createFeedbackPostAction(feedbackInitialState, validPostForm()))
      .resolves.toMatchObject({ status: "error", message: "피드백을 남기려면 로그인해 주세요." });
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
