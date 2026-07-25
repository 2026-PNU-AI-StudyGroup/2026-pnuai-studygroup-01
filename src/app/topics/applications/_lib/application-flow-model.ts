import type { TopicApplicationPage } from "@/modules/topic-application/application/topic-application-ports";

type ApplicationCounts = TopicApplicationPage["counts"];

export type ApplicationFlowStep = {
  label: string;
  count: number;
  detail: string;
};

export type ApplicationFlowModel = {
  currentStep: number;
  steps: ApplicationFlowStep[];
  decidedCount: number;
};

export function buildApplicationFlowModel(input: {
  counts: ApplicationCounts;
  pendingInvitationCount: number;
  draftCount: number;
}): ApplicationFlowModel {
  const preparationCount = input.pendingInvitationCount + input.draftCount;
  const decidedCount = input.counts.ACCEPTED + input.counts.REJECTED;
  const currentStep =
    preparationCount > 0
      ? 0
      : input.counts.PENDING > 0
        ? 1
        : decidedCount > 0
          ? 2
          : -1;

  return {
    currentStep,
    decidedCount,
    steps: [
      {
        label: "팀 준비",
        count: preparationCount,
        detail: preparationCount
          ? "초대 응답이나 팀 구성을 확인해 주세요."
          : "확인할 초대와 팀 구성이 없습니다.",
      },
      {
        label: "교수 검토",
        count: input.counts.PENDING,
        detail: input.counts.PENDING
          ? "접수된 지원의 결정을 기다리고 있습니다."
          : "검토를 기다리는 지원이 없습니다.",
      },
      {
        label: "결과 확인",
        count: decidedCount,
        detail: decidedCount
          ? `선정 ${input.counts.ACCEPTED}건 · 미선정 ${input.counts.REJECTED}건`
          : "결정된 지원 결과가 없습니다.",
      },
    ],
  };
}
