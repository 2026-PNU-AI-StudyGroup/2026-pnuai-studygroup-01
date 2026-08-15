import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import { ProjectApprovalLedger } from "@/app/_components/project-approval-ledger";
import { ProjectApprovalFilters } from "@/app/project-approvals/_components/project-approval-filters";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { TopicApprovalService, topicApprovalStatuses, type TopicApprovalStatus } from "@/modules/topic-approval/application/manage-topic-approvals";
import { PrismaTopicApprovalRepository } from "@/modules/topic-approval/infrastructure/prisma-topic-approval-repository";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { EmptyState, PageHeader } from "@/shared/ui/page-primitives";
import { ProjectPagination } from "@/shared/ui/project-pagination";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 승인 요청");
}

type SearchParams = {
  page?: SearchParamValue;
  programId?: SearchParamValue;
  status?: SearchParamValue;
};

function approvalsHref({ page, programId, status }: { page?: number; programId?: string; status?: TopicApprovalStatus }) {
  const params = new URLSearchParams();
  if (programId) params.set("programId", programId);
  if (status) params.set("status", status);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/project-approvals?${query}` : "/project-approvals";
}

export default async function ProjectApprovalsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const requestedProgramId = firstSearchParam(params.programId)?.trim().slice(0, 200) || undefined;
  const requestedStatus = firstSearchParam(params.status)?.trim();
  const selectedStatus = topicApprovalStatuses.includes(requestedStatus as TopicApprovalStatus)
    ? requestedStatus as TopicApprovalStatus
    : undefined;
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const now = new Date();
  const programRepository = new PrismaProjectProgramRepository(prisma);
  const programService = new ProjectProgramService(programRepository);
  const approvalService = new TopicApprovalService(
    new PrismaTopicApprovalRepository(prisma),
    programRepository,
  );
  const [programs, pendingApprovalCounts] = await Promise.all([
    programService.listAll(actor),
    approvalService.listAdminPendingCountsByProgram(actor),
  ]);
  const activePrograms = programs.filter(({ endsAt }) => endsAt > now);
  const selectedProgramId = activePrograms.some(({ id }) => id === requestedProgramId) ? requestedProgramId : undefined;
  const pendingCountByProgram = Object.fromEntries(
    pendingApprovalCounts.map(({ programId, count }) => [programId, count]),
  );

  if ((requestedProgramId && !selectedProgramId) || (requestedStatus && !selectedStatus)) {
    redirect(approvalsHref({ programId: selectedProgramId, status: selectedStatus }));
  }

  const requests = await approvalService.list(actor, requestedPage, 20, {
    programId: selectedProgramId,
    status: selectedStatus,
    programEndsAfter: now,
  });

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/project-approvals">
      <main className="content-shell page-enter space-y-6">
        <PageHeader eyebrow="관리자 작업함" title="프로젝트 승인" description="학생이 등록한 프로젝트를 검토하고 공개 여부를 결정합니다." />
        <ProjectApprovalLedger
          adminSurface
          wideLayout
          requests={requests.items}
          total={requests.total}
          student={false}
          title="승인 요청"
          toolbar={<ProjectApprovalFilters programs={activePrograms.map(({ id, name, category }) => ({ id, name, category }))} programId={selectedProgramId} status={selectedStatus} pendingCountByProgram={pendingCountByProgram} />}
          emptyState={<EmptyState variant="section" title="승인 요청이 없습니다" description={selectedProgramId || selectedStatus ? "조건에 맞는 승인 요청이 없습니다." : "새 승인 요청이 도착하면 이 목록에 표시됩니다."} />}
        />
        <ProjectPagination page={requests.page} totalPages={requests.totalPages} ariaLabel="프로젝트 승인 요청 페이지" href={(page) => approvalsHref({ page, programId: selectedProgramId, status: selectedStatus })} />
      </main>
    </AppShell>
  );
}
