import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createTopicAction } from "@/app/_actions/create-topic-action";
import { AppShell } from "@/app/_components/app-shell";
import { ProgramSidebar } from "@/modules/project-program/ui/program-sidebar";
import { buildProgramSidebarItems } from "@/modules/project-program/ui/program-sidebar-items";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { ListArchivedProjectsService } from "@/modules/team/application/archive-projects";
import { PrismaTeamArchiveQueryRepository } from "@/modules/team/infrastructure/prisma-team-archive-query-repository";
import { TopicForm } from "@/modules/topic/ui/topic-form";
import { TopicApprovalService } from "@/modules/topic-approval/application/manage-topic-approvals";
import { PrismaTopicApprovalRepository } from "@/modules/topic-approval/infrastructure/prisma-topic-approval-repository";
import { PrismaStudentTeamRecruitmentQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { EmptyState } from "@/shared/ui/page-primitives";
import { ExplorerLayout } from "@/shared/ui/explorer-layout";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 제안");
}

export default async function NewStudentProjectPage({ searchParams }: {
  searchParams: Promise<{ programId?: string }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/professor/topics/new");
  const programRepository = new PrismaProjectProgramRepository(prisma);
  const programService = new ProjectProgramService(programRepository);
  const approvalService = new TopicApprovalService(new PrismaTopicApprovalRepository(prisma), programRepository);
  const now = new Date();
  const [programs, sidebarPrograms, archivedPrograms, professors, studentTeams, params] = await Promise.all([
    programService.listStudentCreatableOpen(),
    programService.listSidebarVisible(now),
    new ListArchivedProjectsService(new PrismaTeamArchiveQueryRepository(prisma)).listPrograms(),
    approvalService.listProfessors(),
    new PrismaStudentTeamRecruitmentQueryRepository(prisma).listLeaderTeams(actor.id),
    searchParams,
  ]);
  const defaultProgramId = programs.some(({ id }) => id === params.programId) ? params.programId : undefined;
  const sidebarItems = buildProgramSidebarItems(sidebarPrograms, archivedPrograms, "active", {}, now);
  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/projects/new">
    <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={defaultProgramId} />}>
      <div className="page-enter space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-[-0.03em]"><UiText>{"프로젝트 제안"}</UiText></h1>
          <Link href="/project-approvals" className="button-secondary"><UiText>{"내 승인 요청"}</UiText></Link>
        </div>
        {programs.length ? <TopicForm action={createTopicAction} programs={programs} defaultProgramId={defaultProgramId} successHref="/project-approvals" studentApproval={{ professors, studentTeams }} /> : <EmptyState title="지금 제안할 수 있는 프로그램이 없습니다" description="관리자가 학생 프로젝트 제안을 허용한 공개 프로그램이 있으면 제안할 수 있습니다." />}
      </div>
    </ExplorerLayout>
  </AppShell>;
}
