import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import { StudentTeamManagementSections } from "@/app/teams/manage/[teamId]/_components/student-team-management-sections";
import { RecruitmentPostForm } from "@/app/_components/recruitment-post-form";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { StudentTeamQueryService } from "@/modules/student-team/application/manage-student-teams";
import { StudentTeamRecruitmentQueryService } from "@/modules/student-team/application/manage-student-team-recruitment";
import { PrismaStudentTeamQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-query-repository";
import { PrismaStudentTeamRecruitmentQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository";
import { StudentTeamSectionLayout } from "@/modules/student-team/ui/student-team-section-layout";
import { TeamModal } from "@/modules/student-team/ui/team-modal";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("팀 상세 관리");
}

export default async function StudentTeamManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ modal?: string }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/dashboard");
  const { teamId } = await params;
  const teamService = new StudentTeamQueryService(
    new PrismaStudentTeamQueryRepository(prisma),
  );
  const { teams } = await teamService.listWorkspace(actor);
  const team = teams.find((candidate) => candidate.id === teamId);
  if (!team) notFound();
  const recruitmentService = new StudentTeamRecruitmentQueryService(
    new PrismaStudentTeamRecruitmentQueryRepository(prisma),
  );
  const [postData, leaderTeams, { modal }] = await Promise.all([
    recruitmentService.listAuthoredPosts(actor, 1, team.id),
    recruitmentService.listLeaderTeams(actor),
    searchParams,
  ]);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={`/teams/manage/${team.id}`}>
      <main className="page-enter pb-28 lg:min-h-screen lg:pb-0">
        <StudentTeamSectionLayout currentPath={`/teams/manage/${team.id}`}>
          <StudentTeamManagementSections team={team} actorId={actor.id} recruitmentPosts={postData.posts} />
          {modal === "recruitment" && team.leaderId === actor.id ? (
            <TeamModal title="팀원 모집 공고" closeHref={`/teams/manage/${team.id}`} size="wide">
              <RecruitmentPostForm teams={leaderTeams.filter((candidate) => candidate.id === team.id)} selectedTeamId={team.id} successHref={`/teams/manage/${team.id}`} surface="embedded" />
            </TeamModal>
          ) : null}
        </StudentTeamSectionLayout>
      </main>
    </AppShell>
  );
}
