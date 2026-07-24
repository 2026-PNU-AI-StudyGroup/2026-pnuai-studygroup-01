import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RecruitmentPageIntro, RecruitmentPagination, RecruitmentSectionLayout } from "@/app/recruitments/_components/recruitment-section-layout";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { RecruitmentService } from "@/modules/recruitment/application/manage-recruitment";
import { PrismaRecruitmentRepository } from "@/modules/recruitment/infrastructure/prisma-recruitment-repository";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export const metadata: Metadata = { title: "보낸 지원" };

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
        <RecruitmentSectionLayout currentPath="/recruitments/applications">
          <div className="space-y-8">
            <RecruitmentPageIntro
              label="내 모집 · 지원"
              title="보낸 지원"
              description="팀원 모집에 보낸 지원과 처리 결과를 시간순으로 확인합니다. 검토가 끝난 지원도 지우지 않고 활동 기록으로 남깁니다."
              action={<Link className="button-secondary" href="/recruitments">모집 글 탐색</Link>}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--ink)]">지원 기록</h2>
              <p className="muted text-sm">전체 {data.total}개</p>
            </div>

            {data.applications.length === 0 ? (
              <EmptyState title="보낸 지원이 없습니다" description="함께하고 싶은 팀의 모집 글에서 지원서를 보내면 처리 상태가 이곳에 남습니다." action={<Link className="button-primary" href="/recruitments">모집 글 찾아보기</Link>} />
            ) : (
              <ol className="border-y border-[var(--line)]">
                {data.applications.map((application) => (
                  <li key={application.id} className="grid gap-5 border-b border-[var(--line)] py-6 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0 border-l-2 border-[var(--line)] pl-5">
                      <p className="text-sm font-extrabold text-[var(--primary)]">{application.teamName}</p>
                      <h3 className="mt-1 text-xl font-black tracking-[-0.025em] text-[var(--ink)]">{application.postTitle}</h3>
                      <p className="muted mt-2 text-sm">{application.topicTitle} · 모집자 {application.recruiterName}</p>
                      <p className="muted mt-3 text-xs">{koreanDate.format(application.createdAt)} 지원{application.decidedAt ? ` · ${koreanDate.format(application.decidedAt)} 처리` : ""}</p>
                    </div>
                    <StatusBadge tone={statusPresentation[application.status].tone}>{statusPresentation[application.status].label}</StatusBadge>
                  </li>
                ))}
              </ol>
            )}
            <RecruitmentPagination page={data.page} totalPages={data.totalPages} total={data.total} href={pageHref} />
          </div>
        </RecruitmentSectionLayout>
      </main>
    </AppShell>
  );
}
