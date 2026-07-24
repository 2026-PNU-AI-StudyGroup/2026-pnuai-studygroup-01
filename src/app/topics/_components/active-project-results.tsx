import Link from "next/link";

import { ApplyTopicForm } from "@/app/topics/_components/apply-topic-form";
import { ProjectGalleryCover } from "@/app/topics/_components/project-gallery-cover";
import styles from "@/app/topics/_components/project-gallery.module.css";
import { activeProjectsHref } from "@/app/topics/_lib/active-project-query";
import type { TopicApplicationPage } from "@/modules/topic-application/application/topic-application-ports";
import type { PublicTopicPage, PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

const koreanDate = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "short",
  day: "numeric",
});

const applicationStatus = {
  PENDING: { label: "지원서 검토 중", tone: "info" },
  ACCEPTED: { label: "프로젝트 참여 확정", tone: "success" },
  REJECTED: { label: "지원 결과 확인", tone: "neutral" },
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
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black text-[var(--primary)]">{selectedProgramName ?? "모든 프로그램"}</p>
          <h2 id="project-results-title" className="mt-1.5 text-[clamp(1.65rem,3vw,2.2rem)] font-black tracking-[-0.045em]">함께할 프로젝트</h2>
        </div>
        <p className="text-sm font-bold text-[var(--muted)]">{topics.total}개</p>
      </div>

      {!topics.items.length ? (
        <EmptyState
          title="조건에 맞는 프로젝트가 없습니다"
          description="상태나 프로그램을 바꾸거나 검색어를 지워 다시 확인해 주세요."
          action={<Link href="/topics" className="button-secondary">필터 초기화</Link>}
        />
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {topics.items.map((topic) => {
            const href = `/topics/${topic.id}`;
            const recruiting = topic.recruitmentStartsAt <= now && topic.recruitmentEndsAt > now && topic.memberCount < topic.capacity;
            const application = topic.ownApplicationStatus;
            const awaitingTeam = pendingTeamTopicIds.includes(topic.id);
            const skills = [...new Set([...topic.requiredSkills, ...topic.preferredSkills])];
            const visibleSkills = skills.slice(0, 2);
            const remainingSkillCount = Math.max(0, skills.length - visibleSkills.length);
            const deadlineDays = daysUntil(topic.recruitmentEndsAt, now);
            const availability = topic.memberCount >= topic.capacity
              ? { label: "정원 마감", tone: "neutral" as const }
              : topic.recruitmentStartsAt > now
                ? { label: "모집 예정", tone: "neutral" as const }
                : topic.recruitmentEndsAt <= now
                  ? { label: "모집 종료", tone: "neutral" as const }
                  : deadlineDays <= 7
                    ? { label: "마감 임박", tone: "warning" as const }
                    : { label: "모집 중", tone: "success" as const };

            return (
              <li key={topic.id} className="min-w-0">
                <article aria-labelledby={`topic-${topic.id}`} className={styles.card}>
                  <ProjectGalleryCover
                    id={topic.id}
                    href={href}
                    label={`${topic.programCategory} · ${topic.programName}`}
                    title={topic.title}
                    professorName={topic.authorName}
                  />
                  <div className={styles.body}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 id={`topic-${topic.id}`} className="min-w-0 text-xl font-black leading-7 tracking-[-0.03em]">
                        <Link href={href} className={styles.titleLink}>{topic.title}</Link>
                      </h3>
                      <StatusBadge tone={availability.tone}>{availability.label}</StatusBadge>
                    </div>

                    <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-[var(--line)] py-4 text-sm">
                      <div>
                        <dt className="text-[0.7rem] font-bold text-[var(--muted)]">현재 인원</dt>
                        <dd className="mt-1 font-black">{topic.memberCount} / {topic.capacity}명</dd>
                      </div>
                      <div>
                        <dt className="text-[0.7rem] font-bold text-[var(--muted)]">모집 마감</dt>
                        <dd className="mt-1 font-black">
                          <time dateTime={topic.recruitmentEndsAt.toISOString()}>{koreanDate.format(topic.recruitmentEndsAt)}</time>
                          {recruiting ? <span className="ml-1.5 text-[var(--primary)]">D-{deadlineDays}</span> : null}
                        </dd>
                      </div>
                    </dl>

                    {visibleSkills.length ? (
                      <ul aria-label="필요 기술" className="mt-4 flex min-w-0 flex-wrap items-center gap-1.5">
                        {visibleSkills.map((skill) => (
                          <li key={skill} className="max-w-[9rem] truncate rounded-md bg-[var(--surface-subtle)] px-2 py-1 text-xs font-bold text-[var(--muted)]">{skill}</li>
                        ))}
                        {remainingSkillCount ? <li className="text-xs font-bold text-[var(--muted)]">외 {remainingSkillCount}</li> : null}
                      </ul>
                    ) : null}

                    <div className={`mt-auto pt-5 ${styles.actionLayer}`}>
                      {application ? (
                        <Link href="/topics/applications" className="inline-flex min-h-11 items-center text-sm font-black text-[var(--primary)]">
                          {applicationStatus[application].label} <span aria-hidden="true" className="ml-2">→</span>
                        </Link>
                      ) : awaitingTeam ? (
                        <Link href="/topics/applications" className="inline-flex min-h-11 items-center text-sm font-black text-[var(--primary)]">
                          팀원 수락 대기 <span aria-hidden="true" className="ml-2">→</span>
                        </Link>
                      ) : applications && recruiting ? (
                        <ApplyTopicForm
                          topicId={topic.id}
                          topicTitle={topic.title}
                          applicationMode={topic.applicationMode}
                          applicationQuestions={topic.applicationQuestions}
                          capacity={topic.capacity}
                        />
                      ) : null}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {topics.totalPages > 1 ? (
        <nav aria-label="프로젝트 페이지" className="mt-7 flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--muted)]">{topics.page} / {topics.totalPages} 페이지</span>
          <div className="flex gap-2">
            {topics.page > 1 ? <Link className="button-quiet" href={activeProjectsHref({ phase, programId, query, sort, page: topics.page - 1 })}>이전</Link> : null}
            {topics.page < topics.totalPages ? <Link className="button-quiet" href={activeProjectsHref({ phase, programId, query, sort, page: topics.page + 1 })}>다음</Link> : null}
          </div>
        </nav>
      ) : null}
    </section>
  );
}
