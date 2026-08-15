import type { EmailDeliveryKind } from "@/modules/email/domain/email-delivery";

export const emailDeliveryStatusLabel = {
  PENDING: "대기",
  PROCESSING: "처리 중",
  RETRY_WAIT: "재시도 대기",
  SENT: "최근 발송 성공",
  FAILED: "실패",
  CANCELED: "취소",
} as const;

export const emailDeliveryKindLabel: Record<EmailDeliveryKind, string> = {
  TEAM_INVITATION: "팀원 초대",
  PROJECT_ASSISTANT_INVITATION: "프로젝트 조교 초대",
  RECRUITMENT_APPLICATION: "팀원 모집 지원",
  RECRUITMENT_RESULT: "팀원 모집 결과",
  TOPIC_APPLICATION: "프로젝트 지원",
  APPLICATION_RESULT: "프로젝트 지원 결과",
  TOPIC_APPROVAL: "프로젝트 제안 승인",
  PROJECT_REQUEST: "지도·검토 요청",
  TASK_ASSIGNMENT: "할 일",
  PROJECT_MEMBERSHIP: "프로젝트 구성원",
  DEADLINE: "마감",
  ACCOUNT_STATUS: "계정 상태",
  PROFESSOR_ACCESS: "교수 권한",
  REPORT_ACTIVITY: "보고서 활동",
  DISCUSSION: "프로젝트 토론",
};

export function maskEmailAddress(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  return `${local.slice(0, 2)}${"*".repeat(Math.max(2, Math.min(8, local.length - 2)))}@${domain}`;
}
