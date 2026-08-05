import Link from "next/link";
import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
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

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("보낸 지원");
}
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
          <div className="space-y-5">
            <StudentTeamPageIntro
              title="보낸 지원"
              description="지원한 역할과 팀의 검토 결과를 시간순으로 확인합니다."
              meta={<span><UiText>{"지원 기록"}</UiText>{" "}{data.total}<UiText>{"개"}</UiText></span>}
              action={data.applications.length ? <Link className="button-secondary" href="/recruitments"><UiText>{"모집 글 탐색"}</UiText></Link> : undefined}
            />

            {data.applications.length === 0 ? (
              <EmptyState title="보낸 지원이 없습니다" description="열린 포지션에서 내 경험과 맞는 역할을 찾아보세요." action={<Link className="button-primary" href="/recruitments"><UiText>{"모집 둘러보기"}</UiText></Link>} />
            ) : (
              <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white">
                <div className="hidden grid-cols-[minmax(0,1fr)_10rem_8rem] items-center gap-6 border-b border-[var(--line)] bg-[var(--surface-subtle)] px-6 py-3 text-xs font-semibold text-[var(--muted)] lg:grid">
                  <span><UiText>{"지원한 모집"}</UiText></span>
                  <span><UiText>{"지원일"}</UiText></span>
                  <span className="text-right"><UiText>{"상태"}</UiText></span>
                </div>
                <ol>
                  {data.applications.map((application) => (
                    <li key={application.id} className="grid gap-4 border-b border-[var(--line)] px-6 py-5 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_10rem_8rem] lg:items-center lg:gap-6">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--primary)]">{application.teamName}</p>
                        <h3 className="mt-1 truncate text-lg font-bold tracking-[-0.02em] text-[var(--ink)]"><UiText>{application.postTitle}</UiText></h3>
                        <p className="mt-1 truncate text-sm text-[var(--muted)]"><UiText>{application.topicTitle}</UiText> · {application.recruiterName}</p>
                      </div>
                      <p className="text-sm text-[var(--muted)]">
                        <UiDate value={application.createdAt} mode="date" />
                        {application.decidedAt ? <span className="mt-1 block text-xs"><UiDate value={application.decidedAt} mode="date" /> {" "}<UiText>{"처리"}</UiText></span> : null}
                      </p>
                      <div className="lg:text-right"><StatusBadge tone={statusPresentation[application.status].tone}><UiText>{statusPresentation[application.status].label}</UiText></StatusBadge></div>
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
