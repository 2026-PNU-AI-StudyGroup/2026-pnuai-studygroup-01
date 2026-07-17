import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TopicForm } from "@/app/professor/topics/topic-form";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "새 주제 등록" };

export default async function NewTopicPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "PROFESSOR" && actor.role !== "ADMIN") redirect("/topics");
  const programs = await new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).listOpen();

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/professor/topics/new">
      <main className="content-shell space-y-10">
        <PageHeader eyebrow="주제 작성" title="새 프로젝트 주제" description="주제 설명과 지원 조건, 모집·수행·제출 기간을 한 번에 검토한 뒤 초안으로 저장합니다." actions={<Link className="button-quiet" href="/professor/topics">주제 목록으로</Link>} />
        {programs.length ? <TopicForm programs={programs} successHref="/professor/topics" /> : <EmptyState title="공개된 프로그램이 없습니다" description="관리자가 프로젝트 프로그램을 공개한 뒤 주제를 등록할 수 있습니다." action={<Link className="button-secondary" href="/professor/topics">주제 목록으로</Link>} />}
      </main>
    </AppShell>
  );
}
