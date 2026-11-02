import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createTopicAction } from "@/app/_actions/create-topic-action";
import { RegistrablePrograms } from "@/app/professor/topics/_components/topic-blocks";
import { ProfessorSidebar } from "@/app/_components/professor-sidebar";
import { ProfessorWorkspace } from "@/app/_components/professor-workspace";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { cardClass } from "@/modules/project-program/ui/work-screen";
import { TopicForm } from "@/modules/topic/ui/topic-form";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("새 프로젝트 등록");
}

export default async function NewTopicPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "PROFESSOR" && actor.role !== "ADMIN") redirect("/topics");
  const now = new Date();
  const programs = await new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).listRegistrableOpen(now);
  const backLink = <Link className="button-secondary button-compact" href="/professor/topics"><UiText>{"프로젝트 목록"}</UiText></Link>;

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/professor/topics/new" crumbs={[{ label: "새 프로젝트 등록" }]} panel={<ProfessorSidebar currentPath="/professor/topics/new" role={actor.role} />}>
      <ProfessorWorkspace title="새 프로젝트 등록" actions={programs.length ? backLink : undefined}>
        {programs.length ? (
          // 양식은 왼쪽 칸 폭을 다 쓴다. 가운데 정렬(mx-auto)을 풀어 제목과 같은 왼쪽 선에 앉힌다.
          <div className="grid items-start gap-3.5 @min-[64rem]:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0 [&>form]:mx-0 [&>form]:max-w-none">
              <TopicForm action={createTopicAction} programs={programs} successHref="/professor/topics" />
            </div>
            {/* 휴대폰에서는 첫 칸(프로그램 선택) 앞에 등록 마감을 먼저 보인다. */}
            <div className="min-w-0 @max-[64rem]:order-first"><RegistrablePrograms programs={programs} now={now} /></div>
          </div>
        ) : (
          <section role="status" aria-labelledby="no-registrable-program" className={`${cardClass} flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-4 text-[0.8125rem]`}>
            <div className="min-w-0 flex-1">
              <h2 id="no-registrable-program" className="font-medium text-[var(--ink)]"><UiText>{"지금 프로젝트를 등록할 수 있는 프로그램이 없습니다"}</UiText></h2>
              <p className="mt-0.5 text-[var(--muted)]"><UiText>{"공개 프로그램의 프로젝트 등록 기간이 시작되면 새 프로젝트를 만들 수 있습니다."}</UiText></p>
            </div>
            {backLink}
          </section>
        )}
      </ProfessorWorkspace>
    </AppShell>
  );
}
