export const topicApprovalStatuses = ["PENDING", "APPROVED", "REJECTED", "WITHDRAWN", "CANCELED"] as const;

export type TopicApprovalStatus = typeof topicApprovalStatuses[number];
