import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ProjectAssistantManagementPanel } from "@/app/_components/project-assistant-management";
import { AppShell } from "@/app/_components/app-shell";
import { ProfessorWorkspace } from "@/app/professor/_components/professor-workspace";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectAssistantOperationError, ProjectAssistantQueryService } from "@/modules/project-assistant/application/manage-project-assistants";
import { PrismaProjectAssistantRepository } from "@/modules/project-assistant/infrastructure/prisma-project-assistant-repository";
import {
  GetManagedTopicService,
  ManagedTopicNotFoundError,
} from "@/modules/topic/application/get-managed-topic";
import { PrismaTopicQueryRepository } from "@/modules/topic/infrastructure/prisma-topic-query-repository";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("조교 관리");
}

export default async function ProjectAssistantManagementPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");

  const { topicId } = await params;
  let topic;
  let management;
  try {
    [topic, management] = await Promise.all([
      new GetManagedTopicService(
        new PrismaTopicQueryRepository(prisma),
      ).execute(actor, topicId),
      new ProjectAssistantQueryService(
        new PrismaProjectAssistantRepository(prisma),
      ).getManagement(actor, topicId),
    ]);
  } catch (error) {
    if (error instanceof ManagedTopicNotFoundError || error instanceof ProjectAssistantOperationError) notFound();
    throw error;
  }

  return (
    <AppShell
      role={actor.role}
      userId={actor.id}
      userName={actor.name}
      currentPath="/professor/topics"
    >
      <ProfessorWorkspace
        currentPath={`/professor/topics/${topic.id}/assistants`}
        title={topic.title}
        description="조교 초대와 프로젝트 운영 권한을 한곳에서 관리합니다."
        actions={(
          <>
            <Link
              href={`/professor/topics/${topic.id}`}
              className="button-secondary"
            >
              <UiText>{"주제 상세"}</UiText>
            </Link>
            {topic.status !== "CLOSED" ? (
              <Link
                href={`/professor/topics/${topic.id}/schedule`}
                className="button-secondary"
              >
                <UiText>{"일정 편집"}</UiText>
              </Link>
            ) : null}
          </>
        )}
      >
        <ProjectAssistantManagementPanel management={management} />
      </ProfessorWorkspace>
    </AppShell>
  );
}
