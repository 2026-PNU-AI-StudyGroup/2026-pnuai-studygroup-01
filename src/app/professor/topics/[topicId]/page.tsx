import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { TopicStatusButton } from "@/app/professor/topics/topic-status-button";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { GetManagedTopicService, ManagedTopicNotFoundError } from "@/modules/topic/application/get-managed-topic";
import { PrismaTopicRepository } from "@/modules/topic/infrastructure/prisma-topic-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { PageHeader, StatusBadge } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/shared/ui/translated-text";

export const metadata: Metadata = { title: "주제 상세 관리" };
const statusPresentation = { DRAFT: ["초안", "neutral"], PUBLISHED: ["공개", "info"], CLOSED: ["마감", "neutral"] } as const;
const koreanDateTime = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });

export default async function ManagedTopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { topicId } = await params;
  let topic;
  try { topic = await new GetManagedTopicService(new PrismaTopicRepository(prisma)).execute(actor, topicId); } catch (error) { if (error instanceof ManagedTopicNotFoundError) notFound(); throw error; }
  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/professor/topics"><main className="content-shell space-y-10">
    <PageHeader eyebrow={`${topic.programName} · ${topic.authorName} 교수`} title={topic.title} description="주제 내용과 지원 조건, 운영 일정을 확인하고 공개 상태를 관리합니다." actions={<div className="flex flex-wrap gap-2"><Link href="/professor/topics" className="button-secondary">주제 목록</Link>{topic.status !== "CLOSED" ? <Link href={`/professor/topics/${topic.id}/schedule`} className="button-secondary">일정 편집</Link> : null}<TopicStatusButton topicId={topic.id} status={topic.status} programStatus={topic.programStatus} /></div>} />
    <div className="flex flex-wrap gap-3"><StatusBadge tone={statusPresentation[topic.status][1]}>{statusPresentation[topic.status][0]}</StatusBadge><span className="muted text-sm">모집 정원 {topic.capacity}명</span></div>
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]"><div className="space-y-10"><section aria-labelledby="managed-topic-description"><h2 id="managed-topic-description" className="text-xl font-extrabold">주제 설명</h2><TranslatedText text={topic.description} className="muted mt-4 whitespace-pre-wrap leading-8" /></section><section aria-labelledby="managed-topic-requirements"><h2 id="managed-topic-requirements" className="text-xl font-extrabold">지원 조건</h2><dl className="mt-5 grid gap-6 border-y border-[var(--line)] py-6 sm:grid-cols-2"><div><dt className="muted text-xs">필수 기술</dt><dd className="mt-2 font-semibold">{topic.requiredSkills.join(", ")}</dd></div><div><dt className="muted text-xs">우대 기술</dt><dd className="mt-2 font-semibold">{topic.preferredSkills.join(", ") || "없음"}</dd></div><div><dt className="muted text-xs">기대 역할</dt><dd className="mt-2 leading-7">{topic.roleExpectations}</dd></div><div><dt className="muted text-xs">활동 조건</dt><dd className="mt-2 leading-7">{topic.availabilityRequirement}</dd></div></dl></section></div><aside aria-labelledby="managed-topic-schedule" className="border-t border-[var(--line)] pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"><h2 id="managed-topic-schedule" className="text-xl font-extrabold">운영 일정</h2><dl className="mt-5 grid gap-6"><Period label="모집 기간" start={topic.recruitmentStartsAt} end={topic.recruitmentEndsAt} /><Period label="수행 기간" start={topic.executionStartsAt} end={topic.executionEndsAt} /><Period label="제출 기간" start={topic.submissionStartsAt} end={topic.submissionEndsAt} /></dl></aside></div>
  </main></AppShell>;
}

function Period({ label, start, end }: { label: string; start: Date; end: Date }) { return <div><dt className="muted text-xs">{label}</dt><dd className="mt-1 text-sm font-semibold"><time dateTime={start.toISOString()}>{koreanDateTime.format(start)}</time><span className="muted mx-1">–</span><time dateTime={end.toISOString()}>{koreanDateTime.format(end)}</time></dd></div>; }
