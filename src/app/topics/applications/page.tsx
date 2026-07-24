import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ApplicationHistory } from "@/app/topics/applications/_components/application-history";
import { ReceivedTeamInvitations, TeamApplicationDrafts } from "@/app/topics/applications/_components/team-application-sections";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListOwnTopicApplicationsService } from "@/modules/topic-application/application/list-own-topic-applications";
import { TeamApplicationInvitationService } from "@/modules/topic-application/application/manage-team-application-invitations";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { PageHeader } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export const metadata: Metadata = { title: "내 프로젝트 지원 이력" };

export default async function TopicApplicationsPage({ searchParams }: { searchParams: Promise<{ page?: SearchParamValue }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/topics");

  const requestedPage = Number(firstSearchParam((await searchParams).page) ?? "1");
  const repository = new PrismaTopicApplicationRepository(prisma);
  const [applicationPage, teamApplications] = await Promise.all([
    new ListOwnTopicApplicationsService(repository).execute(actor, requestedPage, 20),
    new TeamApplicationInvitationService(repository).list(actor),
  ]);
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/topics/applications">
      <main className="content-shell page-enter space-y-10">
        <PageHeader
          eyebrow="프로젝트 지원"
          title="내 지원"
          description="팀원 초대부터 교수 검토와 최종 결과까지, 해야 할 일과 지원 상태를 한눈에 확인하세요."
          actions={<Link href="/topics" className="button-primary">새 주제 찾기</Link>}
        />
        <ReceivedTeamInvitations invitations={teamApplications.received} />
        <TeamApplicationDrafts drafts={teamApplications.drafts} />
        <ApplicationHistory page={applicationPage} hasDrafts={teamApplications.drafts.length > 0} />
      </main>
    </AppShell>
  );
}
