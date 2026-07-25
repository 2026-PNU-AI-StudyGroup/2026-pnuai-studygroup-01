import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProjectDashboardHero } from "@/app/dashboard/_components/project-dashboard-hero";
import { ProjectList } from "@/app/dashboard/_components/project-list";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { TeamWorkspaceService } from "@/modules/team/application/manage-team-workspace";
import { PrismaTeamWorkspaceRepository } from "@/modules/team/infrastructure/prisma-team-workspace-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "프로젝트" };

export default async function DashboardPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const repository = new PrismaTeamWorkspaceRepository(prisma);
  const teams = await new TeamWorkspaceService(repository, repository, repository).list(actor);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/dashboard">
      <main className="content-shell page-enter space-y-10">
        <ProjectDashboardHero role={actor.role} />
        {teams.length === 0 ? (
          <EmptyState title="아직 연결된 프로젝트가 없습니다" description={actor.role === "STUDENT" ? "관심 있는 프로젝트를 발견하고 첫 지원을 시작해 보세요." : "주제를 만들거나 학생 지원을 승인하면 팀이 연결됩니다."} action={<Link href={actor.role === "STUDENT" ? "/topics" : "/professor/topics"} className="button-secondary">{actor.role === "STUDENT" ? "프로젝트 둘러보기" : "새 주제 만들기"}</Link>} />
        ) : <ProjectList role={actor.role} teams={teams} />}
      </main>
    </AppShell>
  );
}
