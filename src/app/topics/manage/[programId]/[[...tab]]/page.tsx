import { ProgramManagementRoutePage } from "@/app/topics/_management/program-management-route-page";

export default async function ProgramManagementPage({
  params,
}: {
  params: Promise<{ programId: string; tab?: string[] }>;
}) {
  const { programId, tab } = await params;
  return <ProgramManagementRoutePage requestedProgramId={programId} tabSegments={tab} />;
}
