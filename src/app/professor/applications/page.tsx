import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import type { Metadata } from "next";

import { requireProfessorWorkspaceActor } from "@/app/professor/_lib/professor-workspace-access";
import { ReceivedApplicationList } from "@/app/professor/applications/_components/received-application-list";
import { ProfessorWorkspace } from "@/app/_components/professor-workspace";
import { ListReceivedTopicApplicationsService } from "@/modules/topic-application/application/list-received-topic-applications";
import { PrismaTopicApplicationQueryRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import type { ProfessorTopicApplicationStatus } from "@/modules/topic-application/application/topic-application-ports";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("지원 검토");
}

const applicationStatuses = new Set<ProfessorTopicApplicationStatus>(["PENDING", "ACCEPTED", "REJECTED"]);

export default async function ProfessorApplicationsPage({ searchParams }: {
  searchParams: Promise<{
    page?: SearchParamValue;
    status?: SearchParamValue;
    q?: SearchParamValue;
  }>;
}) {
  const actor = await requireProfessorWorkspaceActor();
  const params = await searchParams;
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const requestedStatus = firstSearchParam(params.status);
  const status = applicationStatuses.has(requestedStatus as ProfessorTopicApplicationStatus)
    ? requestedStatus as ProfessorTopicApplicationStatus
    : undefined;
  const query = firstSearchParam(params.q) ?? "";
  const applications = await new ListReceivedTopicApplicationsService(
    new PrismaTopicApplicationQueryRepository(prisma),
  ).execute(actor, requestedPage, 20, status, query);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/professor/applications">
      <ProfessorWorkspace currentPath="/professor/applications" role={actor.role} title="지원 검토" description="대기 중인 지원부터 확인하고, 지원서와 팀 구성을 근거로 프로젝트 참여 여부를 결정합니다.">
        {applications.total === 0 && !status && !query.trim()
          ? <EmptyState title="아직 받은 지원서가 없습니다" description="학생이 프로젝트에 지원하면 이 목록에 표시됩니다." />
          : <ReceivedApplicationList page={applications} status={status} query={query.trim().slice(0, 100)} />}
      </ProfessorWorkspace>
    </AppShell>
  );
}
