import Link from "next/link";

import type { TopicApplicationPage } from "@/modules/topic-application/application/topic-application-ports";

export function ApplicationSummary({ applications }: { applications: TopicApplicationPage }) {
  return (
    <section aria-labelledby="application-summary-title" className="border border-[var(--line)] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">지원 기록</p>
          <h2 id="application-summary-title" className="mt-2 text-xl font-extrabold">진행 중인 지원</h2>
        </div>
        <Link href="/topics/applications" className="button-quiet inline-flex items-center gap-2">
          전체 이력
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 10h12m-4-4 4 4-4 4" />
          </svg>
        </Link>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-stretch"><dl className="grid grid-cols-2 divide-x divide-y divide-[var(--line)] border-y border-[var(--line)] sm:grid-cols-4 sm:divide-y-0"><div className="px-4 py-5"><dt className="muted text-xs">지원 완료</dt><dd className="mt-1 text-2xl font-black">{applications.total}건</dd></div><div className="px-4 py-5"><dt className="muted text-xs">검토 중</dt><dd className="mt-1 text-2xl font-black">{applications.counts.PENDING}건</dd></div><div className="px-4 py-5"><dt className="muted text-xs">선정</dt><dd className="mt-1 text-2xl font-black text-[var(--success)]">{applications.counts.ACCEPTED}건</dd></div><div className="px-4 py-5"><dt className="muted text-xs">미선정</dt><dd className="mt-1 text-2xl font-black text-[var(--muted)]">{applications.counts.REJECTED}건</dd></div></dl><div className="flex items-center justify-between gap-4 bg-[var(--accent-subtle)] px-5 py-4"><p className="text-sm font-bold leading-6 text-[var(--accent-hover)]">관심 있는 주제를<br />지금 바로 찾아보세요.</p><Link href="#project-results" className="button-primary shrink-0">둘러보기</Link></div></div>
    </section>
  );
}
