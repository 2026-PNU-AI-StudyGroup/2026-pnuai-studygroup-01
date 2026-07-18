import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TopicForm } from "@/app/professor/topics/topic-form";
import { ProfessorWorkspace } from "@/app/professor/professor-workspace";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "새 주제 등록" };

export default async function NewTopicPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "PROFESSOR" && actor.role !== "ADMIN") redirect("/topics");
  const programs = await new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).listOpen();

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/professor/topics/new">
      <ProfessorWorkspace currentPath="/professor/topics/new" eyebrow="주제 준비 · 새 주제" title="새 프로젝트 주제" description="학생이 지원을 결정하는 데 필요한 내용과 교수님의 검토 기준을 순서대로 작성합니다." actions={<Link className="button-secondary" href="/professor/topics">작성 취소</Link>}>
        {programs.length ? <TopicForm programs={programs} successHref="/professor/topics" /> : <EmptyState title="공개된 프로그램이 없습니다" description="관리자가 프로젝트 프로그램을 공개한 뒤 주제를 등록할 수 있습니다." action={<Link className="button-secondary" href="/professor/topics">주제 목록으로</Link>} />}
      </ProfessorWorkspace>
    </AppShell>
  );
}
