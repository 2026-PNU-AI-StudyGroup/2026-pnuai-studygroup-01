export const EMAIL_DELIVERY_KINDS = [
  "TEAM_INVITATION",
  "PROJECT_ASSISTANT_INVITATION",
  "RECRUITMENT_APPLICATION",
  "RECRUITMENT_RESULT",
  "TOPIC_APPLICATION",
  "APPLICATION_RESULT",
  "TOPIC_APPROVAL",
  "PROJECT_REQUEST",
  "TASK_ASSIGNMENT",
  "PROJECT_MEMBERSHIP",
  "DEADLINE",
  "ACCOUNT_STATUS",
  "PROFESSOR_ACCESS",
  "REPORT_ACTIVITY",
  "DISCUSSION",
] as const;

export type EmailDeliveryKind = (typeof EMAIL_DELIVERY_KINDS)[number];

export type OptionalEmailKind = "REPORT_ACTIVITY" | "DISCUSSION";

export type DirectEmailDeliveryKind = "TEAM_INVITATION" | "PROFESSOR_ACCESS";

export function isOptionalEmailKind(kind: EmailDeliveryKind): kind is OptionalEmailKind {
  return kind === "REPORT_ACTIVITY" || kind === "DISCUSSION";
}

export function isDirectEmailDeliveryKind(kind: EmailDeliveryKind): kind is DirectEmailDeliveryKind {
  return kind === "TEAM_INVITATION" || kind === "PROFESSOR_ACCESS";
}

export type EmailPreferenceFlags = {
  reportActivityEnabled: boolean;
  discussionEnabled: boolean;
  programActivityEnabled: boolean;
  deadlineEnabled: boolean;
};

// 종류마다 어떤 수신 설정을 보는지 한곳에 모은다. 큐에 넣을 때와 실제로 보낼 때 두 곳에서
// 같은 판단을 해야 하는데, 예전에는 같은 if 문이 양쪽에 흩어져 있어 한쪽만 고치기 쉬웠다.
const PREFERENCE_FLAG_BY_KIND: Partial<Record<EmailDeliveryKind, keyof EmailPreferenceFlags>> = {
  REPORT_ACTIVITY: "reportActivityEnabled",
  DISCUSSION: "discussionEnabled",
  TOPIC_APPROVAL: "programActivityEnabled",
  DEADLINE: "deadlineEnabled",
};

// 프로그램 운영 알림은 담당 관리자의 업무 메일이라 기본값이 켜짐이다.
// 지정하는 순간 아무에게도 안 가는 상황을 만들지 않는다. 나머지 둘은 예전처럼 꺼짐.
export const EMAIL_PREFERENCE_DEFAULTS: EmailPreferenceFlags = {
  reportActivityEnabled: false,
  discussionEnabled: false,
  programActivityEnabled: true,
  // 마감 알림은 학생에게는 필요한 안내라 기본값이 켜짐이다. 여러 팀을 맡아 같은 메일을
  // 반복해서 받는 사람이 스스로 끌 수 있게 설정만 열어 둔다.
  deadlineEnabled: true,
};

export function emailPreferenceFlag(kind: EmailDeliveryKind): keyof EmailPreferenceFlags | null {
  return PREFERENCE_FLAG_BY_KIND[kind] ?? null;
}

export function emailPreferenceAllows(
  kind: EmailDeliveryKind,
  preference: Partial<EmailPreferenceFlags> | null | undefined,
): boolean {
  const flag = emailPreferenceFlag(kind);
  if (!flag) return true;
  return preference?.[flag] ?? EMAIL_PREFERENCE_DEFAULTS[flag];
}

// email_delivery.href 는 nullable 이고 발송·취소 후에는 본문과 함께 비워진다.
// 읽는 쪽에서 null 을 만나도 기본 경로로 떨어뜨린다.
export function normalizeEmailHref(href: string | null | undefined): string {
  if (!href) return "/dashboard";
  return href.startsWith("/") && !href.startsWith("//") ? href : "/dashboard";
}

export function englishEmailHeading(kind: EmailDeliveryKind): string {
  const labels: Record<EmailDeliveryKind, string> = {
    TEAM_INVITATION: "Team invitation",
    PROJECT_ASSISTANT_INVITATION: "Project assistant invitation",
    RECRUITMENT_APPLICATION: "Recruitment application",
    RECRUITMENT_RESULT: "Recruitment result",
    TOPIC_APPLICATION: "Project application",
    APPLICATION_RESULT: "Project application result",
    TOPIC_APPROVAL: "Project registration update",
    PROJECT_REQUEST: "Project guidance request",
    TASK_ASSIGNMENT: "Task update",
    PROJECT_MEMBERSHIP: "Project membership update",
    DEADLINE: "Deadline reminder",
    ACCOUNT_STATUS: "Account status update",
    PROFESSOR_ACCESS: "Professor access update",
    REPORT_ACTIVITY: "Report activity",
    DISCUSSION: "Project discussion",
  };
  return labels[kind];
}
