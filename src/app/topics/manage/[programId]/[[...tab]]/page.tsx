import { ProgramManagementRoutePage } from "@/app/topics/_management/program-management-route-page";

export default async function ProgramManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string; tab?: string[] }>;
  searchParams: Promise<{ targetMode?: string; approvals?: string }>;
}) {
  const { programId, tab } = await params;
  const { targetMode, approvals } = await searchParams;
  return <ProgramManagementRoutePage
    requestedProgramId={programId}
    tabSegments={tab}
    targetMode={targetMode}
    showApprovals={approvals === "pending"}
  />;
}
