import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import { StudentTeamManagementSections } from "@/app/teams/manage/[teamId]/_components/student-team-management-sections";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { StudentTeamQueryService } from "@/modules/student-team/application/manage-student-teams";
import { PrismaStudentTeamQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-query-repository";
import { StudentTeamSectionLayout } from "@/modules/student-team/ui/student-team-section-layout";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("팀 상세 관리");
}

export default async function StudentTeamManagePage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/dashboard");
  const { teamId } = await params;
  const { teams } = await new StudentTeamQueryService(
    new PrismaStudentTeamQueryRepository(prisma),
  ).listWorkspace(actor);
  const team = teams.find((candidate) => candidate.id === teamId);
  if (!team) notFound();

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={`/teams/manage/${team.id}`}>
      <main className="page-enter pb-28 lg:min-h-screen lg:pb-0">
        <StudentTeamSectionLayout currentPath={`/teams/manage/${team.id}`}>
          <StudentTeamManagementSections team={team} actorId={actor.id} />
        </StudentTeamSectionLayout>
      </main>
    </AppShell>
  );
}
