"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { UiUl } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import { TopicApplicationEditor } from "@/app/topics/_components/topic-application-editor";
import { ProjectVoteButton, ProjectVoteStatusPill, useProjectVoteSelection, type ProjectVoteSelection } from "@/app/topics/_components/project-vote-control";
import { ProjectGalleryCover } from "@/app/topics/_components/project-gallery-cover";
import { ProjectPagination } from "@/app/topics/_components/project-pagination";
import styles from "@/app/topics/_components/project-gallery.module.css";
import { activeProjectsHref } from "@/app/topics/_lib/active-project-query";
import type { PublicTopicPage } from "@/modules/topic/application/topic-ports";
import type { ProgramVoteBallot } from "@/modules/project-voting/application/manage-project-voting";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

const applicationAction = {
  PENDING: { label: "지원서 검토 중", href: "/dashboard?view=pending" },
  REJECTED: { label: "지원 결과 확인", href: "/dashboard?view=rejected" },
} as const;

type TopicItem = PublicTopicPage["items"][number];

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" className="ml-2 size-4 fill-none stroke-current stroke-[1.75]"><path d="M4 10h11M11 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ProjectCard({ topic, canApply, leaderTeams, now, voteSelection }: {
  topic: TopicItem;
  canApply: boolean;
  leaderTeams: Array<{ id: string; name: string; memberCount: number }>;
  now: Date;
  voteSelection: ProjectVoteSelection;
}) {
  const href = `/topics/${topic.id}`;
  const recruiting = topic.recruitmentEnabled && topic.programRecruitmentStartsAt <= now && topic.programRecruitmentEndsAt > now && topic.memberCount < topic.capacity;
  const application = topic.ownApplicationStatus;
  const voteCandidate = voteSelection.ballot?.candidates.find(({ id }) => id === topic.id);
  const hasProjectAction = Boolean(application || (canApply && recruiting));
  const memberLabel = `${topic.memberCount} / ${topic.capacity}명`;
  const availabilityTone = !topic.recruitmentEnabled
    ? "neutral" as const
    : topic.memberCount >= topic.capacity
    ? "neutral" as const
    : topic.programRecruitmentStartsAt > now
      ? "neutral" as const
      : topic.programRecruitmentEndsAt <= now
        ? "neutral" as const
        : topic.programRecruitmentEndsAt.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1_000
          ? "warning" as const
          : "success" as const;

  return (
    <li className="min-w-0">
      <article aria-labelledby={`topic-${topic.id}`} className={styles.card}>
        <ProjectGalleryCover
          programName={topic.programName}
          title={topic.title}
        />
        <div className={styles.body}>
          <div className="flex items-start justify-between gap-3">
            <h3 id={`topic-${topic.id}`} className="min-w-0 text-xl font-bold leading-7 tracking-[-0.03em]">
              <Link href={href} className={styles.titleLink}><UiText>{topic.title}</UiText></Link>
            </h3>
            <StatusBadge tone={availabilityTone}><UiText>{memberLabel}</UiText></StatusBadge>
          </div>
          <p className="mt-2 text-xs font-semibold text-[var(--primary)]"><UiText>{`${topic.programName} · ${topic.divisionName ?? "미분과"}`}</UiText></p>
          {topic.professorName ? <p className="mt-2 truncate text-xs font-semibold text-[var(--muted)]">{topic.professorName}</p> : null}
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--muted)]"><UiText>{topic.description}</UiText></p>

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
            {voteCandidate ? (
              <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${hasProjectAction ? "mt-2" : ""}`}>
                <ProjectVoteButton candidate={voteCandidate} selection={voteSelection} />
                <span className="text-xs font-semibold text-[var(--muted)]"><UiText>{"득표"}</UiText>{" "}<strong className="tabular-nums text-[var(--ink)]">{voteCandidate.voteCount}</strong></span>
              </div>
            ) : null}
          </div>
        </div>
      </article>
    </li>
  );
}

const cardGridClassName = "grid gap-5 md:grid-cols-2 2xl:grid-cols-3";

export function ActiveProjectResults({ topics, canApply, leaderTeams, programId, query, divisionId, now, ballot, registrationAction }: {
  topics: PublicTopicPage;
  canApply: boolean;
  leaderTeams: Array<{ id: string; name: string; memberCount: number }>;
  programId?: string;
  query: string;
  divisionId?: string | "UNASSIGNED";
  now: Date;
  ballot?: ProgramVoteBallot;
  registrationAction?: ReactNode;
}) {
  const hasFilters = Boolean(query || divisionId);
  const voteSelection = useProjectVoteSelection(ballot);
  return (
    <section id="project-results" aria-labelledby="project-results-title" className="scroll-mt-32 pt-5">
      <div className="mb-4 flex min-h-9 flex-wrap items-center gap-3">
        {registrationAction}
        <ProjectVoteStatusPill selection={voteSelection} />
        <h2 id="project-results-title" className="sr-only"><UiText>{"프로젝트 목록"}</UiText></h2>
        <p className="ml-auto shrink-0 text-xs font-semibold text-[var(--muted)]"><UiText>{"총"}</UiText>{" "}<strong className="text-[var(--ink)]">{topics.total}</strong><UiText>{"개"}</UiText></p>
      </div>
      {!topics.items.length ? (
        <EmptyState
          title="조건에 맞는 프로젝트가 없습니다"
          description="프로그램, 분과 또는 검색어를 바꿔 다시 확인해 주세요."
          action={hasFilters ? <Link href={activeProjectsHref({ programId })} className="button-secondary"><UiText>{"필터 초기화"}</UiText></Link> : undefined}
        />
      ) : (
        <UiUl aria-label="프로젝트 목록" className={cardGridClassName}>
          {topics.items.map((topic) => (
            <ProjectCard key={topic.id} topic={topic} canApply={canApply} leaderTeams={leaderTeams} now={now} voteSelection={voteSelection} />
          ))}
        </UiUl>
      )}

      <ProjectPagination
        page={topics.page}
        totalPages={topics.totalPages}
        ariaLabel="프로젝트 페이지"
        href={(page) => activeProjectsHref({ programId, query, divisionId, page })}
      />
    </section>
  );
}
