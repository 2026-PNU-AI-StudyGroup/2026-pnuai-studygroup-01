import Link from "next/link";
import { redirect } from "next/navigation";

import { ApplyTopicForm } from "@/app/topics/apply-topic-form";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { ListOwnTopicApplicationsService } from "@/modules/topic-application/application/list-own-topic-applications";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { ListPublishedTopicsService } from "@/modules/topic/application/list-published-topics";
import { PrismaTopicRepository } from "@/modules/topic/infrastructure/prisma-topic-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, StatusBadge } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { TranslatedText } from "@/shared/ui/translated-text";

const koreanDateTime = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "medium",
  timeStyle: "short",
});
const applicationStatus = {
  PENDING: { label: "검토 중", tone: "warning" },
  ACCEPTED: { label: "수락", tone: "success" },
  REJECTED: { label: "거절", tone: "danger" },
} as const;

function Period({ label, startsAt, endsAt }: { label: string; startsAt: Date; endsAt: Date }) {
  return (
    <div>
      <dt className="muted text-xs font-semibold">{label}</dt>
      <dd className="mt-1 text-sm font-semibold leading-6">
        <time dateTime={startsAt.toISOString()}>{koreanDateTime.format(startsAt)}</time>
        <span aria-hidden="true"> – </span>
        <span className="sr-only">부터 </span>
        <time dateTime={endsAt.toISOString()}>{koreanDateTime.format(endsAt)}</time>
      </dd>
    </div>
  );
}

export default async function TopicsPage({ searchParams }: { searchParams: Promise<{ programId?: SearchParamValue }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");

  const topicRepository = new PrismaTopicRepository(prisma);
  const programs = await new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).listOpen();
  const requestedProgramId = firstSearchParam((await searchParams).programId);
  const programId = requestedProgramId && requestedProgramId.length <= 200 && programs.some((program) => program.id === requestedProgramId)
    ? requestedProgramId
    : undefined;
  const [topics, applications] = await Promise.all([
    new ListPublishedTopicsService(topicRepository).execute(programId),
    actor.role === "STUDENT"
      ? new ListOwnTopicApplicationsService(new PrismaTopicApplicationRepository(prisma)).execute(actor)
      : Promise.resolve([]),
  ]);
  const applicationsByTopic = new Map(applications.map((application) => [application.topicId, application]));
  const now = new Date();

  return (
    <AppShell role={actor.role} userName="부산대학교" currentPath="/topics">
      <main className="content-shell space-y-14">
        <PageHeader eyebrow="Project topics" title="주제 탐색" description="프로그램을 태그로 좁혀 주제의 지원 조건과 전체 일정을 비교하고, 한 화면에서 지원 이력을 관리하세요." />

        <section aria-labelledby="program-filter-title" className="border-b border-[var(--line)] pb-8">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="program-filter-title" className="text-base font-extrabold">프로그램</h2>
            <p className="muted text-sm">공개 주제 {topics.length}개</p>
          </div>
          <nav aria-label="프로그램별 주제 필터" className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
            <Link
              href="/topics"
              aria-current={!programId ? "page" : undefined}
              className={`snap-color inline-flex min-h-11 shrink-0 snap-start items-center rounded-lg border px-4 text-sm font-bold ${!programId ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]"}`}
            >
              전체 {!programId ? <><span aria-hidden="true" className="ml-2">✓</span><span className="sr-only">선택됨</span></> : null}
            </Link>
            {programs.map((program) => {
              const selected = program.id === programId;
              return (
                <Link
                  key={program.id}
                  href={`/topics?programId=${encodeURIComponent(program.id)}`}
                  aria-current={selected ? "page" : undefined}
                  className={`snap-color inline-flex min-h-11 shrink-0 snap-start items-center rounded-lg border px-4 text-sm font-bold ${selected ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]"}`}
                >
                  {program.name} {selected ? <><span aria-hidden="true" className="ml-2">✓</span><span className="sr-only">선택됨</span></> : null}
                </Link>
              );
            })}
          </nav>
        </section>

        <section aria-labelledby="topic-list-title">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 id="topic-list-title" className="text-xl font-extrabold tracking-[-0.025em]">공개 주제</h2>
            <p className="muted text-sm">모집·수행·제출 기간은 서로 겹칠 수 있습니다.</p>
          </div>
          {topics.length === 0 ? (
            <EmptyState title="조건에 맞는 공개 주제가 없습니다" description="다른 프로그램 태그를 선택하거나 새 주제가 공개된 뒤 다시 확인해 주세요." />
          ) : (
            <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {topics.map((topic) => {
                const application = applicationsByTopic.get(topic.id);
                const isRecruiting = topic.recruitmentStartsAt <= now && topic.recruitmentEndsAt > now && topic.memberCount < topic.capacity;
                return (
                  <li key={topic.id} className="py-9 first:pt-8 last:pb-8">
                    <article aria-labelledby={`topic-${topic.id}`}>
                      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_23rem]">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-xs font-extrabold text-[var(--accent)]">{topic.programName}</p>
                            <span className="muted text-xs">{topic.programCategory}</span>
                          </div>
                          <div className="mt-3 flex flex-wrap items-start gap-3">
                            <h3 id={`topic-${topic.id}`} className="text-2xl font-extrabold leading-tight tracking-[-0.035em]">{topic.title}</h3>
                            {isRecruiting ? <StatusBadge tone="success">모집 중</StatusBadge> : <StatusBadge>모집 종료</StatusBadge>}
                          </div>
                          <TranslatedText text={topic.description} className="muted mt-5 max-w-4xl whitespace-pre-wrap leading-7" />
                          <dl className="mt-6 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
                            <div><dt className="muted text-xs font-semibold">필수 기술</dt><dd className="mt-1 font-semibold">{topic.requiredSkills.join(", ")}</dd></div>
                            <div><dt className="muted text-xs font-semibold">우대 기술</dt><dd className="mt-1 font-semibold">{topic.preferredSkills.join(", ") || "없음"}</dd></div>
                            <div><dt className="muted text-xs font-semibold">기대 역할</dt><dd className="mt-1 leading-6">{topic.roleExpectations}</dd></div>
                            <div><dt className="muted text-xs font-semibold">활동 조건</dt><dd className="mt-1 leading-6">{topic.availabilityRequirement}</dd></div>
                          </dl>
                        </div>
                        <div className="border-t border-[var(--line)] pt-6 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
                          <div className="grid grid-cols-2 gap-5">
                            <div><p className="muted text-xs font-semibold">지도교수</p><p className="mt-1 font-bold">{topic.authorName}</p></div>
                            <div><p className="muted text-xs font-semibold">모집 현황</p><p className="mt-1 font-bold">{topic.memberCount} / {topic.capacity}명</p></div>
                          </div>
                          <dl className="mt-6 grid gap-4 border-t border-[var(--line)] pt-5">
                            <Period label="모집 기간" startsAt={topic.recruitmentStartsAt} endsAt={topic.recruitmentEndsAt} />
                            <Period label="수행 기간" startsAt={topic.executionStartsAt} endsAt={topic.executionEndsAt} />
                            <Period label="제출 기간" startsAt={topic.submissionStartsAt} endsAt={topic.submissionEndsAt} />
                          </dl>
                        </div>
                      </div>
                      <div className="mt-7 text-sm">
                        {application ? (
                          <StatusBadge tone={applicationStatus[application.status].tone}>지원 상태 · {applicationStatus[application.status].label}</StatusBadge>
                        ) : actor.role === "STUDENT" && isRecruiting ? (
                          <ApplyTopicForm topicId={topic.id} />
                        ) : (
                          <p className="muted">{actor.role === "STUDENT" ? topic.memberCount >= topic.capacity ? "모집 정원이 찼습니다." : "현재 모집 기간이 아닙니다." : "학생 계정으로 지원할 수 있습니다."}</p>
                        )}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {actor.role === "STUDENT" ? (
          <section aria-labelledby="application-history-title" className="border-t border-[var(--line)] pt-10">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(16rem,.45fr)] md:items-end">
              <div>
                <p className="eyebrow">Application history</p>
                <h2 id="application-history-title" className="mt-3 text-2xl font-extrabold tracking-[-0.035em]">전체 주제 지원 이력</h2>
              </div>
              <p className="muted text-sm leading-6">검토 중인 지원부터 마감된 주제와 거절된 지원까지 모두 확인할 수 있습니다.</p>
            </div>
            {applications.length === 0 ? (
              <div className="mt-6 border-y border-[var(--line)] py-8"><p className="font-bold">아직 지원 이력이 없습니다.</p><p className="muted mt-2 text-sm">위 공개 주제의 조건을 비교하고 첫 지원을 시작해 보세요.</p></div>
            ) : (
              <ul className="mt-6 divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {applications.map((application) => (
                  <li key={application.id} className="grid gap-4 py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-extrabold">{application.topicTitle}</h3>
                        <StatusBadge tone={applicationStatus[application.status].tone}>{applicationStatus[application.status].label}</StatusBadge>
                        {application.topicStatus === "CLOSED" ? <StatusBadge>주제 마감</StatusBadge> : null}
                      </div>
                      <p className="muted mt-2 text-sm">{application.programName} · 희망 역할 {application.desiredRole}</p>
                    </div>
                    <dl className="text-sm md:text-right">
                      <div><dt className="muted inline text-xs">지원일 </dt><dd className="inline font-semibold"><time dateTime={application.createdAt.toISOString()}>{koreanDateTime.format(application.createdAt)}</time></dd></div>
                      {application.decidedAt ? <div className="mt-1"><dt className="muted inline text-xs">결정일 </dt><dd className="inline font-semibold"><time dateTime={application.decidedAt.toISOString()}>{koreanDateTime.format(application.decidedAt)}</time></dd></div> : null}
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}
