import Link from "next/link";
import { UiUl } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import { TopicApplicationEditor } from "@/app/topics/_components/topic-application-editor";
import { ProjectGalleryCover } from "@/app/topics/_components/project-gallery-cover";
import { ProjectPagination } from "@/app/topics/_components/project-pagination";
import styles from "@/app/topics/_components/project-gallery.module.css";
import { activeProjectsHref } from "@/app/topics/_lib/active-project-query";
import type { PublicTopicPage, PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

const koreanDate = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "short",
  day: "numeric",
});

const applicationStatus = {
  PENDING: { label: "지원서 검토 중", tone: "info", href: "/dashboard?view=pending" },
  ACCEPTED: { label: "프로젝트 참여 확정", tone: "success", href: "/dashboard?view=active" },
  REJECTED: { label: "지원 결과 확인", tone: "neutral", href: "/dashboard?view=rejected" },
} as const;

function daysUntil(deadline: Date, now: Date) {
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1_000)));
}

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" className="ml-2 size-4 fill-none stroke-current stroke-[1.75]"><path d="M4 10h11M11 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function ActiveProjectResults({ topics, canApply, leaderTeams, programId, phase, query, sort, now }: {
  topics: PublicTopicPage;
  canApply: boolean;
  leaderTeams: Array<{ id: string; name: string; memberCount: number }>;
  programId?: string;
  phase: PublicTopicPhase;
  query: string;
  sort: PublicTopicSort;
  now: Date;
}) {
  return (
    <section id="project-results" aria-labelledby="project-results-title" className="scroll-mt-32 pt-5">
      <div className="mb-4 flex justify-end">
        <h2 id="project-results-title" className="sr-only"><UiText>{"프로젝트 목록"}</UiText></h2>
        <p className="text-xs font-bold text-[var(--muted)]"><UiText>{"총"}</UiText>{" "}<strong className="text-[var(--ink)]">{topics.total}</strong><UiText>{"개"}</UiText></p>
      </div>

      {!topics.items.length ? (
        <EmptyState
          title="조건에 맞는 프로젝트가 없습니다"
          description="상태나 프로그램을 바꾸거나 검색어를 지워 다시 확인해 주세요."
          action={<Link href="/topics" className="button-secondary"><UiText>{"필터 초기화"}</UiText></Link>}
        />
      ) : (
        <UiUl aria-label="프로젝트 목록" className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {topics.items.map((topic) => {
            const href = `/topics/${topic.id}`;
            const recruiting = topic.recruitmentEnabled && topic.recruitmentStartsAt <= now && topic.recruitmentEndsAt > now && topic.memberCount < topic.capacity;
            const application = topic.ownApplicationStatus;
            const skills = [...new Set([...topic.requiredSkills, ...topic.preferredSkills])];
            const visibleSkills = skills.slice(0, 2);
            const remainingSkillCount = Math.max(0, skills.length - visibleSkills.length);
            const deadlineDays = daysUntil(topic.recruitmentEndsAt, now);
            const availability = !topic.recruitmentEnabled
              ? { label: "기존 팀 참여", tone: "neutral" as const }
              : topic.memberCount >= topic.capacity
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
                    authorSuffix={topic.authorRole === "PROFESSOR" ? "교수" : "학생 제안"}
                  />
                  <div className={styles.body}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 id={`topic-${topic.id}`} className="min-w-0 text-xl font-black leading-7 tracking-[-0.03em]">
                        <Link href={href} className={styles.titleLink}><UiText>{topic.title}</UiText></Link>
                      </h3>
                      <StatusBadge tone={availability.tone}><UiText>{availability.label}</UiText></StatusBadge>
                    </div>

                    <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-[var(--line)] py-4 text-sm">
                      <div>
                        <dt className="text-[0.7rem] font-bold text-[var(--muted)]"><UiText>{"현재 인원"}</UiText></dt>
                        <dd className="mt-1 font-black">{topic.memberCount} / {topic.capacity}<UiText>{"명"}</UiText></dd>
                      </div>
                      <div>
                        <dt className="text-[0.7rem] font-bold text-[var(--muted)]"><UiText>{"모집 마감"}</UiText></dt>
                        <dd className="mt-1 font-black">
                          <time dateTime={topic.recruitmentEndsAt.toISOString()}>{koreanDate.format(topic.recruitmentEndsAt)}</time>
                          {recruiting ? <span className="ml-1.5 text-[var(--primary)]">D-{deadlineDays}</span> : null}
                        </dd>
                      </div>
                    </dl>

                    {visibleSkills.length ? (
                      <UiUl aria-label="필요 기술" className="mt-4 flex min-w-0 flex-wrap items-center gap-1.5">
                        {visibleSkills.map((skill) => (
                          <li key={skill} className="max-w-[9rem] truncate rounded-md bg-[var(--surface-subtle)] px-2 py-1 text-xs font-bold text-[var(--muted)]"><UiText>{skill}</UiText></li>
                        ))}
                        {remainingSkillCount ? <li className="text-xs font-bold text-[var(--muted)]"><UiText>{"외"}</UiText>{" "}{remainingSkillCount}</li> : null}
                      </UiUl>
                    ) : null}

                    <div className={`mt-auto pt-5 ${styles.actionLayer}`}>
                      {application ? (
                        <Link href={applicationStatus[application].href} className="inline-flex min-h-11 items-center text-sm font-black text-[var(--primary)]">
                          <UiText>{applicationStatus[application].label}</UiText> <ArrowIcon />
                        </Link>
                      ) : canApply && recruiting ? (
                        <TopicApplicationEditor
                          topicId={topic.id}
                          topicTitle={topic.title}
                          applicationMode={topic.applicationMode}
                          applicationQuestions={topic.applicationQuestions}
                          capacity={topic.capacity}
                          leaderTeams={leaderTeams}
                        />
                      ) : null}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </UiUl>
      )}

      <ProjectPagination
        page={topics.page}
        totalPages={topics.totalPages}
        ariaLabel="프로젝트 페이지"
        href={(page) => activeProjectsHref({ phase, programId, query, sort, page })}
      />
    </section>
  );
}
