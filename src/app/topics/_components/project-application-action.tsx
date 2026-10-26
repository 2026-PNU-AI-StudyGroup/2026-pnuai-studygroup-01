import Link from "next/link";

import { TopicApplicationEditor } from "@/app/topics/_components/topic-application-editor";
import type { PublicTopicSummary } from "@/modules/topic/application/topic-ports";
import { UiText } from "@/modules/translation/ui/i18n-provider";

const applicationAction = {
  ACCEPTED: { label: "내 프로젝트", href: "/dashboard?view=active" },
  PENDING: { label: "지원서 검토 중", href: "/dashboard?view=pending" },
  REJECTED: { label: "지원 결과 확인", href: "/dashboard?view=rejected" },
  WITHDRAWN: { label: "철회한 지원 확인", href: "/dashboard?view=rejected" },
} as const;

/** 교수 제안 프로젝트가 지금 지원을 받는지. 모집 기간 안이고 자리가 남아야 한다. */
export function isTopicRecruiting(topic: PublicTopicSummary, now: Date): boolean {
  return !topic.studentProjectCreationEnabled
    && topic.recruitmentEnabled
    && Boolean(topic.programRecruitmentStartsAt && topic.programRecruitmentEndsAt)
    && topic.programRecruitmentStartsAt! <= now
    && topic.programRecruitmentEndsAt! > now
    && topic.memberCount < topic.capacity;
}

/**
 * 프로젝트 카드와 상세가 같이 쓰는 지원 자리.
 *
 * 이미 지원했으면 결과를 볼 곳으로, 지원할 수 있으면 지원서를 연다. 둘 다 아니면 비운다.
 */
export function ProjectApplicationAction({ topic, canApply, recruiting, leaderTeams }: {
  topic: PublicTopicSummary;
  canApply: boolean;
  recruiting: boolean;
  leaderTeams: Array<{ id: string; name: string; memberCount: number }>;
}) {
  const application = topic.ownApplicationStatus;
  if (application) {
    return (
      <Link href={applicationAction[application].href} className="inline-flex min-h-11 items-center text-sm font-bold text-[var(--primary)]">
        <UiText>{applicationAction[application].label}</UiText>
        <svg aria-hidden="true" viewBox="0 0 20 20" className="ml-2 size-4 fill-none stroke-current stroke-[1.75]"><path d="M4 10h11M11 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </Link>
    );
  }
  if (!canApply || !recruiting) return null;
  return (
    <TopicApplicationEditor
      topicId={topic.id}
      topicTitle={topic.title}
      applicationMode={topic.applicationMode}
      applicationQuestions={topic.applicationQuestions}
      capacity={topic.capacity}
      memberCount={topic.memberCount}
      teamMaxSize={topic.projectTeamMaxSize ?? 6}
      leaderTeams={leaderTeams}
    />
  );
}
