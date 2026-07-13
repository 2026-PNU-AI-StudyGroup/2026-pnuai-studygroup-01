import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { TeamWorkspaceService } from "@/modules/team/application/manage-team-workspace";
import { PrismaTeamWorkspaceRepository } from "@/modules/team/infrastructure/prisma-team-workspace-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export default async function DashboardPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const repository = new PrismaTeamWorkspaceRepository(prisma);
  const teams = await new TeamWorkspaceService(
    repository,
    repository,
    repository,
  ).list(actor);

  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-8 px-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-700">대시보드</p>
          <h1 className="mt-2 text-3xl font-bold">{actor.role === "PROFESSOR" ? "지도 팀" : actor.role === "ADMIN" ? "전체 팀" : "내 팀"}</h1>
        </div>
        <Link href={actor.role === "STUDENT" ? "/topics" : "/professor/topics"} className="text-sm font-semibold text-blue-700">주제 화면</Link>
      </header>
      {teams.length === 0 ? (
        <p className="text-zinc-600">표시할 팀이 없습니다.</p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {teams.map((team) => {
            const progress = team.milestoneCount === 0 ? 0 : Math.round((team.completedMilestoneCount / team.milestoneCount) * 100);
            return (
              <li key={team.id} className="rounded-xl border p-5">
                <p className="text-sm text-zinc-600">{team.topicTitle}</p>
                <h2 className="mt-1 text-xl font-semibold">{team.name}</h2>
                <p className="mt-3 text-sm">팀원 {team.memberCount}명 · 진행률 {progress}%</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200"><div className="h-full bg-blue-700" style={{ width: `${progress}%` }} /></div>
                <Link href={`/teams/${team.id}`} className="mt-4 inline-block text-sm font-semibold text-blue-700">워크스페이스 열기</Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
