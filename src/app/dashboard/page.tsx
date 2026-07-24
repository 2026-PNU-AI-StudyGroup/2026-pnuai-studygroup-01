import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProjectDashboardHero, ProjectList } from "@/app/dashboard/_components/project-list";
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
  const teams = await new TeamWorkspaceService(repository, repository, repository, repository).list(actor);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/dashboard">
      <main className="content-shell page-enter space-y-10">
        <ProjectDashboardHero role={actor.role} teams={teams} />
        {teams.length === 0 ? (
          <EmptyState title="아직 연결된 프로젝트가 없습니다" description={actor.role === "STUDENT" ? "공개 주제를 탐색하고 관심 있는 프로젝트에 지원해 보세요." : "주제를 등록하거나 학생 지원을 승인하면 이곳에 팀이 표시됩니다."} action={<Link href={actor.role === "STUDENT" ? "/topics" : "/professor/topics"} className="button-secondary">{actor.role === "STUDENT" ? "주제 탐색하기" : "주제 등록하기"}</Link>} />
        ) : <ProjectList role={actor.role} teams={teams} />}
      </main>
    </AppShell>
  );
}
