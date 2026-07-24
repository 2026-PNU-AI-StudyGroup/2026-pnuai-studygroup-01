import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TopicStatusButton } from "@/app/professor/topics/_components/topic-status-button";
import { ProfessorWorkspace } from "@/app/professor/_components/professor-workspace";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { ListOwnTopicsService } from "@/modules/topic/application/list-own-topics";
import { PrismaTopicRepository } from "@/modules/topic/infrastructure/prisma-topic-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "주제 관리" };

const statusPresentation = { DRAFT: ["초안", "neutral"], PUBLISHED: ["공개", "info"], CLOSED: ["마감", "neutral"] } as const;
const koreanDateTime = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });

export default async function ProfessorTopicsPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "PROFESSOR" && actor.role !== "ADMIN") redirect("/topics");
  const programRepository = new PrismaProjectProgramRepository(prisma);
  const topicRepository = new PrismaTopicRepository(prisma);
  const [programs, topics] = await Promise.all([new ProjectProgramService(programRepository).listOpen(), new ListOwnTopicsService(topicRepository).execute(actor)]);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/professor/topics">
      <ProfessorWorkspace currentPath="/professor/topics" title="주제 설계" description="학생이 도전할 프로젝트의 목표와 지원 조건, 일정을 설계합니다." actions={<>{programs.length ? <Link href="/professor/topics/new" className="button-primary">새 주제 만들기</Link> : null}<Link href="/professor/applications" className="button-secondary">지원 검토</Link></>}>
        {programs.length === 0 ? <p role="status" className="border-l-2 border-[var(--warning)] bg-[var(--warning-subtle)] p-4 text-sm text-[var(--warning-ink)]">공개된 프로그램이 생기면 새 주제를 만들 수 있습니다.</p> : null}
        <section aria-labelledby="topic-list-title">
          <div className="flex items-end justify-between pb-4"><h2 id="topic-list-title" className="text-lg font-bold">{actor.role === "ADMIN" ? "전체 주제" : "내 주제"}</h2><span className="muted text-sm">{topics.length}개</span></div>
          {topics.length === 0 ? <div className="mt-6"><EmptyState title={actor.role === "ADMIN" ? "아직 만들어진 주제가 없습니다" : "아직 만든 주제가 없습니다"} description={programs.length ? "첫 프로젝트 주제를 설계해 학생에게 공개해 보세요." : "공개된 프로그램이 생기면 새 주제를 만들 수 있습니다."} action={programs.length ? <Link className="button-primary" href="/professor/topics/new">새 주제 만들기</Link> : undefined} /></div> : (
            <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white">
              {topics.map((topic) => <li key={topic.id} className="record-row grid gap-5 px-5 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"><div><div className="flex flex-wrap items-center gap-3"><h3 className="text-lg font-extrabold tracking-[-0.02em]">{topic.title}</h3><StatusBadge tone={statusPresentation[topic.status][1]}>{statusPresentation[topic.status][0]}</StatusBadge></div><p className="muted mt-1 text-sm">{topic.programName} · {topic.programCategory}{actor.role === "ADMIN" ? ` · ${topic.authorName} 교수` : ""}</p><p className="muted mt-3 text-sm">모집 정원 {topic.capacity}명 · {koreanDateTime.format(topic.recruitmentEndsAt)} 마감</p></div><div className="flex flex-wrap gap-2 sm:justify-end"><Link href={`/professor/topics/${topic.id}`} className="button-secondary">상세 관리</Link><TopicStatusButton topicId={topic.id} status={topic.status} programStatus={topic.programStatus} /></div></li>)}
            </ul>
          )}
        </section>
      </ProfessorWorkspace>
    </AppShell>
  );
}
