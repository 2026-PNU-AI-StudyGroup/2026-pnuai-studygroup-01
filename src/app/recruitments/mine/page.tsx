import Link from "next/link";
import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RecruitmentPostForm } from "@/app/recruitments/_components/recruitment-post-form";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { StudentTeamRecruitmentQueryService } from "@/modules/student-team/application/manage-student-team-recruitment";
import { PrismaStudentTeamRecruitmentQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository";
import {
  StudentTeamPageIntro,
  StudentTeamPagination,
  StudentTeamSectionLayout,
} from "@/modules/student-team/ui/student-team-section-layout";
import { TeamModal } from "@/modules/student-team/ui/team-modal";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("내 모집");
}

export default async function MyRecruitmentPostsPage({ searchParams }: { searchParams: Promise<{ page?: SearchParamValue; modal?: SearchParamValue; teamId?: SearchParamValue }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/topics");
  const params = await searchParams;
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const service = new StudentTeamRecruitmentQueryService(
    new PrismaStudentTeamRecruitmentQueryRepository(prisma),
  );
  const [data, leaderTeams] = await Promise.all([
    service.listAuthoredPosts(actor, requestedPage),
    service.listLeaderTeams(actor),
  ]);
  const modal = firstSearchParam(params.modal);
  const selectedTeamId = firstSearchParam(params.teamId);
  const pageHref = (page: number) => page > 1 ? `/recruitments/mine?page=${page}` : "/recruitments/mine";

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/recruitments/mine">
      <main className="pb-28 lg:min-h-screen lg:pb-0">
        <StudentTeamSectionLayout currentPath="/recruitments/mine">
          <div className="space-y-5">
            <StudentTeamPageIntro
              title="내 모집"
              description="열어 둔 역할의 충원 상태와 검토할 지원자를 관리합니다."
              meta={<span><UiText>{"등록한 모집"}</UiText>{" "}{data.total}<UiText>{"개"}</UiText></span>}
              action={<Link className="button-primary" href="/recruitments/mine?modal=new"><UiText>{"새 모집"}</UiText></Link>}
            />

            {data.posts.length === 0 ? (
              <EmptyState title="등록한 모집이 없습니다" description="팀에 필요한 역할과 협업 조건을 정리해 모집을 시작하세요." action={<Link className="button-primary" href="/recruitments/mine?modal=new"><UiText>{"새 모집"}</UiText></Link>} />
            ) : (
              <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white">
                <div className="hidden grid-cols-[minmax(0,1fr)_6.5rem_7rem_8.5rem] items-center gap-6 border-b border-[var(--line)] bg-[var(--surface-subtle)] px-6 py-3 text-xs font-semibold text-[var(--muted)] lg:grid">
                  <span><UiText>{"모집"}</UiText></span>
                  <span><UiText>{"팀 구성"}</UiText></span>
                  <span><UiText>{"지원 현황"}</UiText></span>
                  <span className="text-right"><UiText>{"관리"}</UiText></span>
                </div>
                <ol>
                {data.posts.map((post) => (
                  <li key={post.id} className="grid gap-5 border-b border-[var(--line)] px-6 py-5 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_6.5rem_7rem_8.5rem] lg:items-center lg:gap-6">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={post.status === "OPEN" ? "success" : undefined}><UiText>{post.status === "OPEN" ? "모집 중" : "모집 종료"}</UiText></StatusBadge>
                        <span className="text-xs font-semibold text-[var(--muted)]"><UiDate value={post.createdAt} mode="date" /></span>
                      </div>
                      <h3 className="mt-2 truncate text-lg font-bold tracking-[-0.02em] text-[var(--ink)]"><UiText>{post.title}</UiText></h3>
                      <p className="mt-1 truncate text-sm text-[var(--muted)]"><UiText>{post.topicTitle}</UiText> · {post.teamName}</p>
                    </div>
                    <p className="text-sm font-semibold text-[var(--ink)]"><span className="mr-2 text-xs font-semibold text-[var(--muted)] lg:hidden"><UiText>{"팀 구성"}</UiText></span>{post.memberCount}/{post.capacity}<UiText>{"명"}</UiText></p>
                    <div className="text-sm">
                      <p className={post.pendingApplicationCount ? "font-bold text-[var(--primary)]" : "font-semibold text-[var(--ink)]"}>
                        <span className="mr-2 text-xs font-semibold text-[var(--muted)] lg:hidden"><UiText>{"지원"}</UiText></span>{post.applicationCount}<UiText>{"명"}</UiText></p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]"><UiText>{"검토 대기"}</UiText>{" "}{post.pendingApplicationCount}<UiText>{"명"}</UiText></p>
                    </div>
                    <Link className={post.pendingApplicationCount ? "button-primary" : "button-secondary"} href={`/recruitments/${post.id}/applications`}>
                      <UiText>{post.pendingApplicationCount ? `${post.pendingApplicationCount}명 검토` : "지원자 보기"}</UiText>
                    </Link>
                  </li>
                ))}
                </ol>
              </div>
            )}
            <StudentTeamPagination page={data.page} totalPages={data.totalPages} total={data.total} href={pageHref} />
          </div>
          {modal === "new" ? (
            <TeamModal
              title="새 모집"
              description="팀에 필요한 역할과 협업 조건을 작성합니다."
              closeHref="/recruitments/mine"
              size="wide"
            >
              {leaderTeams.length ? (
                <RecruitmentPostForm
                  teams={leaderTeams}
                  selectedTeamId={selectedTeamId}
                  successHref="/recruitments/mine"
                  surface="embedded"
                />
              ) : (
                <EmptyState
                  variant="embedded"
                  title="팀장으로 관리 중인 팀이 없습니다"
                  description="팀 관리에서 내 팀을 만든 뒤 필요한 역할을 공개 모집할 수 있습니다."
                  action={<Link className="button-primary" href="/teams?modal=create"><UiText>{"팀 만들기"}</UiText></Link>}
                />
              )}
            </TeamModal>
          ) : null}
        </StudentTeamSectionLayout>
      </main>
    </AppShell>
  );
}
