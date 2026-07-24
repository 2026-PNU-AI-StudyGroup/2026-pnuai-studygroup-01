import { describe, expect, it } from "vitest";

import { buildApplicationFlowModel } from "@/app/topics/applications/_lib/application-flow-model";

describe("지원 흐름 표시 모델", () => {
  it("응답할 팀 초대와 초안을 실제 접수보다 먼저 안내한다", () => {
    const model = buildApplicationFlowModel({
      counts: { PENDING: 2, ACCEPTED: 1, REJECTED: 0 },
      pendingInvitationCount: 1,
      draftCount: 1,
    });

    expect(model.currentStage).toMatchObject({ step: 0, title: "팀 준비 2건" });
    expect(model.steps[0].copy).toBe("2건의 확인이 필요합니다.");
  });

  it("준비 작업이 없으면 대기 중인 교수 검토를 현재 단계로 표시한다", () => {
    const model = buildApplicationFlowModel({
      counts: { PENDING: 2, ACCEPTED: 1, REJECTED: 1 },
      pendingInvitationCount: 0,
      draftCount: 0,
    });

    expect(model.currentStage).toMatchObject({ step: 1, title: "교수 검토 2건" });
    expect(model.decidedCount).toBe(2);
  });

  it("지원 이력이 없으면 새 주제 탐색을 안내한다", () => {
    const model = buildApplicationFlowModel({
      counts: { PENDING: 0, ACCEPTED: 0, REJECTED: 0 },
      pendingInvitationCount: 0,
      draftCount: 0,
    });

    expect(model.currentStage).toMatchObject({ step: -1, title: "새 주제를 찾아보세요" });
  });
});
