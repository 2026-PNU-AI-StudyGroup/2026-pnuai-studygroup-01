import type { TopicApplicationSummary } from "@/modules/topic-application/application/topic-application-ports";

type TopicApplicationStatusPresentation = {
  label: string;
  tone: "info" | "success" | "danger";
};

export const topicApplicationStatusPresentation = {
  PENDING: { label: "검토 중", tone: "info" },
  ACCEPTED: { label: "선정", tone: "success" },
  REJECTED: { label: "미선정", tone: "danger" },
} as const satisfies Record<
  TopicApplicationSummary["status"],
  TopicApplicationStatusPresentation
>;
