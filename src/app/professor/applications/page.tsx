import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ReceivedApplicationList } from "@/app/professor/applications/received-application-list";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListReceivedTopicApplicationsService } from "@/modules/topic-application/application/list-received-topic-applications";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "지원 검토" };

export default async function ProfessorApplicationsPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "PROFESSOR" && actor.role !== "ADMIN") redirect("/topics");
  const applications = await new ListReceivedTopicApplicationsService(new PrismaTopicApplicationRepository(prisma)).execute(actor);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/professor/applications">
      <main className="content-shell space-y-10">
        <PageHeader eyebrow="교수 작업" title="지원 검토" description="학생의 지원 동기, 보유 기술, 희망 역할과 활동 가능 시간을 확인하고 팀 참여 여부를 결정하세요." actions={<Link href="/professor/topics" className="button-secondary">주제 관리</Link>} />
        {applications.length === 0 ? <EmptyState title="받은 지원서가 없습니다" description="학생이 공개 주제에 지원하면 이곳에 지원서가 표시됩니다." /> : <ReceivedApplicationList applications={applications} />}
      </main>
    </AppShell>
  );
}
