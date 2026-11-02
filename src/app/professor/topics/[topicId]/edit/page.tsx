import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import { ProfessorSidebar } from "@/app/_components/professor-sidebar";
import { ProfessorWorkspace } from "@/app/_components/professor-workspace";
import { updateTopicAction } from "@/app/professor/topics/_actions/topic-management-actions";
import { TopicSchedule } from "@/app/professor/topics/_components/topic-blocks";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { GetManagedTopicService, ManagedTopicNotFoundError } from "@/modules/topic/application/get-managed-topic";
import { PrismaTopicQueryRepository } from "@/modules/topic/infrastructure/prisma-topic-query-repository";
import { TopicForm } from "@/modules/topic/ui/topic-form";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 내용 편집");
}

export default async function EditManagedTopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { topicId } = await params;
  let topic;
  try {
    topic = await new GetManagedTopicService(new PrismaTopicQueryRepository(prisma)).execute(actor, topicId);
  } catch (error) {
    if (error instanceof ManagedTopicNotFoundError) notFound();
    throw error;
  }
  if ((topic.effectiveStatus === "COMPLETED" || topic.effectiveStatus === "CANCELED") && actor.role !== "ADMIN") redirect(`/professor/topics/${topic.id}`);
  const programs = actor.role === "ADMIN"
    ? await new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).listAll(actor)
    : await new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).listPublic();
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/professor/topics" crumbs={[{ label: topic.title, href: `/professor/topics/${topic.id}` }, { label: "내용 편집" }]} panel={<ProfessorSidebar currentPath="/professor/topics" role={actor.role} />}>
      <ProfessorWorkspace
        eyebrow={topic.title}
        title="프로젝트 내용 편집"
        description="제출된 지원서가 있으면 지원 방식과 문항은 변경할 수 없습니다."
        actions={<Link href={`/professor/topics/${topic.id}`} className="button-secondary button-compact"><UiText>{"상세로"}</UiText></Link>}
      >
        {/* 양식은 왼쪽 칸 폭을 다 쓴다. 오른쪽에는 고칠 때 맞춰 볼 프로그램 일정을 둔다. */}
        <div className="grid items-start gap-3.5 @min-[64rem]:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 [&>form]:mx-0 [&>form]:max-w-none">
            <TopicForm action={updateTopicAction} programs={programs} initialTopic={topic} successHref={`/professor/topics/${topic.id}`} />
          </div>
          <TopicSchedule topic={topic} now={new Date()} />
        </div>
      </ProfessorWorkspace>
    </AppShell>
  );
}
