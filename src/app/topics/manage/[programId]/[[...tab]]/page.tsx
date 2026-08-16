import { redirect } from "next/navigation";

import { ProgramManagementRoutePage } from "@/app/topics/_management/program-management-route-page";
import { projectApprovalsHref } from "@/modules/topic-approval/ui/project-approval-route";

export default async function ProgramManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string; tab?: string[] }>;
  searchParams: Promise<{ targetMode?: string; approvals?: string }>;
}) {
  const { programId, tab } = await params;
  const { targetMode, approvals } = await searchParams;
  if (approvals === "pending") redirect(projectApprovalsHref({ programId, status: "PENDING" }));
  return <ProgramManagementRoutePage
    requestedProgramId={programId}
    tabSegments={tab}
    targetMode={targetMode}
  />;
}
