import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { TeamProjectInfoForm } from "@/app/projects/[projectId]/_components/team-project-info-form";
import { rowActionClass, WorkspacePageHeader } from "@/app/projects/[projectId]/_components/workspace-page-header";
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
    <section aria-labelledby="project-edit-title" className="mx-auto grid max-w-6xl gap-5">
      <WorkspacePageHeader
        meta={<UiText>{project.programName}</UiText>}
        title="프로젝트 정보 수정"
        titleId="project-edit-title"
        actions={<Link href={`/projects/${projectId}`} className={rowActionClass}><UiText>{"취소"}</UiText></Link>}
      />
      {/* 설정 화면 꼴: 왼쪽에 이 묶음이 무엇이고 어디에 실리는지, 오른쪽에 입력 칸과 저장 하나. */}
      <div className="grid items-start gap-x-8 gap-y-3 md:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="md:pt-4">
          <h2 className="text-base font-semibold text-[var(--ink)]"><UiText>{"기본 정보"}</UiText></h2>
          <p className="mt-1 text-[0.8125rem] leading-5 text-[var(--muted)]"><UiText>{"프로젝트명과 설명은 저장 즉시 프로젝트 화면에 반영됩니다."}</UiText></p>
        </div>
        <TeamProjectInfoForm
          teamId={project.teamId}
          projectId={projectId}
          title={project.title}
          description={project.description}
        />
      </div>
    </section>
  );
}
