import Link from "next/link";

import type { TopicApplicationPage, TopicApplicationSummary } from "@/modules/topic-application/application/topic-application-ports";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

const dateOnly = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });
const statusPresentation = {
  PENDING: { label: "검토 중", tone: "info" },
  ACCEPTED: { label: "선정", tone: "success" },
  REJECTED: { label: "미선정", tone: "neutral" },
} as const;

function isApplicationPublic(application: TopicApplicationSummary) {
  return application.topicStatus === "PUBLISHED" && application.programStatus === "OPEN";
}

function ReviewProgress({ status }: { status: TopicApplicationSummary["status"] }) {
  const currentStep = status === "PENDING" ? 1 : 2;
  const steps = ["지원 완료", "교수 검토", "결과 발표"];

  return (
    <ol aria-label="지원 진행 단계" className="mt-8 grid gap-5 sm:grid-cols-3 sm:gap-0">
      {steps.map((label, index) => {
        const isComplete = index < currentStep || status !== "PENDING";
        const isCurrent = index === currentStep;
        return (
          <li key={label} aria-current={isCurrent ? "step" : undefined} className="relative flex flex-col items-center text-center sm:px-4">
            {index > 0 ? <span aria-hidden="true" className={`absolute right-1/2 top-4 hidden h-0.5 w-full sm:block ${index <= currentStep ? "bg-[var(--primary)]" : "bg-[var(--line)]"}`} /> : null}
            <span className={`relative z-10 grid size-9 place-items-center rounded-full border-2 text-sm font-black ${isComplete ? "border-[var(--primary)] bg-[var(--primary)] text-white" : isCurrent ? "border-[var(--primary)] bg-white text-[var(--primary)]" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}>
              {isComplete ? <span aria-hidden="true">✓</span> : index + 1}
            </span>
            <span className={`mt-2 font-bold ${isCurrent ? "text-[var(--primary)]" : isComplete ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function CurrentApplicationCard({ application }: { application: TopicApplicationSummary }) {
  const isPublic = isApplicationPublic(application);

  return (
    <article className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white">
      <div className="px-6 py-7 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-[var(--muted)]">{application.programName}</p>
            <h3 className="mt-3 text-2xl font-black leading-tight tracking-[-0.035em] sm:text-[2rem]">{application.topicTitle}</h3>
            <p className="mt-3 text-sm font-medium text-[var(--muted)]">
              {application.applicationKind === "TEAM" ? "팀 지원" : "개인 지원"}
              <span aria-hidden="true" className="mx-2">·</span>
              지원일 <time dateTime={application.createdAt.toISOString()}>{dateOnly.format(application.createdAt)}</time>
            </p>
          </div>
          <StatusBadge tone="info">교수 검토 중</StatusBadge>
        </div>
        <ReviewProgress status={application.status} />

        <div className="mt-7 flex gap-4 rounded-lg border border-[color-mix(in_srgb,var(--primary)_22%,var(--line))] bg-[var(--primary-subtle)] px-5 py-5">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 size-7 shrink-0 fill-none stroke-[var(--primary)] stroke-[1.8]">
            <path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 12h6M9 16h4" />
          </svg>
          <div>
            <p className="font-extrabold">현재 교수님이 지원 내용을 검토하고 있어요.</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">결정이 등록되면 이 페이지와 알림에서 바로 확인할 수 있습니다.</p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-lg bg-[var(--surface-subtle)] px-4 py-3 text-sm">
          <span aria-hidden="true" className="grid size-6 place-items-center rounded-full border border-[var(--line-strong)] text-xs text-[var(--muted)]">✓</span>
          <span><strong>현재 할 일</strong><span aria-hidden="true"> · </span>교수 검토 결과 기다리기</span>
        </div>
      </div>
      {isPublic ? (
        <div className="flex justify-end border-t border-[var(--line)] px-6 py-4 sm:px-8">
          <Link href={`/topics/${application.topicId}`} className="button-secondary gap-3 text-[var(--primary-hover)]">
            지원한 프로젝트 보기 <span aria-hidden="true">→</span>
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function PastApplicationItem({ application }: { application: TopicApplicationSummary }) {
  const isPublic = isApplicationPublic(application);
  const presentation = statusPresentation[application.status];

  return (
    <li>
      <details className="group">
        <summary className="record-row grid min-h-24 cursor-pointer list-none gap-4 px-5 py-5 marker:content-none sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold tracking-[-0.02em]">{application.topicTitle}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{application.programName} · {application.applicationKind === "TEAM" ? "팀 지원" : "개인 지원"}</p>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
            <time className="min-w-24 text-sm font-medium text-[var(--muted)]" dateTime={(application.decidedAt ?? application.createdAt).toISOString()}>{dateOnly.format(application.decidedAt ?? application.createdAt)}</time>
          </div>
          <span aria-hidden="true" className="text-xl text-[var(--primary)] transition-transform duration-[var(--snap-duration)] group-open:rotate-180">⌄</span>
        </summary>
        <div className="border-t border-[var(--line)] bg-[var(--surface-subtle)] px-5 py-5 sm:px-6">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-[var(--muted)]">지원일</dt><dd className="mt-1 font-bold"><time dateTime={application.createdAt.toISOString()}>{dateOnly.format(application.createdAt)}</time></dd></div>
            {application.decidedAt ? <div><dt className="text-[var(--muted)]">결정일</dt><dd className="mt-1 font-bold"><time dateTime={application.decidedAt.toISOString()}>{dateOnly.format(application.decidedAt)}</time></dd></div> : null}
          </dl>
          {application.applicationKind === "TEAM" ? <p className="mt-4 text-sm leading-6 text-[var(--muted)]">함께 지원 · {application.teamMembers.map(({ name }) => name).join(", ")}</p> : null}
          {application.reviewComment ? (
            <div className="mt-5 border-l-2 border-[var(--primary)] bg-white px-4 py-3">
              <p className="text-sm font-extrabold text-[var(--primary-hover)]">교수 검토 의견</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{application.reviewComment}</p>
            </div>
          ) : null}
          {isPublic ? <Link href={`/topics/${application.topicId}`} className="button-quiet mt-4 text-[var(--primary-hover)]">프로젝트 보기 →</Link> : null}
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
      <section aria-labelledby="application-list-title" className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)]">
        <h2 id="application-list-title" className="sr-only">지원 내역</h2>
        <EmptyState
          title="접수된 지원서가 없습니다"
          description={hasDrafts ? "팀원 전원이 수락하면 이곳에 실제 지원으로 표시됩니다." : "진행 중 프로젝트를 비교하고 개인 또는 팀으로 지원해 보세요."}
          action={<Link href="/topics" className="button-primary">프로젝트 둘러보기</Link>}
        />
      </section>
    );
  }

  return (
    <div className="space-y-10">
      <section aria-labelledby="current-applications-title">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 id="current-applications-title" className="text-2xl font-black tracking-[-0.03em]">현재 진행 중인 지원 {currentApplications.length}건</h2>
          <span className="hidden text-sm font-medium text-[var(--muted)] sm:inline">상태는 이 페이지에서 계속 업데이트됩니다.</span>
        </div>
        {currentApplications.length > 0 ? (
          <div className="space-y-5">{currentApplications.map((application) => <CurrentApplicationCard key={application.id} application={application} />)}</div>
        ) : (
          <div className="rounded-[var(--radius-panel)] border border-dashed border-[var(--line-strong)] px-6 py-8 text-center">
            <p className="font-bold">현재 검토 중인 지원은 없습니다.</p>
            <p className="mt-2 text-sm text-[var(--muted)]">새 프로젝트를 찾거나 지난 지원 결과를 확인해 보세요.</p>
          </div>
        )}
      </section>

      {pastApplications.length > 0 ? (
        <section aria-labelledby="past-applications-title">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="past-applications-title" className="text-2xl font-black tracking-[-0.03em]">지난 지원 {pastApplications.length}건</h2>
            <span className="text-sm font-semibold text-[var(--primary-hover)]">항목을 눌러 상세 보기</span>
          </div>
          <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)]">
            {pastApplications.map((application) => <PastApplicationItem key={application.id} application={application} />)}
          </ul>
        </section>
      ) : null}

      {page.totalPages > 1 ? (
        <nav aria-label="지원 이력 페이지" className="flex items-center justify-between">
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
