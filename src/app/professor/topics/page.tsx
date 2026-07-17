import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TopicScheduleForm } from "@/app/professor/topics/topic-schedule-form";
import { TopicStatusButton } from "@/app/professor/topics/topic-status-button";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { ListOwnTopicsService } from "@/modules/topic/application/list-own-topics";
import { PrismaTopicRepository } from "@/modules/topic/infrastructure/prisma-topic-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, StatusBadge } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "주제 관리" };

const statusPresentation = { DRAFT: ["초안", "neutral"], PUBLISHED: ["공개", "info"], CLOSED: ["마감", "neutral"] } as const;
const koreanDateTime = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });
const localInputDateTime = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
const inputDateTime = (date: Date) => localInputDateTime.format(date).replace(" ", "T");

export default async function ProfessorTopicsPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "PROFESSOR" && actor.role !== "ADMIN") redirect("/topics");
  const programRepository = new PrismaProjectProgramRepository(prisma);
  const topicRepository = new PrismaTopicRepository(prisma);
  const [programs, topics] = await Promise.all([new ProjectProgramService(programRepository).listOpen(), new ListOwnTopicsService(topicRepository).execute(actor)]);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/professor/topics">
      <main className="content-shell space-y-12">
        <PageHeader eyebrow="교수 작업" title="주제 관리" description="공개된 학과 프로젝트 프로그램에 주제를 등록하고 모집 상태를 관리하세요." actions={<div className="flex flex-wrap gap-3">{programs.length ? <Link href="/professor/topics/new" className="button-primary">새 주제 등록</Link> : null}<Link href="/professor/applications" className="button-secondary">받은 지원서 보기</Link></div>} />
        {programs.length === 0 ? <p role="status" className="border-l-2 border-[var(--warning)] bg-[var(--warning-subtle)] p-4 text-sm text-[var(--warning-ink)]">관리자가 프로젝트 프로그램을 먼저 공개해야 주제를 만들 수 있습니다.</p> : null}
        <section aria-labelledby="topic-list-title">
          <div className="flex items-end justify-between border-b border-[var(--line)] pb-4"><h2 id="topic-list-title" className="text-lg font-bold">{actor.role === "ADMIN" ? "전체 주제" : "내 주제"}</h2><span className="muted text-sm">{topics.length}개</span></div>
          {topics.length === 0 ? <div className="mt-6"><EmptyState title={actor.role === "ADMIN" ? "등록된 주제가 없습니다" : "등록한 주제가 없습니다"} description={programs.length ? "새 주제 등록에서 첫 번째 프로젝트 주제를 작성하세요." : "공개된 프로그램이 생기면 프로젝트 주제를 등록할 수 있습니다."} action={programs.length ? <Link className="button-primary" href="/professor/topics/new">새 주제 등록</Link> : undefined} /></div> : (
            <ul className="divide-y divide-[var(--line)]">
              {topics.map((topic) => <li key={topic.id} className="py-7"><div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"><div><div className="flex flex-wrap items-center gap-3"><h3 className="font-bold">{topic.title}</h3><StatusBadge tone={statusPresentation[topic.status][1]}>{statusPresentation[topic.status][0]}</StatusBadge></div><p className="muted mt-1 text-xs">{topic.programName} · {topic.programCategory}{actor.role === "ADMIN" ? ` · ${topic.authorName} 교수` : ""}</p><p className="muted mt-2 text-sm leading-6">{topic.description}</p><p className="muted mt-2 text-xs">모집 정원 {topic.capacity}명</p></div><div className="flex flex-wrap justify-end gap-2"><TopicStatusButton topicId={topic.id} status={topic.status} programStatus={topic.programStatus} />{topic.status !== "CLOSED" ? <TopicScheduleForm topicId={topic.id} topicTitle={topic.title} values={{ recruitmentStartsAt: inputDateTime(topic.recruitmentStartsAt), recruitmentEndsAt: inputDateTime(topic.recruitmentEndsAt), executionStartsAt: inputDateTime(topic.executionStartsAt), executionEndsAt: inputDateTime(topic.executionEndsAt), submissionStartsAt: inputDateTime(topic.submissionStartsAt), submissionEndsAt: inputDateTime(topic.submissionEndsAt) }} /> : null}</div></div><dl className="mt-5 grid gap-3 border-t border-[var(--line)] pt-4 text-sm md:grid-cols-3"><div><dt className="muted text-xs">모집 기간</dt><dd className="mt-1">{koreanDateTime.format(topic.recruitmentStartsAt)} – {koreanDateTime.format(topic.recruitmentEndsAt)}</dd></div><div><dt className="muted text-xs">수행 기간</dt><dd className="mt-1">{koreanDateTime.format(topic.executionStartsAt)} – {koreanDateTime.format(topic.executionEndsAt)}</dd></div><div><dt className="muted text-xs">제출 기간</dt><dd className="mt-1">{koreanDateTime.format(topic.submissionStartsAt)} – {koreanDateTime.format(topic.submissionEndsAt)}</dd></div></dl></li>)}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}
