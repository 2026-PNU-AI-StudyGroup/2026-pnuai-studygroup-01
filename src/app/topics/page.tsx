import { redirect } from "next/navigation";

import { ApplyTopicForm } from "@/app/topics/apply-topic-form";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListOwnTopicApplicationsService } from "@/modules/topic-application/application/list-own-topic-applications";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { ListPublishedTopicsService } from "@/modules/topic/application/list-published-topics";
import { PrismaTopicRepository } from "@/modules/topic/infrastructure/prisma-topic-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, StatusBadge } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/shared/ui/translated-text";

const koreanDateTime = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });
const applicationStatus = {
  PENDING: { label: "검토 중", tone: "warning" },
  ACCEPTED: { label: "수락", tone: "success" },
  REJECTED: { label: "거절", tone: "danger" },
} as const;

export default async function TopicsPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const topicRepository = new PrismaTopicRepository(prisma);
  const topics = await new ListPublishedTopicsService(topicRepository).execute();
  const applications = actor.role === "STUDENT" ? await new ListOwnTopicApplicationsService(new PrismaTopicApplicationRepository(prisma)).execute(actor) : [];
  const applicationsByTopic = new Map(applications.map((application) => [application.topicId, application]));
  const now = new Date();

  return (
    <AppShell role={actor.role} userName="부산대학교" currentPath="/topics">
      <main className="content-shell space-y-10">
        <PageHeader eyebrow="Discover" title="주제 탐색" description="관심 분야의 졸업과제를 살펴보고, 함께하고 싶은 팀에 지원하세요." />
        <div className="flex flex-wrap gap-2 border-y border-[var(--line)] py-4" aria-label="주제 안내">
          <StatusBadge tone="success">현재 모집 중 우선</StatusBadge><span className="muted self-center text-sm">총 {topics.length}개의 공개 주제</span>
        </div>
        {topics.length === 0 ? (
          <EmptyState title="공개된 주제가 없습니다" description="교수가 주제를 공개하면 이곳에 표시됩니다. 잠시 후 다시 확인해 주세요." />
        ) : (
          <ul className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
            {topics.map((topic) => {
              const application = applicationsByTopic.get(topic.id);
              const isRecruiting = topic.recruitmentStartsAt <= now && topic.recruitmentEndsAt > now && topic.memberCount < topic.capacity;
              return (
                <li key={topic.id} className="py-8">
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold tracking-tight">{topic.title}</h2>{isRecruiting ? <StatusBadge tone="success">모집 중</StatusBadge> : <StatusBadge>모집 종료</StatusBadge>}</div>
                      <TranslatedText text={topic.description} className="muted mt-3 line-clamp-3 leading-7" />
                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><p className="muted text-xs">필수 기술</p><p className="mt-1 font-semibold">{topic.requiredSkills.join(", ")}</p></div><div><p className="muted text-xs">우대 기술</p><p className="mt-1 font-semibold">{topic.preferredSkills.join(", ") || "없음"}</p></div><div><p className="muted text-xs">기대 역할</p><p className="mt-1">{topic.roleExpectations}</p></div><div><p className="muted text-xs">활동 조건</p><p className="mt-1">{topic.availabilityRequirement}</p></div></div>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm lg:grid-cols-1">
                      <div><dt className="muted text-xs">지도교수</dt><dd className="mt-1 font-semibold">{topic.authorName}</dd></div>
                      <div><dt className="muted text-xs">모집 현황</dt><dd className="mt-1 font-semibold">{topic.memberCount} / {topic.capacity}명</dd></div>
                      <div className="col-span-2 lg:col-span-1"><dt className="muted text-xs">모집 마감</dt><dd className="mt-1 font-semibold">{koreanDateTime.format(topic.recruitmentEndsAt)}</dd></div>
                    </dl>
                  </div>
                  <div className="mt-5 text-sm">
                    {application ? <StatusBadge tone={applicationStatus[application.status].tone}>지원 상태 · {applicationStatus[application.status].label}</StatusBadge> : actor.role === "STUDENT" && isRecruiting ? <ApplyTopicForm topicId={topic.id} /> : <p className="muted">{actor.role === "STUDENT" ? topic.memberCount >= topic.capacity ? "모집 정원이 찼습니다." : "현재 모집 기간이 아닙니다." : "학생 계정으로 지원할 수 있습니다."}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
