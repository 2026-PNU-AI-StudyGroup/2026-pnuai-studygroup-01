import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { RecruitmentApplicationsView } from "@/app/recruitments/_components/recruitment-applications-view";
import { RecruitmentSectionLayout } from "@/app/recruitments/_components/recruitment-section-layout";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { RecruitmentService } from "@/modules/recruitment/application/manage-recruitment";
import { PrismaRecruitmentRepository } from "@/modules/recruitment/infrastructure/prisma-recruitment-repository";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";

export const metadata: Metadata = { title: "모집 지원자 검토" };

export default async function RecruitmentPostApplicationsPage({ params }: { params: Promise<{ postId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT" && actor.role !== "ADMIN") redirect("/topics");
  const { postId } = await params;
  const post = await new RecruitmentService(
    new PrismaRecruitmentRepository(prisma),
    new PrismaTopicApplicationRepository(prisma),
  ).getPostApplications(actor, postId);
  if (!post) notFound();

  const content = <RecruitmentApplicationsView post={post} actorRole={actor.role} />;

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={actor.role === "STUDENT" ? "/recruitments/mine" : "/dashboard"}>
      <main className="content-shell">
        {actor.role === "STUDENT" ? <RecruitmentSectionLayout currentPath="/recruitments/mine">{content}</RecruitmentSectionLayout> : content}
      </main>
    </AppShell>
  );
}
