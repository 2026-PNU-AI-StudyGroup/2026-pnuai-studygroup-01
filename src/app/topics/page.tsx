import { redirect } from "next/navigation";

import { ApplyTopicForm } from "@/app/topics/apply-topic-form";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListOwnTopicApplicationsService } from "@/modules/topic-application/application/list-own-topic-applications";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { ListPublishedTopicsService } from "@/modules/topic/application/list-published-topics";
import { PrismaTopicRepository } from "@/modules/topic/infrastructure/prisma-topic-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

const koreanDateTime = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "medium",
  timeStyle: "short",
});

const applicationStatusLabel = {
  PENDING: "검토 중",
  ACCEPTED: "수락",
  REJECTED: "거절",
} as const;

export default async function TopicsPage() {
  const actor = await getCurrentActor();
  if (!actor) {
    redirect("/sign-in");
  }

  const topicRepository = new PrismaTopicRepository(prisma);
  const topics = await new ListPublishedTopicsService(topicRepository).execute();
  const applications =
    actor.role === "STUDENT"
      ? await new ListOwnTopicApplicationsService(
          new PrismaTopicApplicationRepository(prisma),
        ).execute(actor)
      : [];
  const applicationsByTopic = new Map(
    applications.map((application) => [application.topicId, application]),
  );
  const now = new Date();

  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-8 px-6 py-12">
      <header>
        <p className="text-sm font-semibold text-blue-700">졸업과제</p>
        <h1 className="mt-2 text-3xl font-bold">공개 주제</h1>
      </header>
      {topics.length === 0 ? (
        <p className="text-zinc-600">공개된 주제가 없습니다.</p>
      ) : (
        <ul className="grid gap-5">
          {topics.map((topic) => {
            const application = applicationsByTopic.get(topic.id);
            const isRecruiting =
              topic.recruitmentStartsAt <= now && topic.recruitmentEndsAt > now;

            return (
              <li key={topic.id} className="rounded-xl border p-6">
                <p className="text-sm text-zinc-600">
                  {topic.academicYear}학년도 {topic.term === "FIRST" ? "1" : "2"}학기 · {topic.authorName}
                </p>
                <h2 className="mt-2 text-xl font-semibold">{topic.title}</h2>
                <p className="mt-3 whitespace-pre-wrap text-zinc-700">{topic.description}</p>
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <div><dt className="font-semibold">모집 인원</dt><dd>{topic.capacity}명</dd></div>
                  <div><dt className="font-semibold">모집 기간</dt><dd>{koreanDateTime.format(topic.recruitmentStartsAt)} – {koreanDateTime.format(topic.recruitmentEndsAt)}</dd></div>
                </dl>
                {application ? (
                  <p className="mt-5 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                    지원 상태: {applicationStatusLabel[application.status]}
                  </p>
                ) : actor.role === "STUDENT" && isRecruiting ? (
                  <ApplyTopicForm topicId={topic.id} />
                ) : (
                  <p className="mt-5 text-sm text-zinc-600">
                    {actor.role === "STUDENT" ? "현재 모집 기간이 아닙니다." : "학생 계정으로 지원할 수 있습니다."}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
