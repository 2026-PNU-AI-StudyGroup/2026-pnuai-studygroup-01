import type { TopicApprovalStatus } from "@/modules/topic-approval/application/manage-topic-approvals";

export function projectApprovalsHref({ page, programId, status }: {
  page?: number;
  programId?: string;
  status?: TopicApprovalStatus;
}) {
  const params = new URLSearchParams();
  if (programId) params.set("programId", programId);
  if (status) params.set("status", status);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/project-approvals?${query}` : "/project-approvals";
}
