import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { TopicStatusButton } from "@/app/professor/topics/_components/topic-status-button";
import { ProfessorWorkspace } from "@/app/_components/professor-workspace";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { GetManagedTopicService, ManagedTopicNotFoundError } from "@/modules/topic/application/get-managed-topic";
import { PrismaTopicQueryRepository } from "@/modules/topic/infrastructure/prisma-topic-query-repository";
import { ManagedProjectSummary } from "@/modules/topic/ui/managed-project-summary";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { TranslatedText } from "@/app/_components/translated-text";
import { EditIcon, ProfileIcon } from "@/shared/ui/workspace-icons";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 상세 관리");
}

export default async function ManagedTopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { topicId } = await params;
  let topic;
  try {
    topic = await new GetManagedTopicService(
      new PrismaTopicQueryRepository(prisma),
    ).execute(actor, topicId);
  } catch (error) { if (error instanceof ManagedTopicNotFoundError) notFound(); throw error; }
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/professor/topics">
      <ProfessorWorkspace currentPath={`/professor/topics/${topic.id}`} role={actor.role} eyebrow={topic.programName} title={topic.title} actions={<><Link href={`/professor/topics/${topic.id}/assistants`} className="button-secondary gap-2"><ProfileIcon className="size-4 shrink-0" /><UiText>{"조교 관리"}</UiText></Link>{(topic.effectiveStatus !== "COMPLETED" && topic.effectiveStatus !== "CANCELED") || actor.role === "ADMIN" ? <Link href={`/professor/topics/${topic.id}/edit`} className="button-secondary gap-2"><EditIcon className="size-4 shrink-0" /><UiText>{"내용 편집"}</UiText></Link> : null}<TopicStatusButton topicId={topic.id} status={topic.status} pendingApplicationCount={topic.pendingApplicationCount} openRecruitmentPostCount={topic.openRecruitmentPostCount} recruitmentEnabled={topic.recruitmentEnabled} canCloseRecruitment={actor.role === "ADMIN" || topic.managerId === actor.id} isAdmin={actor.role === "ADMIN"} /></>}>
    <ManagedProjectSummary
      topic={topic}
      description={<TranslatedText text={topic.description} className="muted mt-3 whitespace-pre-wrap leading-8" />}
    />
      </ProfessorWorkspace>
    </AppShell>
  );
}
