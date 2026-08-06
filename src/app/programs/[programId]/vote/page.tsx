import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProjectVoteBallot } from "@/app/programs/_components/project-vote-ballot";
import { AppShell } from "@/app/_components/app-shell";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectVotingService } from "@/modules/project-voting/application/manage-project-voting";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { PageHeader } from "@/shared/ui/page-primitives";

const phaseCopy = {
  UPCOMING: "투표 시작 전",
  OPEN: "투표 진행 중",
  CLOSED: "투표 종료",
} as const;

export default async function ProgramVotePage({ params }: { params: Promise<{ programId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { programId } = await params;
  const ballot = await new ProjectVotingService(new PrismaProjectVotingRepository(prisma)).getBallot(actor, programId);
  if (!ballot) notFound();

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={`/programs/${programId}/vote`}>
      <main className="content-shell page-enter space-y-8 pb-24">
        <PageHeader
          eyebrow="프로젝트 투표"
          title={ballot.programName}
          description={ballot.phase === "OPEN"
            ? `투표 종료: ${new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(ballot.policy.endsAt)}`
            : ballot.phase === "UPCOMING"
              ? `투표 시작: ${new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(ballot.policy.startsAt)}`
              : "투표가 종료되었습니다. 저장한 선택은 더 이상 변경할 수 없습니다."}
          actions={<Link href={`/topics?programId=${encodeURIComponent(programId)}`} className="button-secondary"><UiText>{"프로젝트 목록"}</UiText></Link>}
        />
        <section aria-labelledby="program-vote-title" className="mx-auto max-w-3xl rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-subtle)] p-5 shadow-[var(--shadow-admin-panel)] sm:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)]"><UiText>{"프로그램 투표"}</UiText></p>
              <h1 id="program-vote-title" className="mt-1 text-2xl font-bold tracking-[-0.035em]"><UiText>{phaseCopy[ballot.phase]}</UiText></h1>
            </div>
            <p className="text-xs text-[var(--muted)]"><UiDate value={ballot.policy.startsAt} mode="dateTime" /> – <UiDate value={ballot.policy.endsAt} mode="dateTime" /></p>
          </div>
          <ProjectVoteBallot ballot={ballot} />
        </section>
      </main>
    </AppShell>
  );
}
