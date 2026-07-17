import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RecruitmentSectionLayout } from "@/app/recruitments/recruitment-section-layout";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { RecruitmentService } from "@/modules/recruitment/application/manage-recruitment";
import { PrismaRecruitmentRepository } from "@/modules/recruitment/infrastructure/prisma-recruitment-repository";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, StatusBadge } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export const metadata: Metadata = { title: "내 모집 지원 이력" };

const koreanDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });
const statusPresentation = {
  PENDING: { label: "검토 중", tone: "info" },
  ACCEPTED: { label: "수락", tone: "success" },
  REJECTED: { label: "거절", tone: "danger" },
} as const;

export default async function RecruitmentApplicationsPage({ searchParams }: { searchParams: Promise<{ page?: SearchParamValue }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/topics");
  const params = await searchParams;
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const data = await new RecruitmentService(
    new PrismaRecruitmentRepository(prisma),
    new PrismaTopicApplicationRepository(prisma),
  ).listApplicationHistory(actor, requestedPage);
  const pageHref = (page: number) => page > 1 ? `/recruitments/applications?page=${page}` : "/recruitments/applications";

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/recruitments/applications">
      <main className="content-shell">
        <RecruitmentSectionLayout currentPath="/recruitments/applications"><div className="space-y-10">
          <PageHeader eyebrow="지원 내역" title="내 모집 지원 이력" description="모집 글에 보낸 지원과 처리 결과를 마감 이후에도 확인합니다." actions={<Link className="button-secondary" href="/recruitments">모집 글 탐색</Link>} />
          <section aria-labelledby="application-list-title" className="space-y-5">
            <div className="flex items-end justify-between gap-4 border-b border-[var(--line)] pb-4"><h2 id="application-list-title" className="text-lg font-bold">지원 목록</h2><span className="muted text-sm">총 {data.total}개</span></div>
            {data.applications.length === 0 ? <EmptyState title="모집 지원 이력이 없습니다" description="팀원 모집 글에 지원하면 처리 상태와 결과가 이곳에 남습니다." action={<Link className="button-primary" href="/recruitments">모집 글 찾아보기</Link>} /> : <>
              <ol className="border-b border-[var(--line)]">{data.applications.map((application) => <li key={application.id} className="grid gap-4 border-t border-[var(--line)] py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><p className="font-bold">{application.postTitle}</p><p className="muted mt-1 text-sm">{application.topicTitle} · {application.teamName} · 모집자 {application.recruiterName}</p><p className="muted mt-2 text-xs">{koreanDate.format(application.createdAt)} 지원{application.decidedAt ? ` · ${koreanDate.format(application.decidedAt)} 처리` : ""}</p></div><StatusBadge tone={statusPresentation[application.status].tone}>{statusPresentation[application.status].label}</StatusBadge></li>)}</ol>
              {data.totalPages > 1 ? <nav aria-label="모집 지원 이력 페이지" className="flex items-center justify-between gap-4"><span className="muted text-sm">{data.page} / {data.totalPages} 페이지</span><div className="flex gap-2">{data.page > 1 ? <Link className="button-quiet" href={pageHref(data.page - 1)}>이전</Link> : null}{data.page < data.totalPages ? <Link className="button-quiet" href={pageHref(data.page + 1)}>다음</Link> : null}</div></nav> : null}
            </>}
          </section>
        </div></RecruitmentSectionLayout>
      </main>
    </AppShell>
  );
}
