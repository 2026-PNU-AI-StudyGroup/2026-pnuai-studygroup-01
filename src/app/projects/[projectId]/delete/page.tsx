import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProjectDeleteForm } from "@/app/projects/[projectId]/_components/project-delete-form";
import { WorkspacePageHeader } from "@/app/projects/[projectId]/_components/workspace-page-header";
import { loadTeamWorkspace } from "@/app/projects/[projectId]/_lib/team-workspace-data";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 삭제");
}

// 관리자가 결과물을 확인한 자리에서 바로 프로젝트를 지울 수 있게 진행 현황 안에 둔다.
export default async function ProjectDeletePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { actor, workspace } = await loadTeamWorkspace(projectId);
  if (actor.role !== "ADMIN") redirect(`/projects/${projectId}`);

  return (
    <section aria-labelledby="project-delete-title" className="mx-auto max-w-3xl space-y-7">
      <WorkspacePageHeader title="프로젝트 삭제" titleId="project-delete-title" bordered={false} />
      <ProjectDeleteForm topicId={workspace.topicId} title={workspace.topicTitle} />
    </section>
  );
}
