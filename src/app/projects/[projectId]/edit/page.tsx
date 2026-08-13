import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { TeamProjectInfoForm } from "@/app/projects/[projectId]/_components/team-project-info-form";
import { WorkspacePageHeader } from "@/app/projects/[projectId]/_components/workspace-page-header";
import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";
import {
  TeamProjectInfoForbiddenError,
  TeamProjectInfoNotFoundError,
  TeamProjectInfoNotInProgressError,
  TeamProjectInfoService,
} from "@/modules/team/application/manage-team-project-info";
import { PrismaTeamProjectInfoRepository } from "@/modules/team/infrastructure/prisma-team-project-info-repository";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 정보 수정");
}

export default async function EditTeamProjectInfoPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const { projectId } = await params;
  let project;
  try {
    project = await new TeamProjectInfoService(
      new PrismaTeamProjectInfoRepository(prisma),
    ).getForEdit(actor, projectId);
  } catch (error) {
    if (error instanceof TeamProjectInfoNotFoundError) notFound();
    if (
      error instanceof TeamProjectInfoForbiddenError ||
      error instanceof TeamProjectInfoNotInProgressError
    ) {
      redirect(`/projects/${projectId}`);
    }
    throw error;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <WorkspacePageHeader
        eyebrow={project.programName}
        title="프로젝트 정보 수정"
        description="프로젝트명과 설명은 저장 즉시 프로젝트 화면에 반영됩니다."
        actions={<Link href={`/projects/${projectId}`} className="button-secondary"><UiText>{"취소"}</UiText></Link>}
      />
      <TeamProjectInfoForm
        teamId={project.teamId}
        projectId={projectId}
        title={project.title}
        description={project.description}
      />
    </div>
  );
}
