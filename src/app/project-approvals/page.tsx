import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { AdminSection, AdminSectionEmpty } from "@/app/_components/admin-section";
import { AppShell } from "@/app/_components/app-shell";
import { ProjectApprovalLedger } from "@/app/_components/project-approval-ledger";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { TopicApprovalService } from "@/modules/topic-approval/application/manage-topic-approvals";
import { PrismaTopicApprovalRepository } from "@/modules/topic-approval/infrastructure/prisma-topic-approval-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { EmptyState, PageHeader } from "@/shared/ui/page-primitives";
import { ProfessorWorkspace } from "@/app/_components/professor-workspace";
import { ProjectPagination } from "@/shared/ui/project-pagination";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 승인 요청");
}

export default async function ProjectApprovalsPage({ searchParams }: { searchParams: Promise<{ page?: SearchParamValue }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const requestedPage = Number(firstSearchParam((await searchParams).page) ?? "1");
  const programRepository = new PrismaProjectProgramRepository(prisma);
  const [requestPage, studentCreatablePrograms] = await Promise.all([
    new TopicApprovalService(new PrismaTopicApprovalRepository(prisma), programRepository).list(actor, requestedPage),
    actor.role === "STUDENT"
      ? new ProjectProgramService(programRepository).listStudentCreatableOpen()
      : Promise.resolve([]),
  ]);
  const requests = requestPage.items;
  const student = actor.role === "STUDENT";
  const canCreateStudentProject = student && studentCreatablePrograms.length > 0;
  const emptyTitle = student ? "보낸 승인 요청이 없습니다" : "검토할 승인 요청이 없습니다";
  const emptyDescription = student ? "프로젝트를 직접 제안하고 교수 또는 관리자에게 승인을 요청할 수 있습니다." : undefined;
  const content = requests.length === 0
    ? (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={canCreateStudentProject ? <Link className="button-primary" href="/projects/new"><UiText>{"프로젝트 제안"}</UiText></Link> : undefined}
      />
    )
    : <ProjectApprovalLedger requests={requests} student={student} />;
  const pagination = (
    <ProjectPagination
      page={requestPage.page}
      totalPages={requestPage.totalPages}
      ariaLabel="프로젝트 승인 요청 페이지"
      href={(page) => page > 1 ? `/project-approvals?page=${page}` : "/project-approvals"}
    />
  );

  if (actor.role === "ADMIN") {
    return (
      <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/project-approvals">
        <AdminWorkspace currentPath="/project-approvals" title="프로젝트 승인 요청" description="학생이 제안한 프로젝트를 검토하고 공개 여부를 결정합니다.">
          {requests.length === 0 ? (
            <AdminSection id="approval-ledger-title" title="승인 대기" meta={<><strong>{requestPage.total}</strong><UiText>{"건"}</UiText></>}>
              <AdminSectionEmpty>
                <EmptyState variant="embedded" title={emptyTitle} description={emptyDescription} />
              </AdminSectionEmpty>
            </AdminSection>
          ) : <ProjectApprovalLedger requests={requests} student={false} adminSurface />}
          {pagination}
        </AdminWorkspace>
      </AppShell>
    );
  }

  if (actor.role === "PROFESSOR") {
    return (
      <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/project-approvals">
        <ProfessorWorkspace currentPath="/project-approvals" role={actor.role} title="학생 제안 검토" description="학생이 제안한 프로젝트를 검토하고 공개 여부를 결정합니다.">
          {content}
          {pagination}
        </ProfessorWorkspace>
      </AppShell>
    );
  }

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/project-approvals">
      <main className="content-shell page-enter space-y-8">
        <PageHeader
          eyebrow={student ? "내 프로젝트 제안" : "프로젝트 검토"}
          title="프로젝트 승인 요청"
          description={student ? "교수 또는 관리자에게 보낸 요청과 처리 결과를 확인합니다." : "학생이 제안한 프로젝트를 검토하고 공개 여부를 결정합니다."}
          actions={requests.length > 0 && canCreateStudentProject ? <Link className="button-primary" href="/projects/new"><UiText>{"새 프로젝트 제안"}</UiText></Link> : undefined}
        />
        {content}
        {pagination}
      </main>
    </AppShell>
  );
}
