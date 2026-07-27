import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ReceivedApplicationList } from "@/app/professor/applications/_components/received-application-list";
import { ProfessorWorkspace } from "@/app/professor/_components/professor-workspace";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListReceivedTopicApplicationsService } from "@/modules/topic-application/application/list-received-topic-applications";
import { PrismaTopicApplicationQueryRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("지원 검토");
}

export default async function ProfessorApplicationsPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const applications = await new ListReceivedTopicApplicationsService(new PrismaTopicApplicationQueryRepository(prisma)).execute(actor);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/professor/applications">
      <ProfessorWorkspace currentPath="/professor/applications" title="지원 검토" description="대기 중인 지원부터 확인하고, 지원서와 팀 구성을 근거로 프로젝트 참여 여부를 결정합니다." actions={<Link href="/professor/topics" className="button-secondary"><UiText>{"주제 관리로"}</UiText></Link>}>
        {applications.length === 0 ? <EmptyState title="아직 받은 지원서가 없습니다" description="학생의 첫 지원을 기다리고 있습니다." /> : <ReceivedApplicationList applications={applications} />}
      </ProfessorWorkspace>
    </AppShell>
  );
}
