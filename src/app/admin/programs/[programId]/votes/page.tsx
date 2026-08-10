import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProgramManagementNav } from "@/app/admin/programs/_components/program-management-nav";
import { ProgramVoteResults } from "@/app/admin/programs/_components/program-vote-results";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { AppShell } from "@/app/_components/app-shell";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { ProjectVotingService } from "@/modules/project-voting/application/manage-project-voting";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { EmptyState } from "@/shared/ui/page-primitives";

export default async function ProgramVoteResultsPage({ params }: { params: Promise<{ programId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const { programId } = await params;
  let program;
  try {
    program = await new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).getSettings(actor, programId);
  } catch {
    notFound();
  }
  const refreshedAt = new Date();
  const results = program.votingPolicy
    ? await new ProjectVotingService(new PrismaProjectVotingRepository(prisma), () => refreshedAt).getResults(actor, program.id)
    : null;

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={`/admin/programs/${program.id}/votes`}>
      <AdminWorkspace
        currentPath="/admin/programs"
        eyebrow="프로그램 관리"
        title={program.name}
        description="투표 규칙과 실시간 득표 현황을 확인합니다."
        actions={<Link href="/admin/programs" className="button-secondary"><UiText>{"프로그램 목록"}</UiText></Link>}
      >
        <div className="grid gap-5">
          <ProgramManagementNav programId={program.id} current="votes" />
          {results ? <ProgramVoteResults
            results={results}
            refreshedAt={new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Seoul" }).format(refreshedAt)}
            policySettingsHref={`/admin/programs/${program.id}/settings#voting-policy`}
          /> : <EmptyState
            title="투표 정책이 없는 프로그램입니다"
            description="투표 기간과 인당 가능 투표수를 설정하면 이 화면에서 현황을 확인할 수 있습니다."
            action={<Link href={`/admin/programs/${program.id}/settings#voting-policy`} className="button-primary"><UiText>{"투표 정책 설정"}</UiText></Link>}
          />}
        </div>
      </AdminWorkspace>
    </AppShell>
  );
}
