import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ReceivedRecruitmentApplicationsView } from "@/app/recruitments/_components/received-recruitment-applications-view";
import { AppShell } from "@/app/_components/app-shell";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { StudentTeamRecruitmentQueryService } from "@/modules/student-team/application/manage-student-team-recruitment";
import { PrismaStudentTeamRecruitmentQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository";
import { StudentTeamSectionLayout } from "@/modules/student-team/ui/student-team-section-layout";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("받은 지원");
}

export default async function ReceivedRecruitmentApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ teamId?: SearchParamValue }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/topics");
  const teamId = firstSearchParam((await searchParams).teamId);
  const applications = await new StudentTeamRecruitmentQueryService(
    new PrismaStudentTeamRecruitmentQueryRepository(prisma),
  ).listReceivedApplications(actor, teamId);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/recruitments/received">
      <main className="pb-28 lg:min-h-screen lg:pb-0">
        <StudentTeamSectionLayout currentPath="/recruitments/received">
          <ReceivedRecruitmentApplicationsView applications={applications} teamId={teamId} />
        </StudentTeamSectionLayout>
      </main>
    </AppShell>
  );
}
