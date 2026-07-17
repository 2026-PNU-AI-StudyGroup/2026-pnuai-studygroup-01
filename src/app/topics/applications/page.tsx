import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListOwnTopicApplicationsService } from "@/modules/topic-application/application/list-own-topic-applications";
import { TeamApplicationInvitationService } from "@/modules/topic-application/application/manage-team-application-invitations";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { CancelTeamApplicationDraftForm, TeamInvitationResponseForm } from "@/app/topics/applications/team-invitation-controls";
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
  const repository = new PrismaTopicApplicationRepository(prisma);
  const [result, teamApplications] = await Promise.all([
    new ListOwnTopicApplicationsService(repository).execute(actor, requestedPage, 20),
    new TeamApplicationInvitationService(repository).list(actor),
  ]);

  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/topics/applications"><main className="content-shell space-y-10">
    <PageHeader eyebrow="프로젝트 탐색" title="내 지원 이력" description="지원한 프로젝트와 검토 결과를 시간순으로 확인합니다." actions={<Link href="/topics" className="button-secondary">프로젝트 탐색으로</Link>} />
    {teamApplications.received.length ? <section aria-labelledby="received-team-invitations"><div className="flex items-end justify-between border-b border-[var(--line)] pb-4"><div><p className="eyebrow">팀 지원</p><h2 id="received-team-invitations" className="mt-1 text-xl font-extrabold">받은 팀원 초대</h2></div><span className="muted text-sm">{teamApplications.received.length}건</span></div><ul className="divide-y divide-[var(--line)]">{teamApplications.received.map((invitation) => <li key={invitation.id} className="grid gap-5 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><StatusBadge tone={invitation.status === "PENDING" ? "info" : invitation.status === "ACCEPTED" ? "success" : "danger"}>{invitation.status === "PENDING" ? "응답 대기" : invitation.status === "ACCEPTED" ? "참여 수락" : "거절"}</StatusBadge><span className="muted text-xs">{dateTime.format(invitation.createdAt)}</span></div><h3 className="mt-3 text-lg font-extrabold">{invitation.topicTitle}</h3><p className="muted mt-1 text-sm">초대한 학생 · {invitation.leaderName} ({invitation.leaderEmail})</p></div>{invitation.status === "PENDING" ? <TeamInvitationResponseForm invitationId={invitation.id} /> : null}</li>)}</ul></section> : null}
    {teamApplications.drafts.length ? <section aria-labelledby="team-application-drafts"><div className="flex items-end justify-between border-b border-[var(--line)] pb-4"><div><p className="eyebrow">전원 수락 전</p><h2 id="team-application-drafts" className="mt-1 text-xl font-extrabold">준비 중인 팀 지원</h2></div><span className="muted text-sm">{teamApplications.drafts.length}건</span></div><ul className="divide-y divide-[var(--line)]">{teamApplications.drafts.map((draft) => <li key={draft.id} className="grid gap-5 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><h3 className="text-lg font-extrabold">{draft.topicTitle}</h3><p className="muted mt-1 text-sm">{dateTime.format(draft.createdAt)} 초대</p><ul aria-label="팀원 초대 상태" className="mt-3 flex flex-wrap gap-2">{draft.invitations.map((invitation) => <li key={invitation.email}><StatusBadge tone={invitation.status === "ACCEPTED" ? "success" : invitation.status === "DECLINED" ? "danger" : "neutral"}>{invitation.email} · {invitation.status === "ACCEPTED" ? "수락" : invitation.status === "DECLINED" ? "거절" : "대기"}</StatusBadge></li>)}</ul></div><CancelTeamApplicationDraftForm draftId={draft.id} /></li>)}</ul></section> : null}
    <dl className="grid grid-cols-2 divide-x divide-y divide-[var(--line)] border-y border-[var(--line)] sm:grid-cols-4 sm:divide-y-0"><div className="px-4 py-5"><dt className="muted text-xs">전체 지원</dt><dd className="mt-1 text-2xl font-black">{result.total}건</dd></div><div className="px-4 py-5"><dt className="muted text-xs">검토 중</dt><dd className="mt-1 text-2xl font-black">{result.counts.PENDING}건</dd></div><div className="px-4 py-5"><dt className="muted text-xs">선정</dt><dd className="mt-1 text-2xl font-black text-[var(--success)]">{result.counts.ACCEPTED}건</dd></div><div className="px-4 py-5"><dt className="muted text-xs">미선정</dt><dd className="mt-1 text-2xl font-black text-[var(--muted)]">{result.counts.REJECTED}건</dd></div></dl>
    <section aria-labelledby="application-list-title"><h2 id="application-list-title" className="text-xl font-extrabold">교수에게 접수된 지원</h2>{!result.items.length ? <div className="mt-5"><EmptyState title="접수된 지원서가 없습니다" description={teamApplications.drafts.length ? "팀원 전원이 수락하면 이곳에 실제 지원으로 표시됩니다." : "진행 중 프로젝트를 비교하고 개인 또는 팀으로 지원해 보세요."} action={<Link href="/topics" className="button-primary">프로젝트 둘러보기</Link>} /></div> : <ul className="mt-5 divide-y divide-[var(--line)] border-y border-[var(--line)]">{result.items.map((application) => { const isPublic = application.topicStatus === "PUBLISHED" && application.programStatus === "OPEN"; return <li key={application.id} className="grid gap-4 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><StatusBadge tone={status[application.status].tone}>{status[application.status].label}</StatusBadge><StatusBadge>{application.applicationKind === "TEAM" ? "팀 지원" : "개인 지원"}</StatusBadge><span className="muted text-xs">{application.programName}</span>{!isPublic ? <StatusBadge>공개 종료</StatusBadge> : null}</div>{isPublic ? <Link href={`/topics/${application.topicId}`} className="mt-3 block text-lg font-extrabold hover:text-[var(--primary)]">{application.topicTitle}</Link> : <p className="mt-3 text-lg font-extrabold">{application.topicTitle}</p>}{application.applicationKind === "TEAM" ? <p className="muted mt-2 text-sm">함께 지원 · {application.teamMembers.map(({ name }) => name).join(", ")}</p> : null}</div><dl className="text-sm sm:text-right"><div><dt className="muted inline text-xs">지원일 </dt><dd className="inline font-semibold"><time dateTime={application.createdAt.toISOString()}>{dateTime.format(application.createdAt)}</time></dd></div>{application.decidedAt ? <div className="mt-1"><dt className="muted inline text-xs">결정일 </dt><dd className="inline font-semibold"><time dateTime={application.decidedAt.toISOString()}>{dateTime.format(application.decidedAt)}</time></dd></div> : null}</dl></li>; })}</ul>}</section>
    {result.totalPages > 1 ? <nav aria-label="지원 이력 페이지" className="flex items-center justify-between"><span className="muted text-sm">{result.page} / {result.totalPages} 페이지</span><div className="flex gap-2">{result.page > 1 ? <Link href={`/topics/applications?page=${result.page - 1}`} className="button-quiet">이전</Link> : null}{result.page < result.totalPages ? <Link href={`/topics/applications?page=${result.page + 1}`} className="button-quiet">다음</Link> : null}</div></nav> : null}
  </main></AppShell>;
}
