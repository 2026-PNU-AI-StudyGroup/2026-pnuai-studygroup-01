import type { Metadata } from "next";

import { TeamPeoplePanel } from "@/app/projects/[projectId]/_components/team-people-panel";
import { WorkspacePageHeader } from "@/app/projects/[projectId]/_components/workspace-page-header";
import { loadActiveTeamWorkspace } from "@/app/projects/[projectId]/_lib/team-workspace-data";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { PrismaProjectTeamInvitationRepository } from "@/modules/project-team/infrastructure/prisma-project-team-invitation-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("팀 관리");
}

export default async function TeamManagementPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { actor, workspace } = await loadActiveTeamWorkspace(projectId);
  // 보낸 초대는 초대를 다룰 수 있는 사람에게만 보여 준다. 남의 주소가 팀원 전체에게
  // 보일 이유가 없다.
  const canManageMembers = workspace.access.canSupervise || workspace.access.isTeamLeader;
  const invitations = canManageMembers
    ? await new PrismaProjectTeamInvitationRepository(prisma, actor).listPending(workspace.id)
    : [];

  return (
    <section aria-labelledby="team-management-title" className="mx-auto max-w-6xl space-y-7">
      <WorkspacePageHeader title="팀 관리" titleId="team-management-title" bordered={false} />
      <div>
        <div className="max-w-2xl">
          <TeamPeoplePanel
            advisorEnabled={workspace.advisorEnabled}
            professor={workspace.professor}
            assistants={workspace.assistants}
            members={workspace.members}
            projectId={workspace.topicId}
            projectTeamId={workspace.id}
            actorId={actor.id}
            membershipChangesEnabled={workspace.status === "IN_PROGRESS"}
            canManageMembers={canManageMembers}
            invitations={invitations}
          />
        </div>
      </div>
    </section>
  );
}
