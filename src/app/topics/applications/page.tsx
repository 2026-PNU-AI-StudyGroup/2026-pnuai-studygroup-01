import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListOwnTopicApplicationsService } from "@/modules/topic-application/application/list-own-topic-applications";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, StatusBadge } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export const metadata: Metadata = { title: "내 프로젝트 지원 이력" };

const dateTime = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });
const status = {
  PENDING: { label: "검토 중", tone: "info" },
  ACCEPTED: { label: "선정", tone: "success" },
  REJECTED: { label: "미선정", tone: "neutral" },
} as const;

export default async function TopicApplicationsPage({ searchParams }: { searchParams: Promise<{ page?: SearchParamValue }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/topics");
  const params = await searchParams;
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const result = await new ListOwnTopicApplicationsService(new PrismaTopicApplicationRepository(prisma)).execute(actor, requestedPage, 20);

  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/topics/applications"><main className="content-shell space-y-10">
    <PageHeader eyebrow="프로젝트 탐색" title="내 지원 이력" description="지원한 프로젝트와 검토 결과를 시간순으로 확인합니다." actions={<Link href="/topics" className="button-secondary">프로젝트 탐색으로</Link>} />
    <dl className="grid grid-cols-2 divide-x divide-y divide-[var(--line)] border-y border-[var(--line)] sm:grid-cols-4 sm:divide-y-0"><div className="px-4 py-5"><dt className="muted text-xs">전체 지원</dt><dd className="mt-1 text-2xl font-black">{result.total}건</dd></div><div className="px-4 py-5"><dt className="muted text-xs">검토 중</dt><dd className="mt-1 text-2xl font-black">{result.counts.PENDING}건</dd></div><div className="px-4 py-5"><dt className="muted text-xs">선정</dt><dd className="mt-1 text-2xl font-black text-[var(--success)]">{result.counts.ACCEPTED}건</dd></div><div className="px-4 py-5"><dt className="muted text-xs">미선정</dt><dd className="mt-1 text-2xl font-black text-[var(--muted)]">{result.counts.REJECTED}건</dd></div></dl>
    <section aria-labelledby="application-list-title"><h2 id="application-list-title" className="text-xl font-extrabold">지원 목록</h2>{!result.items.length ? <div className="mt-5"><EmptyState title="아직 지원 이력이 없습니다" description="진행 중 프로젝트를 비교하고 관심 있는 주제에 지원해 보세요." action={<Link href="/topics" className="button-primary">프로젝트 둘러보기</Link>} /></div> : <ul className="mt-5 divide-y divide-[var(--line)] border-y border-[var(--line)]">{result.items.map((application) => { const isPublic = application.topicStatus === "PUBLISHED" && application.programStatus === "OPEN"; return <li key={application.id} className="grid gap-4 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><StatusBadge tone={status[application.status].tone}>{status[application.status].label}</StatusBadge><span className="muted text-xs">{application.programName}</span>{!isPublic ? <StatusBadge>공개 종료</StatusBadge> : null}</div>{isPublic ? <Link href={`/topics/${application.topicId}`} className="mt-3 block text-lg font-extrabold hover:text-[var(--primary)]">{application.topicTitle}</Link> : <p className="mt-3 text-lg font-extrabold">{application.topicTitle}</p>}<p className="muted mt-2 text-sm">희망 역할 · {application.desiredRole}</p></div><dl className="text-sm sm:text-right"><div><dt className="muted inline text-xs">지원일 </dt><dd className="inline font-semibold"><time dateTime={application.createdAt.toISOString()}>{dateTime.format(application.createdAt)}</time></dd></div>{application.decidedAt ? <div className="mt-1"><dt className="muted inline text-xs">결정일 </dt><dd className="inline font-semibold"><time dateTime={application.decidedAt.toISOString()}>{dateTime.format(application.decidedAt)}</time></dd></div> : null}</dl></li>; })}</ul>}</section>
    {result.totalPages > 1 ? <nav aria-label="지원 이력 페이지" className="flex items-center justify-between"><span className="muted text-sm">{result.page} / {result.totalPages} 페이지</span><div className="flex gap-2">{result.page > 1 ? <Link href={`/topics/applications?page=${result.page - 1}`} className="button-quiet">이전</Link> : null}{result.page < result.totalPages ? <Link href={`/topics/applications?page=${result.page + 1}`} className="button-quiet">다음</Link> : null}</div></nav> : null}
  </main></AppShell>;
}
