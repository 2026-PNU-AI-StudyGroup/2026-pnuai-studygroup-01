import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { AppShell } from "@/app/_components/app-shell";
import { TranslatedText } from "@/app/_components/translated-text";
import { ProjectDeleteForm } from "@/app/admin/projects/[topicId]/_components/project-delete-form";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { GetManagedTopicService, ManagedTopicNotFoundError } from "@/modules/topic/application/get-managed-topic";
import { PrismaTopicQueryRepository } from "@/modules/topic/infrastructure/prisma-topic-query-repository";
import { ManagedProjectSummary } from "@/modules/topic/ui/managed-project-summary";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { ChevronIcon } from "@/shared/ui/workspace-icons";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 관리");
}

// 관리자 전용 프로젝트 관리 화면. 교수 업무 화면과 같은 정보를 보여주지만
// 운영 관리 안에 있어 관리자가 교수 화면으로 넘어가지 않는다.
export default async function AdminProjectPage({ params }: { params: Promise<{ topicId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const { topicId } = await params;
  let topic;
  try {
    topic = await new GetManagedTopicService(new PrismaTopicQueryRepository(prisma)).execute(actor, topicId);
  } catch (error) {
    if (error instanceof ManagedTopicNotFoundError) notFound();
    throw error;
  }

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/projects">
      <AdminWorkspace
        currentPath="/admin/projects"
        eyebrow={topic.programName}
        title={topic.title}
        actions={(
          <Link className="button-secondary gap-2" href={`/topics/${topic.id}`}>
            <ChevronIcon className="size-4 shrink-0 rotate-180" /><UiText>{"프로젝트 화면"}</UiText>
          </Link>
        )}
      >
        <ManagedProjectSummary
          topic={topic}
          description={<TranslatedText text={topic.description} className="muted mt-3 whitespace-pre-wrap leading-8" />}
          footer={<ProjectDeleteForm topicId={topic.id} title={topic.title} />}
        />
      </AdminWorkspace>
    </AppShell>
  );
}
