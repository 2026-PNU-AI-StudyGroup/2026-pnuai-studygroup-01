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

export function normalizeEmailHref(href: string): string {
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
