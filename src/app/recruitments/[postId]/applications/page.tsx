import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { RecruitmentApplicationsView } from "@/app/recruitments/_components/recruitment-applications-view";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { StudentTeamRecruitmentQueryService } from "@/modules/student-team/application/manage-student-team-recruitment";
import { PrismaStudentTeamRecruitmentQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository";
import { StudentTeamSectionLayout } from "@/modules/student-team/ui/student-team-section-layout";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("모집 지원자 검토");
}

export default async function RecruitmentPostApplicationsPage({ params }: { params: Promise<{ postId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT" && actor.role !== "ADMIN") redirect("/topics");
  const { postId } = await params;
  const post = await new StudentTeamRecruitmentQueryService(
    new PrismaStudentTeamRecruitmentQueryRepository(prisma),
  ).getPostApplications(actor, postId);
  if (!post) notFound();

  const content = <RecruitmentApplicationsView post={post} actorRole={actor.role} />;

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={actor.role === "STUDENT" ? "/recruitments/mine" : "/dashboard"}>
      <main className={actor.role === "STUDENT" ? "pb-28 lg:min-h-screen lg:pb-0" : "content-shell"}>
        {actor.role === "STUDENT" ? <StudentTeamSectionLayout currentPath="/recruitments/mine">{content}</StudentTeamSectionLayout> : content}
      </main>
    </AppShell>
  );
}
