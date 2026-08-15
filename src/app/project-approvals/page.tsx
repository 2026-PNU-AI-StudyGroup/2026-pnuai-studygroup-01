import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
import { AddIcon } from "@/shared/ui/workspace-icons";
import { ProjectApprovalFilters } from "@/app/project-approvals/_components/project-approval-filters";
import { parseTopicApprovalStatus, projectApprovalsHref } from "@/modules/topic-approval/ui/project-approval-query";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 승인 요청");
}

type ProjectApprovalsSearchParams = {
  page?: SearchParamValue;
  programId?: SearchParamValue;
  status?: SearchParamValue;
};

export default async function ProjectApprovalsPage({ searchParams }: { searchParams: Promise<ProjectApprovalsSearchParams> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const params = await searchParams;
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const requestedProgramId = firstSearchParam(params.programId)?.trim().slice(0, 200) || undefined;
  const requestedStatus = firstSearchParam(params.status)?.trim();
  const selectedStatus = parseTopicApprovalStatus(requestedStatus);
  const programRepository = new PrismaProjectProgramRepository(prisma);
  const programService = new ProjectProgramService(programRepository);
  const approvalService = new TopicApprovalService(new PrismaTopicApprovalRepository(prisma), programRepository);
  const [adminPrograms, studentCreatablePrograms] = await Promise.all([
    actor.role === "ADMIN" ? programService.listAll(actor) : Promise.resolve([]),
    actor.role === "STUDENT"
      ? programService.listStudentCreatableOpen()
      : Promise.resolve([]),
  ]);
  const selectedProgramId = actor.role === "ADMIN"
    ? adminPrograms.find(({ id }) => id === requestedProgramId)?.id
    : requestedProgramId;
  if ((requestedStatus && !selectedStatus) || (actor.role === "ADMIN" && requestedProgramId && !selectedProgramId)) {
    redirect(projectApprovalsHref({ programId: selectedProgramId, status: selectedStatus }));
  }
  const requestPage = await approvalService.list(actor, requestedPage, 20, {
    programId: selectedProgramId,
    status: selectedStatus,
  });
  const requests = requestPage.items;
  const currentQuery = { programId: selectedProgramId, status: selectedStatus, page: requestPage.page };
  const student = actor.role === "STUDENT";
  const canCreateStudentProject = student && studentCreatablePrograms.length > 0;
  let emptyTitle = "승인 요청이 없습니다";
  if (student) emptyTitle = "보낸 승인 요청이 없습니다";
  else if (selectedProgramId || selectedStatus) emptyTitle = "조건에 맞는 승인 요청이 없습니다";
  const emptyDescription = student
    ? "프로젝트를 직접 제안하고 교수 또는 관리자에게 승인을 요청할 수 있습니다."
    : "새 승인 요청이 도착하면 이 목록에 표시됩니다.";
  const content = requests.length === 0
    ? (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={canCreateStudentProject ? <Link className="button-primary gap-2" href="/topics?modal=project-proposal"><AddIcon className="size-4 shrink-0" /><UiText>{"프로젝트 제안"}</UiText></Link> : undefined}
      />
    )
    : <ProjectApprovalLedger requests={requests} student={student} query={currentQuery} total={requestPage.total} title={student ? undefined : "승인 요청"} />;
  const pagination = (
    <ProjectPagination
      page={requestPage.page}
      totalPages={requestPage.totalPages}
      ariaLabel="프로젝트 승인 요청 페이지"
      href={(page) => projectApprovalsHref({ programId: selectedProgramId, status: selectedStatus, page })}
    />
  );

  if (actor.role === "ADMIN") {
    return (
      <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/project-approvals">
        <main className="content-shell page-enter space-y-8">
          <PageHeader title="프로젝트 승인 요청" description="학생이 제안한 프로젝트를 검토하고 공개 여부를 결정합니다." />
          <ProjectApprovalFilters key={`${selectedProgramId ?? "all"}:${selectedStatus ?? "all"}`} programs={adminPrograms.map(({ id, name, category }) => ({ id, name, category }))} programId={selectedProgramId} status={selectedStatus} />
          {requests.length === 0 ? (
            <EmptyState title={emptyTitle} description={emptyDescription} />
          ) : <ProjectApprovalLedger requests={requests} student={false} adminSurface query={currentQuery} total={requestPage.total} title="승인 요청" />}
          {pagination}
        </main>
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
          actions={requests.length > 0 && canCreateStudentProject ? <Link className="button-primary gap-2" href="/topics?modal=project-proposal"><AddIcon className="size-4 shrink-0" /><UiText>{"새 프로젝트 제안"}</UiText></Link> : undefined}
        />
        {content}
        {pagination}
      </main>
    </AppShell>
  );
}
