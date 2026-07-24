import type { TopicApplicationPage } from "@/modules/topic-application/application/topic-application-ports";

type ApplicationCounts = TopicApplicationPage["counts"];

export type ApplicationFlowStage = {
  eyebrow: string;
  title: string;
  description: string;
  step: number;
};

export type ApplicationFlowStep = {
  label: string;
  copy: string;
};

export type ApplicationFlowModel = {
  currentStage: ApplicationFlowStage;
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

  let currentStage: ApplicationFlowStage;
  if (preparationCount > 0) {
    currentStage = {
      eyebrow: "응답이 필요해요",
      title: `팀 준비 ${preparationCount}건`,
      description: "초대 응답과 팀원 수락 상태를 먼저 확인하세요.",
      step: 0,
    };
  } else if (input.counts.PENDING > 0) {
    currentStage = {
      eyebrow: "현재 진행 중",
      title: `교수 검토 ${input.counts.PENDING}건`,
      description: "접수가 완료되었습니다. 교수의 결정을 기다리고 있어요.",
      step: 1,
    };
  } else if (decidedCount > 0) {
    currentStage = {
      eyebrow: "결과 확인",
      title: `결정 완료 ${decidedCount}건`,
      description: "선정 여부와 결정된 날짜를 지원 내역에서 확인하세요.",
      step: 2,
    };
  } else {
    currentStage = {
      eyebrow: "지원 시작 전",
      title: "새 주제를 찾아보세요",
      description: "관심 있는 프로젝트를 비교한 뒤 개인 또는 팀으로 지원할 수 있어요.",
      step: -1,
    };
  }

  return {
    currentStage,
    decidedCount,
    steps: [
      { label: "팀 준비", copy: preparationCount ? `${preparationCount}건의 확인이 필요합니다.` : "초대와 팀원 응답을 완료합니다." },
      { label: "교수 검토", copy: input.counts.PENDING ? `${input.counts.PENDING}건을 검토하고 있습니다.` : "접수된 지원을 교수가 검토합니다." },
      { label: "결과 확인", copy: decidedCount ? `선정 ${input.counts.ACCEPTED}건 · 미선정 ${input.counts.REJECTED}건` : "결정된 지원 결과를 확인합니다." },
    ],
  };
}
