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

const applicationAction = {
  PENDING: { label: "지원서 검토 중", href: "/dashboard?view=pending" },
  REJECTED: { label: "지원 결과 확인", href: "/dashboard?view=rejected" },
} as const;

type TopicItem = PublicTopicPage["items"][number];

function daysUntil(deadline: Date, now: Date) {
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1_000)));
}

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" className="ml-2 size-4 fill-none stroke-current stroke-[1.75]"><path d="M4 10h11M11 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ProjectCard({ topic, canApply, leaderTeams, now, showProgramLabel = true }: {
  topic: TopicItem;
  canApply: boolean;
  leaderTeams: Array<{ id: string; name: string; memberCount: number }>;
  now: Date;
  showProgramLabel?: boolean;
}) {
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
    <li className="min-w-0">
      <article aria-labelledby={`topic-${topic.id}`} className={styles.card}>
        <ProjectGalleryCover
          id={topic.id}
          href={href}
          label={showProgramLabel ? `${topic.programCategory} · ${topic.programName}` : ""}
          title={topic.title}
          professorName={topic.advisorEnabled ? topic.authorName : undefined}
          authorSuffix={topic.authorRole === "PROFESSOR" ? "교수" : "학생 제안"}
        />
        <div className={styles.body}>
          <div className="flex items-start justify-between gap-3">
            <h3 id={`topic-${topic.id}`} className="min-w-0 text-xl font-bold leading-7 tracking-[-0.03em]">
              <Link href={href} className={styles.titleLink}><UiText>{topic.title}</UiText></Link>
            </h3>
            <StatusBadge tone={availability.tone}><UiText>{availability.label}</UiText></StatusBadge>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-[var(--line)] py-4 text-sm">
            <div>
              <dt className="text-[0.7rem] font-semibold text-[var(--muted)]"><UiText>{"현재 인원"}</UiText></dt>
              <dd className="mt-1 font-bold">{topic.memberCount} / {topic.capacity}<UiText>{"명"}</UiText></dd>
            </div>
            <div>
              <dt className="text-[0.7rem] font-semibold text-[var(--muted)]"><UiText>{"모집 마감"}</UiText></dt>
              <dd className="mt-1 font-bold">
                <time dateTime={topic.recruitmentEndsAt.toISOString()}>{koreanDate.format(topic.recruitmentEndsAt)}</time>
                {recruiting ? <span className="ml-1.5 text-[var(--primary)]">D-{deadlineDays}</span> : null}
              </dd>
            </div>
          </dl>

          {visibleSkills.length ? (
            <UiUl aria-label="필요 기술" className="mt-4 flex min-w-0 flex-wrap items-center gap-1.5">
              {visibleSkills.map((skill) => (
                <li key={skill} className="max-w-[9rem] truncate rounded-md bg-[var(--surface-subtle)] px-2 py-1 text-xs font-semibold text-[var(--muted)]"><UiText>{skill}</UiText></li>
              ))}
              {remainingSkillCount ? <li className="text-xs font-semibold text-[var(--muted)]"><UiText>{"외"}</UiText>{" "}{remainingSkillCount}</li> : null}
            </UiUl>
          ) : null}

          <div className={`mt-auto pt-5 ${styles.actionLayer}`}>
            {application === "ACCEPTED" ? (
              <Link href="/dashboard?view=active" className="inline-flex min-h-11 items-center text-sm font-bold text-[var(--primary)]">
                <UiText>{"내 프로젝트"}</UiText> <ArrowIcon />
              </Link>
            ) : application ? (
              <Link href={applicationAction[application].href} className="inline-flex min-h-11 items-center text-sm font-bold text-[var(--primary)]">
                <UiText>{applicationAction[application].label}</UiText> <ArrowIcon />
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
}

const cardGridClassName = "grid gap-5 md:grid-cols-2 2xl:grid-cols-3";

// 전체 보기(특정 프로그램 미선택 + 검색 없음)에서는 프로그램별로 묶어
// 어떤 대회/캡스톤인지 한눈에 들어오도록 섹션으로 나눈다.
// 섹션 순서는 왼쪽 사이드바(listOpen: 최신 학년도·시작일 순)와 동일하게 맞춘다.
function groupByProgram(items: TopicItem[], programOrder: string[]) {
  const groups = new Map<string, { programId: string; programName: string; programCategory: string; items: TopicItem[] }>();
  for (const item of items) {
    const group = groups.get(item.programId)
      ?? { programId: item.programId, programName: item.programName, programCategory: item.programCategory, items: [] };
    group.items.push(item);
    groups.set(item.programId, group);
  }
  const orderIndex = new Map(programOrder.map((id, index) => [id, index] as const));
  return [...groups.values()].sort((a, b) =>
    (orderIndex.get(a.programId) ?? Number.MAX_SAFE_INTEGER) -
    (orderIndex.get(b.programId) ?? Number.MAX_SAFE_INTEGER),
  );
}

export function ActiveProjectResults({ topics, canApply, leaderTeams, programId, phase, query, sort, now, programOrder }: {
  topics: PublicTopicPage;
  canApply: boolean;
  leaderTeams: Array<{ id: string; name: string; memberCount: number }>;
  programId?: string;
  phase: PublicTopicPhase;
  query: string;
  sort: PublicTopicSort;
  now: Date;
  programOrder: string[];
}) {
  const hasFilters = Boolean(
    programId
    || query
    || phase !== "ACTIVE"
    || sort !== "LATEST",
  );
  const grouped = !hasFilters && topics.items.length > 0
    ? groupByProgram(topics.items, programOrder)
    : null;

  return (
    <section id="project-results" aria-labelledby="project-results-title" className="scroll-mt-32 pt-5">
      <div className="mb-4 flex justify-end">
        <h2 id="project-results-title" className="sr-only"><UiText>{"프로젝트 목록"}</UiText></h2>
        <p className="text-xs font-semibold text-[var(--muted)]"><UiText>{"총"}</UiText>{" "}<strong className="text-[var(--ink)]">{topics.total}</strong><UiText>{"개"}</UiText></p>
      </div>

      {!topics.items.length ? (
        <EmptyState
          title="조건에 맞는 프로젝트가 없습니다"
          description="상태나 프로그램을 바꾸거나 검색어를 지워 다시 확인해 주세요."
          action={hasFilters ? <Link href="/topics" className="button-secondary"><UiText>{"필터 초기화"}</UiText></Link> : undefined}
        />
      ) : grouped ? (
        <div className="space-y-10">
          {grouped.map((group) => (
            <section key={group.programId} aria-label={`${group.programCategory} ${group.programName}`}>
              <header className="mb-4 flex items-baseline gap-3 border-b border-[var(--line)] pb-3">
                <span className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[var(--primary)]"><UiText>{group.programCategory}</UiText></span>
                <h3 className="min-w-0 truncate text-base font-bold tracking-[-0.02em]"><UiText>{group.programName}</UiText></h3>
                <span className="ml-auto shrink-0 text-xs font-semibold text-[var(--muted)]">{group.items.length}<UiText>{"개"}</UiText></span>
              </header>
              <UiUl aria-label={`${group.programName} 프로젝트`} className={cardGridClassName}>
                {group.items.map((topic) => (
                  <ProjectCard key={topic.id} topic={topic} canApply={canApply} leaderTeams={leaderTeams} now={now} showProgramLabel={false} />
                ))}
              </UiUl>
            </section>
          ))}
        </div>
      ) : (
        <UiUl aria-label="프로젝트 목록" className={cardGridClassName}>
          {topics.items.map((topic) => (
            <ProjectCard key={topic.id} topic={topic} canApply={canApply} leaderTeams={leaderTeams} now={now} />
          ))}
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
