import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ApplyTopicForm } from "@/app/topics/_components/apply-topic-form";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListOwnTopicApplicationsService } from "@/modules/topic-application/application/list-own-topic-applications";
import { TeamApplicationInvitationService } from "@/modules/topic-application/application/manage-team-application-invitations";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { ListPublishedTopicsService } from "@/modules/topic/application/list-published-topics";
import { PrismaTopicRepository } from "@/modules/topic/infrastructure/prisma-topic-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { StatusBadge } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/shared/ui/translated-text";

export const metadata: Metadata = { title: "프로젝트 상세" };

const dateTime = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });
const applicationStatus = { PENDING: ["검토 중", "info"], ACCEPTED: ["선정", "success"], REJECTED: ["미선정", "neutral"] } as const;

function Period({ label, startsAt, endsAt }: { label: string; startsAt: Date; endsAt: Date }) {
  return <div><dt className="muted text-xs font-semibold">{label}</dt><dd className="mt-1 leading-6"><time dateTime={startsAt.toISOString()}>{dateTime.format(startsAt)}</time><span aria-hidden="true"> – </span><span className="sr-only">부터 </span><time dateTime={endsAt.toISOString()}>{dateTime.format(endsAt)}</time></dd></div>;
}

export default async function TopicDetailPage({ params }: { params: Promise<{ topicId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { topicId } = await params;
  const topic = await new ListPublishedTopicsService(new PrismaTopicRepository(prisma)).find(topicId);
  if (!topic) notFound();
  const applicationRepository = new PrismaTopicApplicationRepository(prisma);
  const applicationService = new ListOwnTopicApplicationsService(applicationRepository);
  const [application, teamApplicationState] = actor.role === "STUDENT" ? await Promise.all([applicationService.findForTopic(actor, topic.id), new TeamApplicationInvitationService(applicationRepository).list(actor)]) : [null, null];
  const awaitingTeam = teamApplicationState?.drafts.some((draft) => draft.topicId === topic.id) ?? false;
  const now = new Date();
  const recruiting = topic.recruitmentStartsAt <= now && topic.recruitmentEndsAt > now && topic.memberCount < topic.capacity;

  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={`/topics/${topic.id}`}><main className="content-shell space-y-10">
    <nav aria-label="이전 위치"><Link href="/topics" className="button-quiet px-0">← 프로젝트 탐색</Link></nav>
    <header className="grid gap-8 border-b border-[var(--line)] pb-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end"><div><div className="flex flex-wrap items-center gap-3"><p className="eyebrow text-[var(--accent-ink)]">{topic.programName}</p>{recruiting ? <StatusBadge tone="info">모집 중</StatusBadge> : <StatusBadge>모집 전·종료</StatusBadge>}</div><h1 className="mt-4 max-w-4xl text-[clamp(2.5rem,5vw,4rem)] font-black leading-[1.06] tracking-[-0.05em]">{topic.title}</h1><p className="muted mt-4">{topic.programCategory} · 지도교수 {topic.authorName}</p></div><div className="border-l border-[var(--line)] pl-6"><p className="muted text-xs">현재 팀 구성</p><p className="mt-1 text-2xl font-black">{topic.memberCount} / {topic.capacity}명</p>{application ? <div className="mt-5"><StatusBadge tone={applicationStatus[application.status][1]}>지원 상태 · {applicationStatus[application.status][0]}</StatusBadge></div> : awaitingTeam ? <Link href="/topics/applications" className="button-secondary mt-5">팀원 수락 대기</Link> : actor.role === "STUDENT" && recruiting ? <div className="mt-5"><ApplyTopicForm topicId={topic.id} topicTitle={topic.title} applicationMode={topic.applicationMode} applicationQuestions={topic.applicationQuestions} capacity={topic.capacity} /></div> : null}</div></header>
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]"><div className="space-y-10"><section aria-labelledby="topic-description"><h2 id="topic-description" className="text-xl font-extrabold">프로젝트 소개</h2><TranslatedText text={topic.description} className="muted mt-4 whitespace-pre-wrap leading-8" /></section><section aria-labelledby="topic-requirements"><h2 id="topic-requirements" className="text-xl font-extrabold">지원 조건</h2><dl className="mt-5 grid gap-6 border-y border-[var(--line)] py-6 sm:grid-cols-2"><div><dt className="muted text-xs">필수 기술</dt><dd className="mt-2 font-semibold leading-7">{topic.requiredSkills.join(", ")}</dd></div><div><dt className="muted text-xs">우대 기술</dt><dd className="mt-2 font-semibold leading-7">{topic.preferredSkills.join(", ") || "없음"}</dd></div><div><dt className="muted text-xs">기대 역할</dt><dd className="mt-2 leading-7">{topic.roleExpectations}</dd></div><div><dt className="muted text-xs">활동 조건</dt><dd className="mt-2 leading-7">{topic.availabilityRequirement}</dd></div></dl></section></div><aside aria-labelledby="topic-schedule" className="border-t border-[var(--line)] pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"><h2 id="topic-schedule" className="text-xl font-extrabold">프로젝트 일정</h2><dl className="mt-5 grid gap-6"><Period label="모집 기간" startsAt={topic.recruitmentStartsAt} endsAt={topic.recruitmentEndsAt} /><Period label="수행 기간" startsAt={topic.executionStartsAt} endsAt={topic.executionEndsAt} /><Period label="제출 기간" startsAt={topic.submissionStartsAt} endsAt={topic.submissionEndsAt} /></dl></aside></div>
  </main></AppShell>;
}
