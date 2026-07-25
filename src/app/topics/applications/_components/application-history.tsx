import Link from "next/link";

import type { TopicApplicationPage, TopicApplicationSummary } from "@/modules/topic-application/application/topic-application-ports";
import { StatusBadge } from "@/shared/ui/page-primitives";

const dateOnly = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });
const statusPresentation = {
  PENDING: { label: "교수 검토 중", tone: "info" },
  ACCEPTED: { label: "선정", tone: "success" },
  REJECTED: { label: "미선정", tone: "neutral" },
} as const;

function isApplicationPublic(application: TopicApplicationSummary) {
  return application.topicStatus === "PUBLISHED" && application.programStatus === "OPEN";
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 fill-none stroke-current stroke-[1.75] transition-transform duration-[var(--snap-duration)] group-open:rotate-180">
      <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-[1.75]">
      <path d="M4 10h11M11 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CurrentApplicationRow({ application, isLast }: { application: TopicApplicationSummary; isLast: boolean }) {
  const isPublic = isApplicationPublic(application);

  return (
    <article className="relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-4 border-b border-[var(--line)] px-6 py-6 last:border-b-0 sm:grid-cols-[1.25rem_minmax(0,1fr)_auto] sm:gap-6 sm:px-7">
      {!isLast ? <span aria-hidden="true" className="absolute bottom-[-1px] left-[1.84rem] top-9 w-px bg-[var(--line-strong)] sm:left-[2.09rem]" /> : null}
      <span aria-hidden="true" className="relative z-10 mt-1 block size-3 rounded-full border-[3px] border-[var(--primary)] bg-white" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="info">교수 검토 중</StatusBadge>
          <span className="text-xs font-semibold text-[var(--muted)]">{application.applicationKind === "TEAM" ? "팀 지원" : "개인 지원"}</span>
        </div>
        <h3 className="mt-3 text-xl font-black leading-tight tracking-[-0.025em]">{application.topicTitle}</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">{application.programName}</p>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">지원서가 접수되었으며 교수 검토를 기다리고 있습니다. 결과가 결정되면 이 행에 바로 반영됩니다.</p>
      </div>
      <div className="col-start-2 flex flex-wrap items-center gap-4 sm:col-start-auto sm:flex-col sm:items-end sm:justify-between">
        <time className="text-sm font-medium text-[var(--muted)]" dateTime={application.createdAt.toISOString()}>{dateOnly.format(application.createdAt)} 지원</time>
        {isPublic ? (
          <Link href={`/topics/${application.topicId}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-[var(--primary)]">
            프로젝트 보기 <ArrowIcon />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function PastApplicationItem({ application }: { application: TopicApplicationSummary }) {
  const isPublic = isApplicationPublic(application);
  const presentation = statusPresentation[application.status];

  return (
    <li className="border-b border-[var(--line)] last:border-b-0">
      <details className="group">
        <summary className="grid min-h-24 cursor-pointer list-none gap-4 px-6 py-5 marker:content-none sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-7">
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold tracking-[-0.02em]">{application.topicTitle}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{application.programName} · {application.applicationKind === "TEAM" ? "팀 지원" : "개인 지원"}</p>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
            <time className="min-w-24 text-sm font-medium text-[var(--muted)]" dateTime={(application.decidedAt ?? application.createdAt).toISOString()}>{dateOnly.format(application.decidedAt ?? application.createdAt)}</time>
          </div>
          <span className="text-[var(--primary)]"><ChevronIcon /></span>
        </summary>
        <div className="grid gap-6 border-t border-[var(--line)] bg-[var(--surface-subtle)] px-6 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-7">
          <div>
            <dl className="flex flex-wrap gap-x-10 gap-y-3 text-sm">
              <div><dt className="text-[var(--muted)]">지원일</dt><dd className="mt-1 font-bold"><time dateTime={application.createdAt.toISOString()}>{dateOnly.format(application.createdAt)}</time></dd></div>
              {application.decidedAt ? <div><dt className="text-[var(--muted)]">결정일</dt><dd className="mt-1 font-bold"><time dateTime={application.decidedAt.toISOString()}>{dateOnly.format(application.decidedAt)}</time></dd></div> : null}
            </dl>
            {application.applicationKind === "TEAM" ? <p className="mt-4 text-sm leading-6 text-[var(--muted)]">함께 지원 · {application.teamMembers.map(({ name }) => name).join(", ")}</p> : null}
            {application.reviewComment ? (
              <div className="mt-5 border-l-2 border-[var(--primary)] pl-4">
                <p className="text-sm font-extrabold text-[var(--primary-hover)]">교수 검토 의견</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{application.reviewComment}</p>
              </div>
            ) : null}
          </div>
          {isPublic ? <Link href={`/topics/${application.topicId}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-[var(--primary)]">프로젝트 보기 <ArrowIcon /></Link> : null}
        </div>
      </details>
    </li>
  );
}

export function ApplicationHistory({ page, hasDrafts }: { page: TopicApplicationPage; hasDrafts: boolean }) {
  const currentApplications = page.items.filter(({ status }) => status === "PENDING");
  const pastApplications = page.items.filter(({ status }) => status !== "PENDING");

  if (page.items.length === 0) {
    return (
      <section aria-labelledby="application-list-title" className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-white px-6 py-10 text-center sm:px-7">
        <h2 id="application-list-title" className="text-xl font-black">접수된 지원서가 없습니다</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">{hasDrafts ? "초대한 팀원이 모두 수락하면 프로젝트 지원이 완료됩니다." : "관심 있는 프로젝트를 비교하고 개인 또는 팀으로 지원해 보세요."}</p>
        <Link href="/topics" className="button-primary mt-5">프로젝트 둘러보기</Link>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="current-applications-title" className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white">
        <div className="flex items-end justify-between gap-4 border-b border-[var(--line)] px-6 py-5 sm:px-7">
          <div>
            <h2 id="current-applications-title" className="text-2xl font-black tracking-[-0.03em]">검토 중인 지원</h2>
          </div>
          <span className="text-sm font-bold text-[var(--muted)]">{currentApplications.length}건</span>
        </div>

        {currentApplications.length > 0 ? (
          <div>{currentApplications.map((application, index) => <CurrentApplicationRow key={application.id} application={application} isLast={index === currentApplications.length - 1} />)}</div>
        ) : (
          <div className="px-6 py-8 sm:px-7">
            <p className="font-bold">현재 검토 중인 지원은 없습니다.</p>
            <p className="mt-1 text-sm text-[var(--muted)]">새 프로젝트를 찾거나 지난 지원 결과를 확인해 보세요.</p>
          </div>
        )}
      </section>

      {pastApplications.length > 0 ? (
        <section aria-labelledby="past-applications-title" className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white">
          <div className="flex items-end justify-between gap-4 border-b border-[var(--line)] px-6 py-5 sm:px-7">
            <div>
              <h2 id="past-applications-title" className="text-2xl font-black tracking-[-0.03em]">결정된 지원</h2>
            </div>
            <span className="text-sm font-bold text-[var(--muted)]">{pastApplications.length}건</span>
          </div>
          <ul>{pastApplications.map((application) => <PastApplicationItem key={application.id} application={application} />)}</ul>
        </section>
      ) : null}

      {page.totalPages > 1 ? (
        <nav aria-label="지원 이력 페이지" className="flex items-center justify-between border-t border-[var(--line)] pt-5">
          <span className="text-sm text-[var(--muted)]">{page.page} / {page.totalPages} 페이지</span>
          <div className="flex gap-2">
            {page.page > 1 ? <Link href={`/topics/applications?page=${page.page - 1}`} className="button-quiet">이전</Link> : null}
            {page.page < page.totalPages ? <Link href={`/topics/applications?page=${page.page + 1}`} className="button-quiet">다음</Link> : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
