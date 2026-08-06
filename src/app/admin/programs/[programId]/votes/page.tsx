import { redirect } from "next/navigation";

export default async function ProgramVoteResultsPage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params;
  redirect(`/admin/programs/${programId}/settings`);
}
