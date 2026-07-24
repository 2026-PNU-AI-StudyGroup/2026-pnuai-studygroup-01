import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ReceivedApplicationList } from "@/app/professor/applications/_components/received-application-list";
import { ProfessorWorkspace } from "@/app/professor/_components/professor-workspace";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListReceivedTopicApplicationsService } from "@/modules/topic-application/application/list-received-topic-applications";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "지원 검토" };

export default async function ProfessorApplicationsPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "PROFESSOR" && actor.role !== "ADMIN") redirect("/topics");
  const applications = await new ListReceivedTopicApplicationsService(new PrismaTopicApplicationRepository(prisma)).execute(actor);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/professor/applications">
      <ProfessorWorkspace currentPath="/professor/applications" title="지원 검토" description="대기 중인 지원부터 확인하고, 지원서와 팀 구성을 근거로 프로젝트 참여 여부를 결정합니다." actions={<Link href="/professor/topics" className="button-secondary">주제 관리로</Link>}>
        {applications.length === 0 ? <EmptyState title="받은 지원서가 없습니다" description="학생이 공개 주제에 지원하면 이곳에 지원서가 표시됩니다." /> : <ReceivedApplicationList applications={applications} />}
      </ProfessorWorkspace>
    </AppShell>
  );
}
