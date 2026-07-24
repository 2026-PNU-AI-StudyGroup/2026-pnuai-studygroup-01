import Link from "next/link";

import { activeProjectsHref } from "@/app/topics/_lib/active-project-query";
import { ApplyTopicForm } from "@/app/topics/_components/apply-topic-form";
import type { TopicApplicationPage } from "@/modules/topic-application/application/topic-application-ports";
import type { PublicTopicPage, PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

const koreanDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
const applicationStatus = {
  PENDING: { label: "검토 중", tone: "info" },
  ACCEPTED: { label: "수락", tone: "success" },
  REJECTED: { label: "거절", tone: "danger" },
} as const;

function daysUntil(deadline: Date, now: Date) {
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1_000)));
}

export function ActiveProjectResults({ selectedProgramName, topics, applications, pendingTeamTopicIds, programId, phase, query, sort, now }: {
  selectedProgramName?: string;
  topics: PublicTopicPage;
  applications?: TopicApplicationPage;
  pendingTeamTopicIds: string[];
  programId?: string;
  phase: PublicTopicPhase;
  query: string;
  sort: PublicTopicSort;
  now: Date;
}) {
  return (
    <section id="project-results" aria-labelledby="project-results-title" className="scroll-mt-32">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">프로젝트 목록</p><h2 id="project-results-title" className="mt-2 text-2xl font-black tracking-[-0.03em]">{selectedProgramName ?? "전체 프로그램"}</h2></div><p className="muted text-sm">총 {topics.total}개 주제</p></div>
      {!topics.items.length ? <EmptyState title="조건에 맞는 프로젝트가 없습니다" description="상태나 프로그램 태그를 바꾸거나 검색어를 지워 다시 확인해 주세요." action={<Link href="/topics" className="button-secondary">필터 초기화</Link>} /> : <ul className="project-card-grid grid gap-4 md:grid-cols-2 xl:grid-cols-3">{topics.items.map((topic) => {
        const recruiting = topic.recruitmentStartsAt <= now && topic.recruitmentEndsAt > now && topic.memberCount < topic.capacity;
        const application = topic.ownApplicationStatus;
        const awaitingTeam = pendingTeamTopicIds.includes(topic.id);
        const skills = [...topic.requiredSkills, ...topic.preferredSkills].slice(0, 4);
        const deadlineSoon = recruiting && daysUntil(topic.recruitmentEndsAt, now) <= 7;
        const availability = topic.memberCount >= topic.capacity
          ? { label: "정원 마감", tone: "neutral" as const }
          : topic.recruitmentStartsAt > now
            ? { label: "모집 예정", tone: "neutral" as const }
            : topic.recruitmentEndsAt <= now
              ? { label: "모집 종료", tone: "neutral" as const }
              : deadlineSoon
                ? { label: "마감 임박", tone: "warning" as const }
                : { label: "모집 중", tone: "success" as const };
        return <li key={topic.id} className="project-card flex min-h-[25rem] flex-col border border-[var(--line)] bg-white p-5 sm:p-6"><article aria-labelledby={`topic-${topic.id}`} className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3"><span className="rounded bg-[var(--primary-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--primary-hover)]">{topic.programName}</span><StatusBadge tone={availability.tone}>{availability.label}</StatusBadge></div>
          <h3 id={`topic-${topic.id}`} className="mt-4 text-xl font-black leading-7 tracking-[-0.025em]">{topic.title}</h3>
          <p className="muted mt-3 line-clamp-3 text-base leading-7">{topic.description}</p>
          <ul aria-label="필요 기술" className="mt-4 flex flex-wrap gap-2">{skills.map((skill) => <li key={skill} className="rounded bg-[var(--surface-subtle)] px-2 py-1 text-xs font-semibold">{skill}</li>)}</ul>
          <dl className="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--line)] pt-5 text-sm"><div><dt className="muted text-xs">지도교수</dt><dd className="mt-1 font-bold">{topic.authorName}</dd></div><div><dt className="muted text-xs">모집 인원</dt><dd className="mt-1 font-bold">{topic.memberCount} / {topic.capacity}명</dd></div><div className="col-span-2"><dt className="muted text-xs">모집 마감</dt><dd className="mt-1 flex items-center justify-between gap-3 font-semibold"><time dateTime={topic.recruitmentEndsAt.toISOString()}>{koreanDate.format(topic.recruitmentEndsAt)}</time>{topic.recruitmentEndsAt > now ? <span className="text-xs font-bold text-[var(--ink)]">D-{daysUntil(topic.recruitmentEndsAt, now)}</span> : null}</dd></div></dl>
          <div className="mt-5 grid grid-cols-2 gap-2"><Link href={`/topics/${topic.id}`} className="button-secondary">상세 보기</Link>{application ? <span className="flex min-h-11 items-center justify-center"><StatusBadge tone={applicationStatus[application].tone}>{applicationStatus[application].label}</StatusBadge></span> : awaitingTeam ? <Link href="/topics/applications" className="button-quiet">팀원 수락 대기</Link> : applications && recruiting ? <ApplyTopicForm topicId={topic.id} topicTitle={topic.title} applicationMode={topic.applicationMode} applicationQuestions={topic.applicationQuestions} capacity={topic.capacity} /> : <span className="muted flex min-h-11 items-center justify-center text-xs">{applications ? "지원 불가" : "상세 확인"}</span>}</div>
        </article></li>;
      })}</ul>}
      {topics.totalPages > 1 ? <nav aria-label="프로젝트 페이지" className="mt-6 flex items-center justify-between"><span className="muted text-sm">{topics.page} / {topics.totalPages} 페이지</span><div className="flex gap-2">{topics.page > 1 ? <Link className="button-quiet" href={activeProjectsHref({ phase, programId, query, sort, page: topics.page - 1 })}>이전</Link> : null}{topics.page < topics.totalPages ? <Link className="button-quiet" href={activeProjectsHref({ phase, programId, query, sort, page: topics.page + 1 })}>다음</Link> : null}</div></nav> : null}
    </section>
  );
}
