import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ReceivedApplicationDetail } from "@/app/professor/applications/received-application-detail";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import {
  GetReceivedTopicApplicationService,
  ReceivedTopicApplicationNotFoundError,
} from "@/modules/topic-application/application/get-received-topic-application";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { PageHeader } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "지원서 상세" };

export default async function ProfessorApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "PROFESSOR" && actor.role !== "ADMIN") redirect("/topics");

  const { applicationId } = await params;
  let application;
  try {
    application = await new GetReceivedTopicApplicationService(
      new PrismaTopicApplicationRepository(prisma),
    ).execute(actor, applicationId);
  } catch (error) {
    if (error instanceof ReceivedTopicApplicationNotFoundError) notFound();
    throw error;
  }

  return (
    <AppShell
      role={actor.role}
      userId={actor.id}
      userName={actor.name}
      currentPath="/professor/applications"
    >
      <main className="content-shell space-y-10">
        <PageHeader
          eyebrow="지원 검토"
          title="지원서 상세"
          description="지원자 정보와 지원 동기를 충분히 확인한 뒤 팀 참여 여부를 결정하세요."
          actions={
            <Link href="/professor/applications" className="button-secondary">
              목록으로
            </Link>
          }
        />
        <ReceivedApplicationDetail application={application} />
      </main>
    </AppShell>
  );
}
