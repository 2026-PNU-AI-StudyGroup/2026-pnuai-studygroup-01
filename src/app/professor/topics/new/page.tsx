import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createTopicAction } from "@/app/_actions/create-topic-action";
import { ProfessorWorkspace } from "@/app/_components/professor-workspace";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { TopicForm } from "@/modules/topic/ui/topic-form";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("새 프로젝트 등록");
}

export default async function NewTopicPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "PROFESSOR" && actor.role !== "ADMIN") redirect("/topics");
  const programs = await new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).listRegistrableOpen();

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/professor/topics/new">
      <ProfessorWorkspace currentPath="/professor/topics/new" role={actor.role} title="새 프로젝트 등록" actions={programs.length ? <Link className="button-secondary" href="/professor/topics"><UiText>{"프로젝트 목록"}</UiText></Link> : undefined}>
        {programs.length ? <TopicForm action={createTopicAction} programs={programs} successHref="/professor/topics" /> : <EmptyState title="지금 프로젝트를 등록할 수 있는 프로그램이 없습니다" description="공개 프로그램의 프로젝트 등록 기간이 시작되면 새 프로젝트를 만들 수 있습니다." action={<Link className="button-secondary" href="/professor/topics"><UiText>{"프로젝트 목록"}</UiText></Link>} />}
      </ProfessorWorkspace>
    </AppShell>
  );
}
