import Link from "next/link";
import { redirect } from "next/navigation";

import { RecruitmentApplyForm, RecruitmentDecisionForm, RecruitmentPostForm } from "@/app/recruitments/recruitment-forms";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { RecruitmentService } from "@/modules/recruitment/application/manage-recruitment";
import { PrismaRecruitmentRepository } from "@/modules/recruitment/infrastructure/prisma-recruitment-repository";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, StatusBadge } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { TranslatedText } from "@/shared/ui/translated-text";

const koreanDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });
const historyStatus = {
  PENDING: { label: "검토 중", tone: "warning" },
  ACCEPTED: { label: "수락", tone: "success" },
  REJECTED: { label: "거절", tone: "danger" },
} as const;

export default async function RecruitmentsPage({ searchParams }: { searchParams: Promise<{ page?: SearchParamValue; historyPage?: SearchParamValue }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/");
  const params = await searchParams;
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const requestedHistoryPage = Number(firstSearchParam(params.historyPage) ?? "1");
  const data = await new RecruitmentService(
    new PrismaRecruitmentRepository(prisma),
    new PrismaTopicApplicationRepository(prisma),
  ).list(actor, requestedPage, requestedHistoryPage);
  const pageHref = (page: number, historyPage: number) => {
    const query = new URLSearchParams();
    if (page > 1) query.set("page", String(page));
    if (historyPage > 1) query.set("historyPage", String(historyPage));
    const suffix = query.size ? `?${query.toString()}` : "";
    return `/recruitments${suffix}`;
  };

  return <AppShell role={actor.role} userName="부산대학교" currentPath="/recruitments">
    <main className="content-shell space-y-10">
      <PageHeader eyebrow="Team formation" title="팀원 모집" description="구성 중인 프로젝트 팀의 필요한 역할과 활동 조건을 확인하고 함께할 학생을 찾으세요." />
      <RecruitmentPostForm teams={data.formingTeams} />
      {data.posts.length === 0 ? <EmptyState title="열린 모집 글이 없습니다" description="구성 중인 팀원이 모집 글을 등록하면 이곳에 표시됩니다." /> : <>
        <ol className="border-b border-[var(--line)]">{data.posts.map((post) => <li key={post.id} className="border-t border-[var(--line)] py-9">
          <div className="flex flex-wrap items-center gap-3"><StatusBadge>{post.teamName} · {post.memberCount}/{post.capacity}명</StatusBadge><span className="muted text-sm">{post.topicTitle} · {post.authorName}</span></div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.035em]">{post.title}</h2>
          <TranslatedText text={post.content} className="muted mt-3 max-w-3xl leading-7" />
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="muted text-xs">필요 기술</dt><dd>{post.requiredSkills.join(", ")}</dd></div><div><dt className="muted text-xs">필요 역할</dt><dd>{post.roleNeeded}</dd></div><div><dt className="muted text-xs">활동 시간</dt><dd>{post.availability}</dd></div></dl>
          {post.authorId !== actor.id && post.canApply && !post.ownApplication ? <RecruitmentApplyForm postId={post.id} /> : post.ownApplication ? <p className="mt-4 text-sm font-semibold">지원 상태 · {post.ownApplication.status}</p> : null}
          {post.authorId === actor.id && post.receivedApplications.length ? <ul className="mt-6 divide-y divide-[var(--line)] border-t border-[var(--line)]">{post.receivedApplications.map((application) => <li key={application.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]">
            <div><p className="font-semibold">{application.studentName} · {application.skills.join(", ")}</p><p className="muted text-sm">{application.desiredRole} · {application.availability}</p><TranslatedText text={application.message} className="mt-2 text-sm" /></div>
            {application.status === "PENDING" ? <div className="flex gap-2"><RecruitmentDecisionForm applicationId={application.id} decision="ACCEPT" /><RecruitmentDecisionForm applicationId={application.id} decision="REJECT" /></div> : <StatusBadge>{application.status}</StatusBadge>}
          </li>)}</ul> : null}
        </li>)}</ol>
        <nav aria-label="모집 글 페이지" className="flex items-center justify-between"><span className="muted text-sm">{data.page} / {data.totalPages} 페이지 · 총 {data.total}개</span><div className="flex gap-2">{data.page > 1 ? <Link className="button-quiet" href={pageHref(data.page - 1, data.historyPage)}>이전</Link> : null}{data.page < data.totalPages ? <Link className="button-quiet" href={pageHref(data.page + 1, data.historyPage)}>다음</Link> : null}</div></nav>
      </>}
      <section aria-labelledby="application-history-title" className="space-y-5 border-t border-[var(--line)] pt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="eyebrow">My applications</p><h2 id="application-history-title" className="mt-1 text-2xl font-bold">내 모집 지원 이력</h2></div>
          <span className="muted text-sm">총 {data.historyTotal}개</span>
        </div>
        {data.applicationHistory.length === 0 ? <EmptyState title="모집 지원 이력이 없습니다" description="팀원 모집 글에 지원하면 마감 이후에도 처리 결과가 이곳에 남습니다." /> : <>
          <ol className="border-b border-[var(--line)]">{data.applicationHistory.map((application) => <li key={application.id} className="grid gap-4 border-t border-[var(--line)] py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><p className="font-bold">{application.postTitle}</p><p className="muted mt-1 text-sm">{application.topicTitle} · {application.teamName} · 모집자 {application.recruiterName}</p><p className="muted mt-2 text-xs">{koreanDate.format(application.createdAt)} 지원{application.decidedAt ? ` · ${koreanDate.format(application.decidedAt)} 처리` : ""}</p></div><StatusBadge tone={historyStatus[application.status].tone}>{historyStatus[application.status].label}</StatusBadge></li>)}</ol>
          {data.historyTotalPages > 1 ? <nav aria-label="모집 지원 이력 페이지" className="flex items-center justify-between"><span className="muted text-sm">{data.historyPage} / {data.historyTotalPages} 페이지</span><div className="flex gap-2">{data.historyPage > 1 ? <Link className="button-quiet" href={pageHref(data.page, data.historyPage - 1)}>최근 이력</Link> : null}{data.historyPage < data.historyTotalPages ? <Link className="button-quiet" href={pageHref(data.page, data.historyPage + 1)}>이전 이력</Link> : null}</div></nav> : null}
        </>}
      </section>
    </main>
  </AppShell>;
}
