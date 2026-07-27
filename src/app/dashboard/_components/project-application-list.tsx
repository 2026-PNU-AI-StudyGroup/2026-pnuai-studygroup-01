import Link from "next/link";

import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import type {
  OwnTopicApplicationStatus,
  TopicApplicationPage,
  TopicApplicationSummary,
} from "@/modules/topic-application/application/topic-application-ports";
import { StatusBadge } from "@/shared/ui/page-primitives";

const presentation = {
  PENDING: {
    title: "승인 대기",
    description: "프로젝트 담당자가 검토 중인 지원입니다.",
    empty: "승인을 기다리는 프로젝트가 없습니다.",
    badge: "검토 중",
    tone: "info",
  },
  REJECTED: {
    title: "승인 거절",
    description: "선정되지 않은 지원과 검토 의견입니다.",
    empty: "승인이 거절된 프로젝트가 없습니다.",
    badge: "미선정",
    tone: "neutral",
  },
} as const;

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-[1.75]">
      <path d="M4 10h11M11 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function isApplicationPublic(application: TopicApplicationSummary) {
  return application.topicStatus === "PUBLISHED" &&
    application.programStatus === "OPEN";
}

function ApplicationRow({
  application,
  status,
}: {
  application: TopicApplicationSummary;
  status: OwnTopicApplicationStatus;
}) {
  const copy = presentation[status];
  const decisionDate = application.decidedAt ?? application.createdAt;

  return (
    <article className="border-b border-[var(--line)] px-6 py-5 last:border-b-0 sm:px-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={copy.tone}><UiText>{copy.badge}</UiText></StatusBadge>
            <span className="text-xs font-semibold text-[var(--muted)]">
              <UiText>{application.applicationKind === "TEAM" ? "팀 지원" : "개인 지원"}</UiText>
            </span>
          </div>
          <h3 className="mt-3 text-xl font-black leading-tight tracking-[-0.025em]">
            <UiText>{application.topicTitle}</UiText>
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            <UiText>{application.programName}</UiText>
          </p>
          {status === "PENDING" ? (
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              <UiText>{"지원서가 접수되었으며 프로젝트 담당자의 결정을 기다리고 있습니다."}</UiText>
            </p>
          ) : application.reviewComment ? (
            <div className="mt-4 border-l-2 border-[var(--line-strong)] pl-4">
              <p className="text-xs font-bold text-[var(--muted)]">
                <UiText>{"검토 의견"}</UiText>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                <UiText>{application.reviewComment}</UiText>
              </p>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-end">
          <time className="text-sm font-medium text-[var(--muted)]" dateTime={decisionDate.toISOString()}>
            <UiDate value={decisionDate} mode="date" />
          </time>
          {isApplicationPublic(application) ? (
            <Link
              href={`/topics/${application.topicId}`}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-[var(--primary)]"
            >
              <UiText>{"프로젝트 보기"}</UiText>
              <ArrowIcon />
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ProjectApplicationList({
  page,
  status,
  preview = false,
}: {
  page: TopicApplicationPage;
  status: OwnTopicApplicationStatus;
  preview?: boolean;
}) {
  const copy = presentation[status];
  const view = status === "PENDING" ? "pending" : "rejected";
  const items = preview ? page.items.slice(0, 3) : page.items;

  return (
    <section
      aria-labelledby={`${view}-projects-title`}
      className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white"
    >
      <header className="flex items-end justify-between gap-4 border-b border-[var(--line)] px-6 py-5 sm:px-7">
        <div>
          <h2 id={`${view}-projects-title`} className="text-2xl font-black tracking-[-0.03em]">
            <UiText>{copy.title}</UiText>
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            <UiText>{copy.description}</UiText>
          </p>
        </div>
        <span className="shrink-0 text-sm font-bold text-[var(--muted)]">
          {page.total}<UiText>{"건"}</UiText>
        </span>
      </header>

      {items.length > 0 ? (
        <div>{items.map((application) => (
          <ApplicationRow key={application.id} application={application} status={status} />
        ))}</div>
      ) : (
        <div className="px-6 py-8 sm:px-7">
          <p className="font-bold"><UiText>{copy.empty}</UiText></p>
          {status === "PENDING" ? (
            <Link href="/topics" className="mt-3 inline-flex min-h-11 items-center text-sm font-black text-[var(--primary)]">
              <UiText>{"프로젝트 둘러보기"}</UiText>
            </Link>
          ) : null}
        </div>
      )}

      {preview && page.total > items.length ? (
        <div className="border-t border-[var(--line)] px-6 py-4 text-right sm:px-7">
          <Link href={`/dashboard?view=${view}`} className="inline-flex min-h-11 items-center text-sm font-black text-[var(--primary)]">
            <UiText>{`${copy.title} 전체 보기`}</UiText>
          </Link>
        </div>
      ) : null}

      {!preview && page.totalPages > 1 ? (
        <UiNav aria-label={`${copy.title} 페이지`} className="flex items-center justify-between border-t border-[var(--line)] px-6 py-4 sm:px-7">
          <span className="text-sm text-[var(--muted)]">{page.page} / {page.totalPages} <UiText>{"페이지"}</UiText></span>
          <div className="flex gap-2">
            {page.page > 1 ? (
              <Link href={`/dashboard?view=${view}&page=${page.page - 1}`} className="button-quiet"><UiText>{"이전"}</UiText></Link>
            ) : null}
            {page.page < page.totalPages ? (
              <Link href={`/dashboard?view=${view}&page=${page.page + 1}`} className="button-quiet"><UiText>{"다음"}</UiText></Link>
            ) : null}
          </div>
        </UiNav>
      ) : null}
    </section>
  );
}
