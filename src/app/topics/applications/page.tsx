import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ApplicationFlow } from "@/app/topics/applications/_components/application-flow";
import { ApplicationHistory } from "@/app/topics/applications/_components/application-history";
import { ReceivedTeamInvitations, TeamApplicationDrafts } from "@/app/topics/applications/_components/team-application-sections";
import { buildApplicationFlowModel } from "@/app/topics/applications/_lib/application-flow-model";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListOwnTopicApplicationsService } from "@/modules/topic-application/application/list-own-topic-applications";
import { TeamApplicationInvitationService } from "@/modules/topic-application/application/manage-team-application-invitations";
import { PrismaTeamApplicationInvitationRepository } from "@/modules/topic-application/infrastructure/prisma-team-application-invitation-repository";
import { PrismaTopicApplicationQueryRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export const metadata: Metadata = { title: "내 프로젝트 지원 이력" };

export default async function TopicApplicationsPage({ searchParams }: { searchParams: Promise<{ page?: SearchParamValue }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/topics");

  const requestedPage = Number(firstSearchParam((await searchParams).page) ?? "1");
  const [applicationPage, teamApplications] = await Promise.all([
    new ListOwnTopicApplicationsService(
      new PrismaTopicApplicationQueryRepository(prisma),
    ).execute(actor, requestedPage, 20),
    new TeamApplicationInvitationService(
      new PrismaTeamApplicationInvitationRepository(prisma),
    ).list(actor),
  ]);
  const flowModel = buildApplicationFlowModel({
    counts: applicationPage.counts,
    pendingInvitationCount: teamApplications.received.filter(({ status }) => status === "PENDING").length,
    draftCount: teamApplications.drafts.length,
  });
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/topics/applications">
      <main className="content-shell page-enter space-y-8">
        <header className="flex flex-col gap-6 rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-6 sm:flex-row sm:items-end sm:justify-between sm:p-7">
          <div>
            <h1 className="text-[clamp(2.25rem,4vw,3.3rem)] font-black leading-none tracking-[-0.055em]">내 지원</h1>
            <p className="mt-3 max-w-2xl text-[0.9375rem] leading-6 text-[var(--muted)]">응답이 필요한 초대와 접수된 지원, 결정된 결과를 시간 순서로 확인합니다.</p>
          </div>
          <Link href="/topics" className="button-primary">
            프로젝트 찾기
            <svg aria-hidden="true" viewBox="0 0 20 20" className="ml-2 size-4 fill-none stroke-current stroke-[1.75]"><path d="M4 10h11M11 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
        </header>
        <ApplicationFlow model={flowModel} total={applicationPage.total} />
        <ReceivedTeamInvitations invitations={teamApplications.received} />
        <TeamApplicationDrafts drafts={teamApplications.drafts} />
        <ApplicationHistory page={applicationPage} hasDrafts={teamApplications.drafts.length > 0} />
      </main>
    </AppShell>
  );
}
