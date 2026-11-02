import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";

import { requireProfessorWorkspaceActor } from "@/app/professor/_lib/professor-workspace-access";
import { ReceivedApplicationList } from "@/app/professor/applications/_components/received-application-list";
import { ProfessorSidebar } from "@/app/_components/professor-sidebar";
import { ProfessorWorkspace } from "@/app/_components/professor-workspace";
import { ListReceivedTopicApplicationsService } from "@/modules/topic-application/application/list-received-topic-applications";
import { PrismaTopicApplicationQueryRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
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
  const pending = applications.counts.PENDING;

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/professor/applications" crumbs={[{ label: "지원 검토" }]} panel={<ProfessorSidebar currentPath="/professor/applications" role={actor.role} />}>
      <ProfessorWorkspace
        title="지원 검토"
        description={pending
          ? <b className="font-semibold"><UiText>{`검토를 기다리는 지원이 ${pending}건 있습니다.`}</UiText></b>
          : <UiText>{"검토할 지원이 없습니다."}</UiText>}
      >
        <ReceivedApplicationList page={applications} status={status} query={query.trim().slice(0, 100)} />
      </ProfessorWorkspace>
    </AppShell>
  );
}
