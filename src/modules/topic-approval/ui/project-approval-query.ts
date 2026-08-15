import { topicApprovalStatuses, type TopicApprovalStatus } from "@/modules/topic-approval/domain/topic-approval-status";

export type ProjectApprovalQuery = {
  programId?: string;
  status?: TopicApprovalStatus;
  page?: number;
};

export function parseTopicApprovalStatus(value: string | undefined): TopicApprovalStatus | undefined {
  return topicApprovalStatuses.includes(value as TopicApprovalStatus)
    ? value as TopicApprovalStatus
    : undefined;
}

export function projectApprovalsHref(input: ProjectApprovalQuery = {}) {
  const params = new URLSearchParams();
  if (input.programId) params.set("programId", input.programId);
  if (input.status) params.set("status", input.status);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return query ? `/project-approvals?${query}` : "/project-approvals";
}

export function projectApprovalDetailHref(requestId: string, input: ProjectApprovalQuery = {}) {
  const params = new URLSearchParams();
  if (input.programId) params.set("programId", input.programId);
  if (input.status) params.set("status", input.status);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return query
    ? `/project-approvals/${encodeURIComponent(requestId)}?${query}`
    : `/project-approvals/${encodeURIComponent(requestId)}`;
}
