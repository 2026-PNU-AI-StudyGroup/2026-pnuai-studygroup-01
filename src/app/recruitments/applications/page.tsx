import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { StudentTeamRecruitmentQueryService } from "@/modules/student-team/application/manage-student-team-recruitment";
import { PrismaStudentTeamRecruitmentQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository";
import {
  StudentTeamPageIntro,
  StudentTeamPagination,
  StudentTeamSectionLayout,
} from "@/modules/student-team/ui/student-team-section-layout";
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
  const data = await new StudentTeamRecruitmentQueryService(
    new PrismaStudentTeamRecruitmentQueryRepository(prisma),
  ).listApplicationHistory(actor, requestedPage);
  const pageHref = (page: number) => page > 1 ? `/recruitments/applications?page=${page}` : "/recruitments/applications";

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/recruitments/applications">
      <main className="pb-28 lg:min-h-screen lg:pb-0">
        <StudentTeamSectionLayout currentPath="/recruitments/applications">
          <div className="space-y-8">
            <StudentTeamPageIntro
              title="보낸 지원"
              description="지원한 역할과 팀의 검토 결과를 시간순으로 확인합니다."
              meta={<span>지원 기록 {data.total}개</span>}
              action={<Link className="button-secondary" href="/recruitments">모집 글 탐색</Link>}
            />

            {data.applications.length === 0 ? (
              <EmptyState title="보낸 지원이 없습니다" description="열린 포지션에서 내 경험과 맞는 역할을 찾아보세요." action={<Link className="button-primary" href="/recruitments">모집 둘러보기</Link>} />
            ) : (
              <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white">
                <div className="hidden grid-cols-[minmax(0,1fr)_10rem_8rem] items-center gap-6 border-b border-[var(--line)] bg-[var(--surface-subtle)] px-6 py-3 text-xs font-bold text-[var(--muted)] lg:grid">
                  <span>지원한 모집</span>
                  <span>지원일</span>
                  <span className="text-right">상태</span>
                </div>
                <ol>
                  {data.applications.map((application) => (
                    <li key={application.id} className="grid gap-4 border-b border-[var(--line)] px-6 py-5 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_10rem_8rem] lg:items-center lg:gap-6">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--primary)]">{application.teamName}</p>
                        <h3 className="mt-1 truncate text-lg font-black tracking-[-0.02em] text-[var(--ink)]">{application.postTitle}</h3>
                        <p className="mt-1 truncate text-sm text-[var(--muted)]">{application.topicTitle} · {application.recruiterName}</p>
                      </div>
                      <p className="text-sm text-[var(--muted)]">
                        {koreanDate.format(application.createdAt)}
                        {application.decidedAt ? <span className="mt-1 block text-xs">{koreanDate.format(application.decidedAt)} 처리</span> : null}
                      </p>
                      <div className="lg:text-right"><StatusBadge tone={statusPresentation[application.status].tone}>{statusPresentation[application.status].label}</StatusBadge></div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <StudentTeamPagination page={data.page} totalPages={data.totalPages} total={data.total} href={pageHref} />
          </div>
        </StudentTeamSectionLayout>
      </main>
    </AppShell>
  );
}
