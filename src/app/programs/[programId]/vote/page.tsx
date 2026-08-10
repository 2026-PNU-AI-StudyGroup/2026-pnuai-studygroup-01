import { redirect } from "next/navigation";

import { prisma } from "@/shared/infrastructure/database/prisma";

export default async function ProgramVotePage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params;
  const program = await prisma.projectProgram.findUnique({
    where: { id: programId },
    select: { isPublic: true, lifecycleStatus: true },
  });
  const query = new URLSearchParams({ programId });
  if (!program || !program.isPublic || program.lifecycleStatus === "CLOSED") query.set("view", "past");
  redirect(`/topics?${query.toString()}`);
}
