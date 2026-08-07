import Link from "next/link";
import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { TopicStatusButton } from "@/app/professor/topics/_components/topic-status-button";
import { TopicDeleteForm } from "@/app/professor/topics/_components/topic-delete-form";
import { ProfessorWorkspace } from "@/app/_components/professor-workspace";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { GetManagedTopicService, ManagedTopicNotFoundError } from "@/modules/topic/application/get-managed-topic";
import { PrismaTopicQueryRepository } from "@/modules/topic/infrastructure/prisma-topic-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { StatusBadge } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/app/_components/translated-text";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("주제 상세 관리");
}
const statusPresentation = { DRAFT: ["초안", "neutral"], PUBLISHED: ["공개", "info"], CLOSED: ["마감", "neutral"] } as const;
const applicationModeLabel = { TEAM_ONLY: "팀 지원만", INDIVIDUAL_ONLY: "개인 지원만", INDIVIDUAL_OR_TEAM: "개인·팀 지원" } as const;

export default async function ManagedTopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { topicId } = await params;
  let topic;
  try {
    topic = await new GetManagedTopicService(
      new PrismaTopicQueryRepository(prisma),
    ).execute(actor, topicId);
  } catch (error) { if (error instanceof ManagedTopicNotFoundError) notFound(); throw error; }
  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/professor/topics"><ProfessorWorkspace currentPath={`/professor/topics/${topic.id}`} role={actor.role} eyebrow={topic.programName} title={topic.title} actions={<><Link href={`/professor/topics/${topic.id}/assistants`} className="button-secondary"><UiText>{"조교 관리"}</UiText></Link>{topic.status !== "CLOSED" ? <Link href={`/professor/topics/${topic.id}/edit`} className="button-secondary"><UiText>{"내용 편집"}</UiText></Link> : null}{topic.status !== "CLOSED" ? <Link href={`/professor/topics/${topic.id}/schedule`} className="button-secondary"><UiText>{"일정 편집"}</UiText></Link> : null}{topic.status === "DRAFT" ? <TopicDeleteForm topicId={topic.id} topicTitle={topic.title} /> : null}<TopicStatusButton topicId={topic.id} status={topic.status} programStatus={topic.programStatus} pendingApplicationCount={topic.pendingApplicationCount} openRecruitmentPostCount={topic.openRecruitmentPostCount} recruitmentEnabled={topic.recruitmentEnabled} canCloseRecruitment={actor.role === "ADMIN" || topic.managerId === actor.id} /></>}>
    <div className="flex flex-wrap gap-3"><StatusBadge tone={statusPresentation[topic.status][1]}>{statusPresentation[topic.status][0]}</StatusBadge><span className="muted text-sm"><UiText>{"모집 정원"}</UiText>{" "}{topic.capacity}<UiText>{"명"}</UiText></span></div>
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]"><div className="space-y-10"><section aria-labelledby="managed-topic-description"><h2 id="managed-topic-description" className="text-xl font-semibold"><UiText>{"주제 설명"}</UiText></h2><TranslatedText text={topic.description} className="muted mt-4 whitespace-pre-wrap leading-8" /></section><section aria-labelledby="managed-topic-requirements"><h2 id="managed-topic-requirements" className="text-xl font-semibold"><UiText>{"지원 조건"}</UiText></h2><dl className="mt-5 grid gap-6 border-y border-[var(--line)] py-6 sm:grid-cols-2"><div><dt className="muted text-xs"><UiText>{"필수 기술"}</UiText></dt><dd className="mt-2 font-semibold">{topic.requiredSkills.join(", ")}</dd></div><div><dt className="muted text-xs"><UiText>{"우대 기술"}</UiText></dt><dd className="mt-2 font-semibold"><UiText>{topic.preferredSkills.join(", ") || "없음"}</UiText></dd></div><div><dt className="muted text-xs"><UiText>{"예상 역할"}</UiText></dt><dd className="mt-2 leading-7">{topic.roleExpectations}</dd></div><div><dt className="muted text-xs"><UiText>{"활동 조건"}</UiText></dt><dd className="mt-2 leading-7">{topic.availabilityRequirement}</dd></div></dl></section><section aria-labelledby="managed-application-form"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="managed-application-form" className="text-xl font-semibold"><UiText>{"지원서 구성"}</UiText></h2><StatusBadge tone="info">{applicationModeLabel[topic.applicationMode]}</StatusBadge></div><ol className="mt-5 divide-y divide-[var(--line)] border-y border-[var(--line)]">{topic.applicationQuestions.map((question, index) => <li key={question.id} className="grid gap-2 py-5 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center"><strong className="text-[var(--primary)]">{index + 1}</strong><span className="font-semibold"><UiText>{question.label}</UiText></span><span className="muted text-xs"><UiText>{question.required ? "필수" : "선택"}</UiText> {" "}<UiText>{"· 최대"}</UiText>{" "}{question.maxLength.toLocaleString("ko-KR")}<UiText>{"자"}</UiText></span></li>)}</ol></section></div><aside aria-labelledby="managed-topic-schedule" className="border-t border-[var(--line)] pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"><h2 id="managed-topic-schedule" className="text-xl font-semibold"><UiText>{"운영 일정"}</UiText></h2><dl className="mt-5 grid gap-6"><Period label="모집 기간" start={topic.recruitmentStartsAt} end={topic.programRecruitmentEndsAt} /><Period label="수행 기간" start={topic.executionStartsAt} end={topic.executionEndsAt} /><Period label="제출 기간" start={topic.submissionStartsAt} end={topic.submissionEndsAt} /></dl></aside></div>
  </ProfessorWorkspace></AppShell>;
}

function Period({ label, start, end }: { label: string; start: Date; end: Date }) { return <div><dt className="muted text-xs"><UiText>{label}</UiText></dt><dd className="mt-1 text-sm font-semibold"><time dateTime={start.toISOString()}><UiDate value={start} mode="dateTime" /></time><span className="muted mx-1">–</span><time dateTime={end.toISOString()}><UiDate value={end} mode="dateTime" /></time></dd></div>; }
