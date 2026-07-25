import { describe, expect, it } from "vitest";

import { buildApplicationFlowModel } from "@/app/topics/applications/_lib/application-flow-model";

describe("지원 흐름 표시 모델", () => {
  it("응답할 팀 초대와 초안을 실제 접수보다 먼저 안내한다", () => {
    const model = buildApplicationFlowModel({
      counts: { PENDING: 2, ACCEPTED: 1, REJECTED: 0 },
      pendingInvitationCount: 1,
      draftCount: 1,
    });

    expect(model.currentStep).toBe(0);
    expect(model.steps[0]).toMatchObject({ count: 2, label: "팀 준비" });
  });

  it("준비 작업이 없으면 대기 중인 교수 검토를 현재 단계로 표시한다", () => {
    const model = buildApplicationFlowModel({
      counts: { PENDING: 2, ACCEPTED: 1, REJECTED: 1 },
      pendingInvitationCount: 0,
      draftCount: 0,
    });

    expect(model.currentStep).toBe(1);
    expect(model.steps[1].count).toBe(2);
    expect(model.decidedCount).toBe(2);
  });

  it("지원 이력이 없으면 새 주제 탐색을 안내한다", () => {
    const model = buildApplicationFlowModel({
      counts: { PENDING: 0, ACCEPTED: 0, REJECTED: 0 },
      pendingInvitationCount: 0,
      draftCount: 0,
    });

    expect(model.currentStep).toBe(-1);
    expect(model.steps.every(({ count }) => count === 0)).toBe(true);
  });
});
