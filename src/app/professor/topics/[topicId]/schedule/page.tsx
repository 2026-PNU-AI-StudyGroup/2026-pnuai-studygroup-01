import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { TopicScheduleForm } from "@/app/professor/topics/_components/topic-schedule-form";
import { ProfessorWorkspace } from "@/app/professor/_components/professor-workspace";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { GetManagedTopicService, ManagedTopicNotFoundError } from "@/modules/topic/application/get-managed-topic";
import { PrismaTopicRepository } from "@/modules/topic/infrastructure/prisma-topic-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";

export const metadata: Metadata = { title: "주제 일정 편집" };
const localInputDateTime = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
const inputDateTime = (date: Date) => localInputDateTime.format(date).replace(" ", "T");

export default async function TopicSchedulePage({ params }: { params: Promise<{ topicId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { topicId } = await params;
  let topic;
  try { topic = await new GetManagedTopicService(new PrismaTopicRepository(prisma)).execute(actor, topicId); } catch (error) { if (error instanceof ManagedTopicNotFoundError) notFound(); throw error; }
  if (topic.status === "CLOSED") redirect(`/professor/topics/${topic.id}`);
  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/professor/topics"><ProfessorWorkspace currentPath={`/professor/topics/${topic.id}/schedule`} eyebrow="주제 설계 · 일정" title={topic.title} description="모집과 수행, 제출의 시작과 마감 시각을 정합니다." actions={<Link href={`/professor/topics/${topic.id}`} className="button-secondary">주제 상세</Link>}><TopicScheduleForm topicId={topic.id} values={{ recruitmentStartsAt: inputDateTime(topic.recruitmentStartsAt), recruitmentEndsAt: inputDateTime(topic.recruitmentEndsAt), executionStartsAt: inputDateTime(topic.executionStartsAt), executionEndsAt: inputDateTime(topic.executionEndsAt), submissionStartsAt: inputDateTime(topic.submissionStartsAt), submissionEndsAt: inputDateTime(topic.submissionEndsAt) }} /></ProfessorWorkspace></AppShell>;
}
