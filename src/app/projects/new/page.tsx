import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createTopicAction } from "@/app/_actions/create-topic-action";
import { AppShell } from "@/app/_components/app-shell";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { TopicForm } from "@/modules/topic/ui/topic-form";
import { TopicApprovalService } from "@/modules/topic-approval/application/manage-topic-approvals";
import { PrismaTopicApprovalRepository } from "@/modules/topic-approval/infrastructure/prisma-topic-approval-repository";
import { PrismaStudentTeamRecruitmentQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { EmptyState, PageHeader } from "@/shared/ui/page-primitives";

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
  const [programs, professors, studentTeams, params] = await Promise.all([
    programService.listStudentCreatableOpen(),
    approvalService.listProfessors(),
    new PrismaStudentTeamRecruitmentQueryRepository(prisma).listLeaderTeams(actor.id),
    searchParams,
  ]);
  const defaultProgramId = programs.some(({ id }) => id === params.programId) ? params.programId : undefined;
  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/projects/new"><main className="content-shell page-enter space-y-8">
    <PageHeader title="프로젝트 제안" description="학생이 제안한 프로젝트는 프로그램의 지도교수 배정 설정에 따라 검토를 받은 뒤 공개됩니다." actions={<Link href="/project-approvals" className="button-secondary"><UiText>{"내 승인 요청"}</UiText></Link>} />
    {programs.length ? <TopicForm action={createTopicAction} programs={programs} defaultProgramId={defaultProgramId} successHref="/project-approvals" studentApproval={{ professors, studentTeams }} /> : <EmptyState title="지금 제안할 수 있는 프로그램이 없습니다" description="관리자가 학생 프로젝트 제안을 허용한 공개 프로그램이 있으면 제안할 수 있습니다." />}
  </main></AppShell>;
}
