import { redirect } from "next/navigation";

export default async function ProgramVotePage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params;
  redirect(`/topics?view=past&programId=${encodeURIComponent(programId)}`);
}
