import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { TeamWorkspaceService } from "@/modules/team/application/manage-team-workspace";
import { PrismaTeamWorkspaceRepository } from "@/modules/team/infrastructure/prisma-team-workspace-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, StatusBadge } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "프로젝트" };

export default async function DashboardPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const repository = new PrismaTeamWorkspaceRepository(prisma);
  const teams = await new TeamWorkspaceService(repository, repository, repository, repository).list(actor);
  const title = actor.role === "PROFESSOR" ? "지도 프로젝트" : actor.role === "ADMIN" ? "전체 프로젝트" : "내 프로젝트";

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/dashboard">
      <main className="content-shell page-enter space-y-10">
        <PageHeader eyebrow="프로젝트 운영" title={title} description="프로젝트별 현재 단계와 바로 이어서 처리할 작업을 확인하세요." actions={<Link href={actor.role === "STUDENT" ? "/topics" : "/professor/topics"} className="button-primary">{actor.role === "STUDENT" ? "새 프로젝트 찾기" : "주제 관리"}</Link>} />
        {teams.length === 0 ? (
          <EmptyState title="아직 연결된 프로젝트가 없습니다" description={actor.role === "STUDENT" ? "공개 주제를 탐색하고 관심 있는 프로젝트에 지원해 보세요." : "주제를 등록하거나 학생 지원을 승인하면 이곳에 팀이 표시됩니다."} action={<Link href={actor.role === "STUDENT" ? "/topics" : "/professor/topics"} className="button-secondary">{actor.role === "STUDENT" ? "주제 탐색하기" : "주제 등록하기"}</Link>} />
        ) : (
          <section aria-labelledby="project-list-heading">
            <div className="mb-3 flex items-end justify-between gap-4"><div><p className="eyebrow">계속할 작업</p><h2 id="project-list-heading" className="mt-1 text-xl font-extrabold">참여 프로젝트</h2></div><span className="muted text-sm">{teams.length}개</span></div>
            <ul className="divide-y divide-[var(--line)]">
              {teams.map((team) => {
                const progress = team.milestoneCount === 0 ? 0 : Math.round((team.completedMilestoneCount / team.milestoneCount) * 100);
                return (
                  <li key={team.id} className="record-row grid gap-5 border-t border-[var(--line)] py-7 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,.55fr)_auto] lg:items-center">
                    <div><div className="flex flex-wrap items-center gap-3"><h3 className="text-xl font-extrabold tracking-[-0.025em]">{team.name}</h3><StatusBadge tone={team.status === "CONFIRMED" ? "info" : "neutral"}>{team.status === "CLOSED" ? "종료" : team.status === "CONFIRMED" ? "진행 중" : "구성 중"}</StatusBadge></div><p className="muted mt-2 text-sm">{team.topicTitle} · 팀원 {team.memberCount}명</p></div>
                    <div><div className="mb-2 flex items-center justify-between text-xs"><span className="muted">마일스톤 {team.completedMilestoneCount}/{team.milestoneCount}</span><strong>{progress}%</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300" style={{ width: `${progress}%` }} /></div><p className="muted mt-2 text-xs">{team.status === "FORMING" ? "팀 확정을 기다리고 있습니다." : team.status === "CLOSED" ? "지난 활동과 결과물을 확인할 수 있습니다." : progress === 100 ? "최종 제출과 결과물을 확인하세요." : "다음 마일스톤을 이어서 진행하세요."}</p></div>
                    <Link href={`/teams/${team.id}`} className="button-secondary">작업 이어가기 <span aria-hidden="true" className="ml-2">→</span></Link>
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
