import Link from "next/link";
import { redirect } from "next/navigation";

import { TopicForm } from "@/app/professor/topics/topic-form";
import { TopicStatusButton } from "@/app/professor/topics/topic-status-button";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { ListOwnTopicsService } from "@/modules/topic/application/list-own-topics";
import { PrismaTopicRepository } from "@/modules/topic/infrastructure/prisma-topic-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, StatusBadge } from "@/shared/ui/page-primitives";

const statusPresentation = { DRAFT: ["초안", "neutral"], PUBLISHED: ["공개", "success"], CLOSED: ["마감", "warning"] } as const;

export default async function ProfessorTopicsPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "PROFESSOR" && actor.role !== "ADMIN") redirect("/");
  const programRepository = new PrismaProjectProgramRepository(prisma);
  const topicRepository = new PrismaTopicRepository(prisma);
  const [programs, topics] = await Promise.all([new ProjectProgramService(programRepository).listOpen(), new ListOwnTopicsService(topicRepository).execute(actor)]);

  return (
    <AppShell role={actor.role} userName="부산대학교" currentPath="/professor/topics">
      <main className="content-shell space-y-12">
        <PageHeader eyebrow="Professor" title="주제 관리" description="공개된 학과 프로젝트 프로그램 안에 주제를 등록하고 모집 상태를 관리하세요." actions={<Link href="/professor/applications" className="button-secondary">받은 지원서 보기</Link>} />
        {programs.length === 0 ? <p role="status" className="border-l-2 border-[var(--warning)] bg-[#f6eee9] p-4 text-sm text-[#794636]">관리자가 프로젝트 프로그램을 먼저 공개해야 주제를 만들 수 있습니다.</p> : null}
        <section aria-labelledby="new-topic-title">
          <h2 id="new-topic-title" className="mb-5 text-lg font-bold">새 주제 등록</h2><TopicForm programs={programs} />
        </section>
        <section aria-labelledby="topic-list-title">
          <div className="flex items-end justify-between border-b border-[var(--line)] pb-4"><h2 id="topic-list-title" className="text-lg font-bold">내 주제</h2><span className="muted text-sm">{topics.length}개</span></div>
          {topics.length === 0 ? <div className="mt-6"><EmptyState title="등록한 주제가 없습니다" description="위 양식을 작성해 첫 번째 프로젝트 주제를 등록하세요." /></div> : (
            <ul className="divide-y divide-[var(--line)]">
              {topics.map((topic) => <li key={topic.id} className="grid gap-4 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-3"><h3 className="font-bold">{topic.title}</h3><StatusBadge tone={statusPresentation[topic.status][1]}>{statusPresentation[topic.status][0]}</StatusBadge></div><p className="muted mt-1 text-xs">{topic.programName} · {topic.programCategory}</p><p className="muted mt-2 line-clamp-2 text-sm leading-6">{topic.description}</p><p className="muted mt-2 text-xs">모집 정원 {topic.capacity}명</p></div><TopicStatusButton topicId={topic.id} status={topic.status} programStatus={topic.programStatus} /></li>)}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}
