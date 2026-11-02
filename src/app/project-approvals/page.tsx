import type { Metadata } from "next";
import { redirect } from "next/navigation";

import Link from "next/link";

import { AppShell } from "@/app/_components/app-shell";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { ApprovalRequestList } from "@/app/project-approvals/_components/approval-request-list";
import { ProjectApprovalFilters } from "@/app/project-approvals/_components/project-approval-filters";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { TopicApprovalService, topicApprovalStatuses, type TopicApprovalStatus } from "@/modules/topic-approval/application/manage-topic-approvals";
import { PrismaTopicApprovalRepository } from "@/modules/topic-approval/infrastructure/prisma-topic-approval-repository";
import { projectApprovalsHref } from "@/modules/topic-approval/ui/project-approval-route";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";
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
  // 목록은 끝나지 않은 프로그램의 요청만 보인다. 대기 수도 같은 범위에서 센다.
  const activePending = pendingApprovalCounts.filter(({ programId }) => activePrograms.some(({ id }) => id === programId));
  const pendingCountByProgram = Object.fromEntries(
    activePending.map(({ programId, count }) => [programId, count]),
  );

  if ((requestedProgramId && !selectedProgramId) || (requestedStatus && !selectedStatus)) {
    redirect(projectApprovalsHref({ programId: selectedProgramId, status: selectedStatus }));
  }

  const requests = await approvalService.list(actor, requestedPage, 20, {
    programId: selectedProgramId,
    status: selectedStatus,
    programEndsAfter: now,
  });
  const totalPending = activePending.reduce((sum, { count }) => sum + count, 0);
  const busiest = activePending.reduce<{ programId: string; count: number } | undefined>((top, entry) => (!top || entry.count > top.count ? entry : top), undefined);
  const busiestName = busiest ? activePrograms.find(({ id }) => id === busiest.programId)?.name : undefined;

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/project-approvals">
      <AdminWorkspace
        title="프로젝트 승인"
        description={totalPending
          ? <><b className="font-semibold"><UiText>{`검토 대기 ${totalPending}건`}</UiText></b>{busiestName && busiest ? <UiText>{`, 가장 많은 곳은 ${busiestName} ${busiest.count}건입니다.`}</UiText> : null}</>
          : <UiText>{"검토를 기다리는 승인 요청이 없습니다."}</UiText>}
        actions={totalPending && selectedStatus !== "PENDING"
          ? <Link href={projectApprovalsHref({ programId: selectedProgramId, status: "PENDING" })} className="button-primary button-compact"><UiText>{"검토 대기만 보기"}</UiText></Link>
          : undefined}
      >
        <ApprovalRequestList
          requests={requests.items}
          total={requests.total}
          toolbar={<ProjectApprovalFilters programs={activePrograms.map(({ id, name, category }) => ({ id, name, category }))} programId={selectedProgramId} status={selectedStatus} pendingCountByProgram={pendingCountByProgram} />}
          empty={selectedProgramId || selectedStatus
            ? { title: "조건에 맞는 승인 요청이 없습니다", description: "프로그램이나 상태를 바꿔 다시 확인해 주세요." }
            : { title: "승인 요청이 없습니다", description: "학생이 프로젝트를 등록하면 이 목록에 표시됩니다." }}
        />
        <ProjectPagination page={requests.page} totalPages={requests.totalPages} ariaLabel="프로젝트 승인 요청 페이지" href={(page) => projectApprovalsHref({ page, programId: selectedProgramId, status: selectedStatus })} />
      </AdminWorkspace>
    </AppShell>
  );
}
