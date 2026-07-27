import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ReceivedApplicationDetail } from "@/app/professor/applications/_components/received-application-detail";
import { ProfessorWorkspace } from "@/app/professor/_components/professor-workspace";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import {
  GetReceivedTopicApplicationService,
  ReceivedTopicApplicationNotFoundError,
} from "@/modules/topic-application/application/get-received-topic-application";
import { PrismaTopicApplicationQueryRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("지원서 상세");
}

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
      new PrismaTopicApplicationQueryRepository(prisma),
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
      <ProfessorWorkspace currentPath="/professor/applications" eyebrow="지원 검토 · 지원서" title="지원서 상세" description="지원자와 팀 구성, 문항별 답변을 차례로 확인한 뒤 참여 여부를 결정합니다." actions={
            <Link href="/professor/applications" className="button-secondary">
              <UiText>{"목록으로"}</UiText></Link>
          }>
        <ReceivedApplicationDetail application={application} />
      </ProfessorWorkspace>
    </AppShell>
  );
}
