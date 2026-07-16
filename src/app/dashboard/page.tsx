import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { TeamWorkspaceService } from "@/modules/team/application/manage-team-workspace";
import { PrismaTeamWorkspaceRepository } from "@/modules/team/infrastructure/prisma-team-workspace-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, ProgressBar, StatusBadge } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "프로젝트" };

export default async function DashboardPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const repository = new PrismaTeamWorkspaceRepository(prisma);
  const teams = await new TeamWorkspaceService(repository, repository, repository, repository).list(actor);
  const title = actor.role === "PROFESSOR" ? "지도 프로젝트" : actor.role === "ADMIN" ? "전체 프로젝트" : "내 프로젝트";

  return (
    <AppShell role={actor.role} userName={actor.name} currentPath="/dashboard">
      <main className="content-shell space-y-10">
        <PageHeader eyebrow="프로젝트 현황" title={title} description="팀의 현재 진행 상태, 마일스톤, 보고서 제출과 다음 작업을 확인하세요." actions={<Link href={actor.role === "STUDENT" ? "/topics" : "/professor/topics"} className="button-primary">{actor.role === "STUDENT" ? "프로젝트 탐색" : "주제 관리"}</Link>} />
        {teams.length === 0 ? (
          <EmptyState title="아직 연결된 프로젝트가 없습니다" description={actor.role === "STUDENT" ? "공개 주제를 탐색하고 관심 있는 프로젝트에 지원해 보세요." : "주제를 등록하거나 학생 지원을 승인하면 이곳에 팀이 표시됩니다."} action={<Link href={actor.role === "STUDENT" ? "/topics" : "/professor/topics"} className="button-secondary">{actor.role === "STUDENT" ? "주제 탐색하기" : "주제 등록하기"}</Link>} />
        ) : (
          <section aria-label="프로젝트 목록" className="border-t border-[var(--line)]">
            <ul className="divide-y divide-[var(--line)]">
              {teams.map((team) => {
                const progress = team.milestoneCount === 0 ? 0 : Math.round((team.completedMilestoneCount / team.milestoneCount) * 100);
                return (
                  <li key={team.id} className="grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_260px_9rem] lg:items-center">
                    <div><div className="flex flex-wrap items-start gap-3"><h2 className="text-2xl font-extrabold tracking-[-0.035em]">{team.name}</h2><StatusBadge>{team.status === "CLOSED" ? "종료" : team.status === "CONFIRMED" ? "진행 중" : "구성 중"}</StatusBadge></div><p className="muted mt-2 text-sm">{team.topicTitle} · 팀원 {team.memberCount}명</p></div>
                    <ProgressBar value={progress} />
                    <Link href={`/teams/${team.id}`} className="button-secondary">워크스페이스</Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </AppShell>
  );
}
