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

// 선택 가능한 메일은 전부 기본 꺼짐이다. 받고 싶은 사람이 마이페이지에서 켠다.
//
// 교수님들이 관리자로도 들어와 계셔서 운영 메일이 한 사람에게 몰렸다. 메일을 줄이자는
// 결정이라 기본값을 껐다. 앱 안 알림은 이 설정과 무관하게 그대로 쌓이므로 종 아이콘에서는
// 다 보인다. 정보가 사라지는 것이 아니라 메일만 안 가는 것이다.
//
// 대신 프로젝트 등록 검토 요청도 메일로는 안 간다. 담당 관리자가 승인 대기함을 직접
// 봐야 한다는 뜻이니 운영 방식과 함께 봐야 한다.
export const EMAIL_PREFERENCE_DEFAULTS: EmailPreferenceFlags = {
  reportActivityEnabled: false,
  discussionEnabled: false,
  programActivityEnabled: false,
  deadlineEnabled: false,
};

// 수신 설정을 읽는 Prisma select. 큐에 넣는 쪽과 보내는 쪽이 같은 값을 써야 한다.
//
// 판단은 위 PREFERENCE_FLAG_BY_KIND 로 모았는데 select 는 두 곳에 손으로 복사돼 있었다.
// 그래서 deadlineEnabled 가 양쪽에서 빠진 것을 아무도 몰랐다. 필드를 안 읽으면
// emailPreferenceAllows 가 undefined 를 받아 기본값(꺼짐)으로 떨어지므로, 마이페이지에서
// 켠 사람에게도 마감 메일이 영원히 안 갔다. 조용히 실패하는 형태라 더 나빴다.
//
// satisfies 로 묶어 두면 EmailPreferenceFlags 에 설정을 더할 때 여기를 빠뜨리면 컴파일이
// 깨진다. 같은 실수를 다시 하지 않으려면 필드 추가보다 이 잠금이 중요하다.
export const EMAIL_PREFERENCE_SELECT = {
  reportActivityEnabled: true,
  discussionEnabled: true,
  programActivityEnabled: true,
  deadlineEnabled: true,
} as const satisfies Record<keyof EmailPreferenceFlags, true>;

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
