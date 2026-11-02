import type { Metadata } from "next";

import { TeamPeoplePanel } from "@/app/projects/[projectId]/_components/team-people-panel";
import { WorkspacePageHeader } from "@/app/projects/[projectId]/_components/workspace-page-header";
import { loadActiveTeamWorkspace } from "@/app/projects/[projectId]/_lib/team-workspace-data";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { PrismaProjectTeamInvitationRepository } from "@/modules/project-team/infrastructure/prisma-project-team-invitation-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { UiText } from "@/modules/translation/ui/i18n-provider";

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

  const leader = workspace.members.find((member) => member.role === "LEADER");

  return (
    <section aria-labelledby="team-management-title" className="mx-auto grid max-w-6xl gap-5">
      <WorkspacePageHeader
        title="팀 관리"
        titleId="team-management-title"
        finding={(
          <p>
            <UiText>{leader ? `팀원 ${workspace.members.length}명, 팀장은 ${leader.name}입니다.` : `팀원은 ${workspace.members.length}명입니다.`}</UiText>
            {invitations.length ? <>{" "}<UiText>{`응답을 기다리는 초대가 ${invitations.length}건입니다.`}</UiText></> : null}
            {workspace.status !== "IN_PROGRESS" ? <span className="text-[var(--muted)]">{" "}<UiText>{"진행 중인 프로젝트에서만 팀원을 바꿀 수 있습니다."}</UiText></span> : null}
          </p>
        )}
      />
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
    </section>
  );
}
