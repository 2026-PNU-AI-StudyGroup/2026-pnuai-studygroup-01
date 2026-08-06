import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProgramVoteResults } from "@/app/admin/programs/_components/program-vote-results";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { AppShell } from "@/app/_components/app-shell";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectVotingService } from "@/modules/project-voting/application/manage-project-voting";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";

export default async function ProgramVoteResultsPage({ params }: { params: Promise<{ programId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const { programId } = await params;
  const refreshed = new Date();
  const results = await new ProjectVotingService(new PrismaProjectVotingRepository(prisma), () => refreshed).getResults(actor, programId);
  if (!results) notFound();
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={`/admin/programs/${programId}/votes`}>
      <AdminWorkspace
        currentPath="/admin/programs"
        title={`${results.programName} 득표현황`}
        description={<><UiDate value={results.policy.startsAt} mode="dateTime" /> – <UiDate value={results.policy.endsAt} mode="dateTime" /></>}
        actions={<><Link href={`/admin/programs/${programId}/settings`} className="button-secondary"><UiText>{"투표 설정"}</UiText></Link><Link href="/admin/programs" className="button-secondary"><UiText>{"프로그램 목록"}</UiText></Link></>}
      >
        <ProgramVoteResults results={results} refreshedAt={new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Seoul" }).format(refreshed)} />
      </AdminWorkspace>
    </AppShell>
  );
}
