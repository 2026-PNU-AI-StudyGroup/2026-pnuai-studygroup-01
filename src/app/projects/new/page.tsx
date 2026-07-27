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
  return getLocalizedMetadata("학생 프로젝트 만들기");
}

export default async function NewStudentProjectPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/professor/topics/new");
  const programRepository = new PrismaProjectProgramRepository(prisma);
  const approvalService = new TopicApprovalService(new PrismaTopicApprovalRepository(prisma), programRepository);
  const [programs, professors, studentTeams] = await Promise.all([
    new ProjectProgramService(programRepository).listOpen(),
    approvalService.listProfessors(),
    new PrismaStudentTeamRecruitmentQueryRepository(prisma).listLeaderTeams(actor.id),
  ]);
  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/projects/new"><main className="content-shell page-enter space-y-8">
    <PageHeader eyebrow="학생 제안" title="새 프로젝트 만들기" description="학생이 제안한 프로젝트는 지정 교수 또는 관리자 승인을 받은 뒤 공개됩니다." actions={<Link href="/project-approvals" className="button-secondary"><UiText>{"내 승인 요청"}</UiText></Link>} />
    {programs.length ? <TopicForm action={createTopicAction} programs={programs} successHref="/project-approvals" studentApproval={{ professors, studentTeams }} /> : <EmptyState title="지금 제안할 수 있는 프로그램이 없습니다" description="공개 프로그램이 시작되면 프로젝트를 제안할 수 있습니다." />}
  </main></AppShell>;
}
